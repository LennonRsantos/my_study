import { useCallback, useEffect, useMemo, useState } from "react";
import { startOfWeek, subDays } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStudy } from "@/contexts/StudyContext";
import { useCourseInsights, PACE_DAYS } from "./useCourseInsights";
import { useLanguages } from "./useLanguages";
import { useLearningPaths } from "./useLearningPaths";
import { buildFrozenSet, toDayKey } from "@/lib/streak";
import { buildTree, flattenNode, leafHours, leafSteps } from "@/lib/learningPath";
import { syncReviews } from "@/lib/reviews";
import {
  doneMinutes,
  type ItemStatus,
  type PlanBlock,
  type PlanItem,
  type PlanKind,
  type PlanPriority,
  type PlanSettings,
} from "@/lib/planner";

export interface PlannerItem extends PlanItem {
  id: string;
  /** Status the user set, including completed (completed items are not planned). */
  itemStatus: ItemStatus;
  /** Editable workload (courses.target_hours, learning_paths.estimated_hours); undefined when modules or steps define the total. */
  workloadHours?: number;
  /** Remaining hours if the workload were `totalHours`. Set only when the workload is editable. */
  remainingWith?: (totalHours: number) => number;
  /** Leaf steps of a path, to show the hours per step. */
  stepCount?: number;
}

export interface MonthPlanInput {
  availableDays: number[] | null;
  dailyLimitHours: number | null;
  /** Items of the month: they get the deadline and start if they were pending. */
  picks: { item: PlannerItem; deadline: string; workloadHours?: number }[];
  /** Items left out of the month that had a deadline: it is cleared. */
  dropped: PlannerItem[];
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
  status: string;
}

interface BlockRow {
  id: string;
  course_id: string | null;
  language_id: string | null;
  path_id: string | null;
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
  pathSettings: Record<string, SettingsRow>;
  langSessions: { language_id: string; date: string; hours: number }[];
  blocks: StoredBlock[];
}

const PAGE = 1000;

function byId(rows: SettingsRow[]): Record<string, SettingsRow> {
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}

const TABLE = { course: "courses", language: "languages", path: "learning_paths" } as const;
const SETTINGS_COLUMNS = "id, status, plan_deadline, plan_weekly_hours, plan_days, plan_priority";

type SettingsPatch = Partial<Omit<SettingsRow, "id">>;

// totalHours: the item's workload; undefined leaves it untouched. Languages keep their total in target_hours, set elsewhere.
function updateItem(kind: PlanKind, id: string, patch: SettingsPatch, totalHours?: number) {
  const total = totalHours !== undefined;
  if (kind === "course") return supabase.from("courses").update({ ...patch, ...(total ? { target_hours: totalHours } : {}) }).eq("id", id);
  if (kind === "path") return supabase.from("learning_paths").update({ ...patch, ...(total ? { estimated_hours: totalHours } : {}) }).eq("id", id);
  return supabase.from("languages").update(patch).eq("id", id);
}

const toItemStatus = (r: SettingsRow | undefined): ItemStatus =>
  r?.status === "pending" || r?.status === "completed" ? r.status : "in_progress";

/** Planner-facing fields shared by every kind of item. */
function base(kind: PlanKind, id: string, r: SettingsRow | undefined) {
  const itemStatus = toItemStatus(r);
  return {
    id,
    key: `${kind}:${id}`,
    kind,
    itemStatus,
    status: itemStatus === "pending" ? ("pending" as const) : ("in_progress" as const),
    ...toSettings(r),
  };
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
  const kind: PlanKind = r.course_id ? "course" : r.path_id ? "path" : "language";
  const id = (r.course_id ?? r.path_id ?? r.language_id) as string;
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
  const { courses, active, loading: coursesLoading, refresh: refreshCourses } = useCourseInsights();
  const { languages, loading: languagesLoading, refresh: refreshLanguages } = useLanguages();
  const { paths, loading: pathsLoading, refresh: refreshPaths } = useLearningPaths();
  const [data, setData] = useState<LoadedData | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const weekStart = toDayKey(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [c, l, p, b, ls] = await Promise.all([
      supabase.from("courses").select(SETTINGS_COLUMNS),
      supabase.from("languages").select(SETTINGS_COLUMNS),
      supabase.from("learning_paths").select(SETTINGS_COLUMNS),
      // This week onward, plus pending reviews of any date so overdue ones still show.
      supabase
        .from("plan_blocks")
        .select("*")
        .or(`date.gte.${weekStart},and(block_type.eq.review,status.eq.planned)`)
        .order("date"),
      fetchLanguageSessions(user.id),
    ]);
    const failed = c.error ?? l.error ?? p.error ?? b.error;
    if (failed || !ls) {
      console.error("Planner load failed:", failed?.message ?? "language sessions");
      setError(true);
      toast.error("Não foi possível carregar o planejador.");
      return;
    }
    setError(false);
    setData({
      courseSettings: byId(c.data ?? []),
      languageSettings: byId(l.data ?? []),
      pathSettings: byId(p.data ?? []),
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

    const courseItems: PlannerItem[] = courses.map((i) => ({
      ...base("course", i.course.id, data.courseSettings[i.course.id]),
      name: i.course.name,
      color: i.course.color,
      // Unknown total (no target, no module durations) stays null.
      remainingHours: i.totalHours > 0 ? Math.max(0, i.totalHours - i.dedicatedHours) : null,
      paceHours: i.pacePerWeek,
      workloadHours: i.source === "modules" ? undefined : i.course.targetHours,
      remainingWith: i.source === "modules" ? undefined : (total) => Math.max(0, total - i.dedicatedHours),
      modules: i.source === "modules"
        ? i.modules
            .filter((m) => !m.completed && (m.duration_minutes ?? 0) > 0)
            .map((m) => ({ name: m.name, minutes: m.duration_minutes as number }))
        : undefined,
    }));

    // A path linked to a course is studied through that course: planning both would count it twice.
    const stepPath = new Map<string, string>();
    const pathItems: PlannerItem[] = paths.filter((p) => !p.courseId).map((p) => {
      p.steps.forEach((st) => stepPath.set(st.id, p.id));
      const leaves = leafSteps(p.steps);
      type Leaf = (typeof leaves)[number];
      // Steps with hours define the total; otherwise the path's own total is editable and split over the steps.
      const ownHours = leaves.some((st) => st.estimatedHours > 0);
      const leftOf = (total: number) => {
        const hours = leafHours(leaves, total);
        return (st: Leaf) => Math.max(0, hours(st) - st.actualHours);
      };
      const open = buildTree(p.steps)
        .flatMap(flattenNode)
        .filter((n) => n.children.length === 0 && n.status !== "completed");
      const remainingWith = (total: number) => open.map(leftOf(total)).reduce((a, h) => a + h, 0);
      const hours = leafHours(leaves, p.estimatedHours);
      const left = leftOf(p.estimatedHours);
      return {
        ...base("path", p.id, data.pathSettings[p.id]),
        name: p.name,
        color: "hsl(var(--primary))",
        // Unknown when neither the steps nor the path have an estimate.
        remainingHours: ownHours || p.estimatedHours > 0 ? remainingWith(p.estimatedHours) : null,
        paceHours: leaves
          .filter((st) => st.status === "completed" && st.completedAt && toDayKey(new Date(st.completedAt)) >= paceStart)
          .reduce((a, st) => a + hours(st), 0) / (PACE_DAYS / 7),
        workloadHours: ownHours ? undefined : p.estimatedHours,
        remainingWith: ownHours ? undefined : remainingWith,
        stepCount: leaves.length,
        modules: open.filter((n) => left(n) > 0).map((n) => ({ name: n.name, minutes: Math.round(left(n) * 60) })),
      };
    });

    const languageItems: PlannerItem[] = languages.map((l) => ({
      ...base("language", l.id, data.languageSettings[l.id]),
      name: l.name,
      color: l.color,
      // target_hours 0 means no goal: remaining unknown.
      remainingHours: l.target_hours > 0 ? Math.max(0, l.target_hours - (langTotals.get(l.id) ?? 0)) : null,
      paceHours: (langPace.get(l.id) ?? 0) / (PACE_DAYS / 7),
    }));

    // "Feito" = time in sessions linked to the item. Derived, never stored.
    const done = doneMinutes([
      ...[...sessions, ...practiceSessions]
        .filter((e) => e.courseId)
        .map((e) => ({ key: `course:${e.courseId}`, date: e.date, hours: e.hours })),
      ...sessions
        .filter((e) => e.stepId && stepPath.has(e.stepId))
        .map((e) => ({ key: `path:${stepPath.get(e.stepId!)}`, date: e.date, hours: e.hours })),
      ...data.langSessions.map((s) => ({ key: `language:${s.language_id}`, date: s.date, hours: s.hours })),
    ]);

    return {
      items: [...courseItems, ...pathItems, ...languageItems],
      done,
      frozen: buildFrozenSet(frozenDays),
      blocks: data.blocks,
      budget: goal.dailyLimitHours ?? goal.hoursPerDay,
      // Pending reviews take their minutes from the day before the planner splits it.
      reserved: data.blocks
        .filter((b) => b.blockType === "review" && b.status === "planned")
        .reduce((m, b) => m.set(b.date, (m.get(b.date) ?? 0) + b.minutes), new Map<string, number>()),
    };
  }, [data, courses, paths, languages, sessions, practiceSessions, frozenDays, goal]);

  const saveSettings = async (kind: PlanKind, id: string, s: PlanSettings, totalHours?: number): Promise<boolean> => {
    const { error } = await updateItem(kind, id, {
      plan_deadline: s.deadline,
      plan_weekly_hours: s.weeklyHours && s.weeklyHours > 0 ? s.weeklyHours : null,
      plan_days: s.days?.length ? s.days : null,
      plan_priority: s.priority,
    }, totalHours);
    if (error) {
      toast.error("Não foi possível salvar o plano.");
      return false;
    }
    await load();
    if (totalHours !== undefined) await (kind === "path" ? refreshPaths() : refreshCourses());
    return true;
  };

  /** Pending / in progress / completed. On courses a DB trigger keeps `completed` in step. */
  const setItemStatus = async (item: PlannerItem, status: ItemStatus): Promise<boolean> => {
    const { error } = await supabase.from(TABLE[item.kind]).update({ status }).eq("id", item.id);
    if (error) {
      toast.error("Não foi possível atualizar o status.");
      return false;
    }
    // Same spaced reviews the Courses page schedules when a course is finished or reopened.
    const wasDone = item.itemStatus === "completed";
    if (item.kind === "course" && user && wasDone !== (status === "completed")) {
      if (!(await syncReviews(user.id, item.id, null, item.name, status === "completed"))) {
        toast.error("Não foi possível atualizar as revisões.");
      }
    }
    await load();
    await (item.kind === "course" ? refreshCourses() : item.kind === "path" ? refreshPaths() : refreshLanguages());
    return true;
  };

  const saveAvailability = async (
    availableDays: number[] | null, dailyLimitHours: number | null, maxBlockMinutes: number,
  ): Promise<boolean> => {
    try {
      await setGoal({ ...goal, availableDays, dailyLimitHours, maxBlockMinutes });
      return true;
    } catch {
      toast.error("Não foi possível salvar a disponibilidade.");
      return false;
    }
  };

  const applyMonthPlan = async (m: MonthPlanInput): Promise<boolean> => {
    if (!(await saveAvailability(m.availableDays, m.dailyLimitHours, goal.maxBlockMinutes))) return false;
    const results = await Promise.all([
      ...m.picks.map(({ item, deadline, workloadHours }) =>
        updateItem(item.kind, item.id, {
          plan_deadline: deadline,
          plan_weekly_hours: null, // a weekly goal would win over the deadline
          ...(item.itemStatus === "pending" ? { status: "in_progress" } : {}),
        }, workloadHours)),
      ...m.dropped.map((item) => updateItem(item.kind, item.id, { plan_deadline: null })),
    ]);
    const failed = results.some((r) => r.error);
    if (failed) toast.error("Não foi possível salvar o plano do mês.");
    // Reload even after a failure: some items may have been saved.
    await load();
    await Promise.all([refreshCourses(), refreshPaths()]);
    return !failed;
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
  const replaceBlocks = async (drafts: PlanBlock[]): Promise<boolean> => {
    if (!user || !data) return false;
    const todayKey = toDayKey(new Date());
    // Reviews and past history stay; only future study blocks are replaced.
    const oldIds = data.blocks
      .filter((b) => b.blockType === "study" && b.status === "planned" && b.date >= todayKey)
      .map((b) => b.id);

    if (drafts.length > 0) {
      const rows = drafts.map((d) => {
        const [kind, id] = d.itemKey.split(":");
        return {
          user_id: user.id,
          course_id: kind === "course" ? id : null,
          language_id: kind === "language" ? id : null,
          path_id: kind === "path" ? id : null,
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
    loading: !model || coursesLoading || languagesLoading || pathsLoading,
    error,
    reload: load,
    items: model?.items ?? [],
    budget: model?.budget ?? 0,
    availableDays: goal.availableDays,
    reserved: model?.reserved ?? new Map<string, number>(),
    maxBlockMinutes: goal.maxBlockMinutes,
    dailyLimitHours: goal.dailyLimitHours,
    goalHours: goal.hoursPerDay,
    saveAvailability,
    frozen: model?.frozen ?? new Set<string>(),
    blocks: model?.blocks ?? [],
    done: model?.done ?? new Map<string, number>(),
    saveSettings,
    applyMonthPlan,
    setItemStatus,
    replaceBlocks,
    setBlockStatus,
    rescheduleBlock,
    activeCourses: active,
  };
}
