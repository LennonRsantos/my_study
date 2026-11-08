import { useCallback, useEffect, useMemo, useState } from "react";
import { startOfWeek, subDays } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStudy } from "@/contexts/StudyContext";
import { useCourseInsights, PACE_DAYS } from "./useCourseInsights";
import { useLanguages } from "./useLanguages";
import { buildFrozenSet, toDayKey } from "@/lib/streak";
import {
  doneMinutes,
  type PlanBlock,
  type PlanItem,
  type PlanKind,
  type PlanPriority,
  type PlanSettings,
} from "@/lib/planner";

export interface PlannerItem extends PlanItem {
  id: string;
  /** Editable course workload (courses.target_hours); undefined when module durations define the total. */
  workloadHours?: number;
}

export interface StoredBlock {
  id: string;
  kind: PlanKind;
  itemKey: string;
  date: string;
  minutes: number;
  label: string | null;
  status: BlockStatus;
  blockType: BlockType;
  moduleId: string | null;
  reviewStep: number | null;
}

export type BlockStatus = "planned" | "missed" | "done";
export type BlockType = "study" | "review";

interface SettingsRow {
  id: string;
  plan_deadline: string | null;
  plan_weekly_hours: number | null;
  plan_days: number[] | null;
  plan_priority: number;
}

interface BlockRow {
  id: string;
  course_id: string | null;
  language_id: string | null;
  date: string;
  planned_minutes: number;
  label: string | null;
  status: string;
  block_type: string;
  module_id: string | null;
  review_step: number | null;
}

interface LoadedData {
  courseSettings: Record<string, SettingsRow>;
  languageSettings: Record<string, SettingsRow>;
  langSessions: { language_id: string; date: string; hours: number }[];
  blocks: StoredBlock[];
}

const PAGE = 1000;

function byId(rows: SettingsRow[]): Record<string, SettingsRow> {
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}

function toSettings(r: SettingsRow | undefined): PlanSettings {
  return {
    deadline: r?.plan_deadline ?? null,
    weeklyHours: r?.plan_weekly_hours == null ? null : Number(r.plan_weekly_hours),
    days: r?.plan_days?.length ? r.plan_days : null,
    priority: (r?.plan_priority ?? 1) as PlanPriority,
  };
}

function toStoredBlock(r: BlockRow): StoredBlock {
  const kind: PlanKind = r.course_id ? "course" : "language";
  const id = (r.course_id ?? r.language_id) as string;
  return {
    id: r.id, kind, itemKey: `${kind}:${id}`, date: r.date, minutes: r.planned_minutes, label: r.label,
    status: r.status as BlockStatus, blockType: r.block_type as BlockType, moduleId: r.module_id, reviewStep: r.review_step,
  };
}

// PostgREST caps each response at 1000 rows; page through all language sessions.
async function fetchLanguageSessions(userId: string): Promise<LoadedData["langSessions"] | null> {
  const out: LoadedData["langSessions"] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("language_sessions")
      .select("language_id, date, hours")
      .eq("user_id", userId)
      .order("date")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) return null;
    out.push(...(data ?? []).map((r) => ({ language_id: r.language_id, date: r.date, hours: Number(r.hours) })));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export function usePlanner() {
  const { user } = useAuth();
  const { sessions, practiceSessions, frozenDays, goal, setGoal } = useStudy();
  const { active, loading: coursesLoading, refresh: refreshCourses } = useCourseInsights();
  const { languages, loading: languagesLoading } = useLanguages();
  const [data, setData] = useState<LoadedData | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const weekStart = toDayKey(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [c, l, b, ls] = await Promise.all([
      supabase.from("courses").select("id, plan_deadline, plan_weekly_hours, plan_days, plan_priority"),
      supabase.from("languages").select("id, plan_deadline, plan_weekly_hours, plan_days, plan_priority"),
      // This week onward, plus pending reviews of any date so overdue ones still show.
      supabase
        .from("plan_blocks")
        .select("*")
        .or(`date.gte.${weekStart},and(block_type.eq.review,status.eq.planned)`)
        .order("date"),
      fetchLanguageSessions(user.id),
    ]);
    if (c.error || l.error || b.error || !ls) {
      toast.error("Não foi possível carregar o planejador.");
      return;
    }
    setData({
      courseSettings: byId(c.data ?? []),
      languageSettings: byId(l.data ?? []),
      langSessions: ls,
      blocks: (b.data ?? []).map(toStoredBlock),
    });
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const model = useMemo(() => {
    if (!data) return null;
    const today = new Date();
    const paceStart = toDayKey(subDays(today, PACE_DAYS - 1));

    const langTotals = new Map<string, number>();
    const langPace = new Map<string, number>();
    for (const s of data.langSessions) {
      langTotals.set(s.language_id, (langTotals.get(s.language_id) ?? 0) + s.hours);
      if (s.date >= paceStart) langPace.set(s.language_id, (langPace.get(s.language_id) ?? 0) + s.hours);
    }

    const courseItems: PlannerItem[] = active.map((i) => ({
      id: i.course.id,
      key: `course:${i.course.id}`,
      kind: "course",
      name: i.course.name,
      color: i.course.color,
      ...toSettings(data.courseSettings[i.course.id]),
      // Unknown total (no target, no module durations) stays null.
      remainingHours: i.totalHours > 0 ? Math.max(0, i.totalHours - i.dedicatedHours) : null,
      paceHours: i.pacePerWeek,
      workloadHours: i.source === "modules" ? undefined : i.course.targetHours,
      modules: i.source === "modules"
        ? i.modules
            .filter((m) => !m.completed && (m.duration_minutes ?? 0) > 0)
            .map((m) => ({ name: m.name, minutes: m.duration_minutes as number }))
        : undefined,
    }));

    const languageItems: PlannerItem[] = languages.map((l) => ({
      id: l.id,
      key: `language:${l.id}`,
      kind: "language",
      name: l.name,
      color: l.color,
      ...toSettings(data.languageSettings[l.id]),
      // target_hours 0 means no goal: remaining unknown.
      remainingHours: l.target_hours > 0 ? Math.max(0, l.target_hours - (langTotals.get(l.id) ?? 0)) : null,
      paceHours: (langPace.get(l.id) ?? 0) / (PACE_DAYS / 7),
    }));

    // "Feito" = time in sessions linked to the item. Derived, never stored.
    const done = doneMinutes([
      ...[...sessions, ...practiceSessions]
        .filter((e) => e.courseId)
        .map((e) => ({ key: `course:${e.courseId}`, date: e.date, hours: e.hours })),
      ...data.langSessions.map((s) => ({ key: `language:${s.language_id}`, date: s.date, hours: s.hours })),
    ]);

    return {
      courseItems,
      languageItems,
      done,
      frozen: buildFrozenSet(frozenDays),
      blocks: data.blocks,
      courseBudget: goal.dailyLimitHours ?? goal.hoursPerDay,
      // Pending reviews take their minutes from the day before the planner splits it.
      reserved: data.blocks
        .filter((b) => b.blockType === "review" && b.status === "planned")
        .reduce((m, b) => m.set(b.date, (m.get(b.date) ?? 0) + b.minutes), new Map<string, number>()),
    };
  }, [data, active, languages, sessions, practiceSessions, frozenDays, goal]);

  // totalHours: course workload; undefined leaves courses.target_hours untouched.
  const saveSettings = async (kind: PlanKind, id: string, s: PlanSettings, totalHours?: number): Promise<boolean> => {
    const patch = {
      ...(kind === "course" && totalHours !== undefined ? { target_hours: totalHours } : {}),
      plan_deadline: s.deadline,
      plan_weekly_hours: s.weeklyHours && s.weeklyHours > 0 ? s.weeklyHours : null,
      plan_days: s.days?.length ? s.days : null,
      plan_priority: s.priority,
    };
    const { error } = kind === "course"
      ? await supabase.from("courses").update(patch).eq("id", id)
      : await supabase.from("languages").update(patch).eq("id", id);
    if (error) {
      toast.error("Não foi possível salvar o plano.");
      return false;
    }
    await load();
    if (totalHours !== undefined) await refreshCourses();
    return true;
  };

  const saveLimits = async (dailyLimitHours: number | null, maxBlockMinutes: number): Promise<boolean> => {
    try {
      await setGoal({ ...goal, dailyLimitHours, maxBlockMinutes });
      return true;
    } catch {
      toast.error("Não foi possível salvar os limites.");
      return false;
    }
  };

  const setBlockStatus = async (blockId: string, status: BlockStatus): Promise<boolean> => {
    const { error } = await supabase.from("plan_blocks").update({ status }).eq("id", blockId);
    if (error) {
      toast.error("Não foi possível atualizar a sessão.");
      return false;
    }
    await load();
    return true;
  };

  const rescheduleBlock = async (blockId: string, date: string): Promise<boolean> => {
    const { error } = await supabase.from("plan_blocks").update({ date }).eq("id", blockId);
    if (error) {
      toast.error("Não foi possível reagendar.");
      return false;
    }
    await load();
    return true;
  };

  // Insert new blocks first, then delete the old future ones: a failed insert loses nothing.
  const replaceBlocks = async (kind: PlanKind, drafts: PlanBlock[]): Promise<boolean> => {
    if (!user || !data) return false;
    const todayKey = toDayKey(new Date());
    // Reviews and past history stay; only future study blocks are replaced.
    const oldIds = data.blocks
      .filter((b) => b.kind === kind && b.blockType === "study" && b.status === "planned" && b.date >= todayKey)
      .map((b) => b.id);

    if (drafts.length > 0) {
      const rows = drafts.map((d) => {
        const id = d.itemKey.split(":")[1];
        return {
          user_id: user.id,
          course_id: kind === "course" ? id : null,
          language_id: kind === "language" ? id : null,
          date: d.date,
          planned_minutes: d.minutes,
          label: d.label,
        };
      });
      const { error } = await supabase.from("plan_blocks").insert(rows);
      if (error) {
        toast.error("Não foi possível salvar os blocos.");
        return false;
      }
    }
    if (oldIds.length > 0) {
      const { error } = await supabase.from("plan_blocks").delete().in("id", oldIds);
      if (error) toast.error("Blocos novos salvos, mas os antigos não foram removidos.");
    }
    await load();
    return true;
  };

  return {
    loading: !model || coursesLoading || languagesLoading,
    courseItems: model?.courseItems ?? [],
    languageItems: model?.languageItems ?? [],
    courseBudget: model?.courseBudget ?? 0,
    reserved: model?.reserved ?? new Map<string, number>(),
    maxBlockMinutes: goal.maxBlockMinutes,
    dailyLimitHours: goal.dailyLimitHours,
    goalHours: goal.hoursPerDay,
    saveLimits,
    languageBudget: Infinity, // languages are not capped by the daily goal
    frozen: model?.frozen ?? new Set<string>(),
    blocks: model?.blocks ?? [],
    done: model?.done ?? new Map<string, number>(),
    saveSettings,
    replaceBlocks,
    setBlockStatus,
    rescheduleBlock,
    activeCourses: active,
  };
}
