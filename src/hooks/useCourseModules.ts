import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { courseImportRows, lessonSyncPlan, type ImportedModule } from "@/lib/courseImport";

export interface CourseLesson {
  id: string;
  module_id: string;
  name: string;
  position: number;
  duration_seconds: number | null;
  completed: boolean;
  completed_at: string | null;
}

export interface CourseModule {
  id: string;
  course_id: string;
  name: string;
  description: string | null;
  lesson_count: number;
  subject_ids: string[];
  position: number;
  duration_minutes: number | null;
  completed: boolean;
  completed_at: string | null;
  lessons?: CourseLesson[];
}

/** Minutes already done: the whole module once completed, otherwise its checked lessons. */
export function moduleDoneMinutes(m: CourseModule): number {
  if (m.completed) return m.duration_minutes ?? 0;
  return (m.lessons ?? []).filter((l) => l.completed).reduce((a, l) => a + (l.duration_seconds ?? 0), 0) / 60;
}

/** Lessons done: checked lessons when the module has them, otherwise its lesson count once completed. */
export function moduleLessonsDone(m: CourseModule): number {
  if (m.lessons?.length) return m.lessons.filter((l) => l.completed).length;
  return m.completed ? m.lesson_count || 0 : 0;
}

/** Totals used by the course progress bar: completed time over all durations. */
export function moduleStats(modules: CourseModule[]) {
  const withDuration = modules.filter((m) => (m.duration_minutes ?? 0) > 0);
  const totalMinutes = withDuration.reduce((a, m) => a + (m.duration_minutes ?? 0), 0);
  const doneMinutes = withDuration.reduce((a, m) => a + moduleDoneMinutes(m), 0);
  return {
    hasDurations: withDuration.length > 0,
    totalHours: totalMinutes / 60,
    doneHours: doneMinutes / 60,
    doneCount: modules.filter((m) => m.completed).length,
    allDone: modules.length > 0 && modules.every((m) => m.completed),
  };
}

export function useCourseModules() {
  const { user } = useAuth();
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("course_modules")
      .select("*, lessons:course_lessons(*)")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    // Stays loading on failure: an empty list would make courses look module-less and auto-complete by hours
    if (error || !data) {
      toast.error("Erro ao carregar os módulos");
      return;
    }
    setModules((data as unknown as CourseModule[]).map((m) => ({
      ...m,
      lessons: [...(m.lessons ?? [])].sort((a, b) => a.position - b.position),
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const modulesFor = useCallback(
    (courseId: string) => modules.filter((m) => m.course_id === courseId),
    [modules]
  );

  const addModule = async (v: Omit<CourseModule, "id" | "position" | "completed" | "completed_at" | "lessons"> & { position?: number }) => {
    if (!user) return;
    const position = v.position ?? modules.filter((m) => m.course_id === v.course_id).length;
    const { data } = await supabase
      .from("course_modules")
      .insert({ ...v, position, user_id: user.id })
      .select()
      .single();
    if (data) setModules((p) => [...p, data as CourseModule]);
  };

  const updateModule = async (id: string, patch: Partial<Omit<CourseModule, "lessons">>) => {
    const { data } = await supabase.from("course_modules").update(patch).eq("id", id).select().single();
    // Merge: the returned row has no lessons
    if (data) setModules((p) => p.map((m) => (m.id === id ? { ...m, ...(data as CourseModule) } : m)));
  };

  /** Sets a module and all its lessons. Lessons already in the target state keep their date. */
  const setModuleCompleted = async (id: string, completed: boolean) => {
    const completed_at = completed ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("course_lessons")
      .update({ completed, completed_at })
      .eq("module_id", id)
      .eq("completed", !completed);
    if (error) { toast.error("Erro ao atualizar as aulas do módulo"); return; }
    setModules((p) => p.map((m) => (m.id === id
      ? { ...m, lessons: m.lessons?.map((l) => (l.completed === completed ? l : { ...l, completed, completed_at })) }
      : m)));
    await updateModule(id, { completed, completed_at });
  };

  const toggleModuleComplete = async (id: string) => {
    const m = modules.find((x) => x.id === id);
    if (!m) return;
    await setModuleCompleted(id, !m.completed);
  };

  /** Checks a lesson and keeps its module in step: done only while every lesson is done. */
  const toggleLesson = async (moduleId: string, lessonId: string) => {
    const m = modules.find((x) => x.id === moduleId);
    const lesson = m?.lessons?.find((l) => l.id === lessonId);
    if (!m?.lessons || !lesson) return;
    const completed = !lesson.completed;
    const completed_at = completed ? new Date().toISOString() : null;
    const setLesson = (patch: Partial<CourseLesson>) =>
      setModules((p) => p.map((x) => (x.id === moduleId
        ? { ...x, lessons: x.lessons?.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)) }
        : x)));

    setLesson({ completed, completed_at });
    const { error } = await supabase.from("course_lessons").update({ completed, completed_at }).eq("id", lessonId);
    if (error) {
      setLesson({ completed: lesson.completed, completed_at: lesson.completed_at });
      toast.error("Erro ao salvar a aula");
      return;
    }
    const allDone = m.lessons.every((l) => (l.id === lessonId ? completed : l.completed));
    if (allDone !== m.completed) await updateModule(moduleId, { completed: allDone, completed_at: allDone ? completed_at : null });
  };

  /** Syncs an existing module's lessons with the JSON (see lessonSyncPlan). Returns false on failure. */
  const syncModuleLessons = async (m: CourseModule, imported: ImportedModule) => {
    if (!user) return false;
    const plan = lessonSyncPlan(m.lessons ?? [], imported.lessons);
    if (!plan.changed) return true;
    const results = await Promise.all([
      plan.deleteIds.length ? supabase.from("course_lessons").delete().in("id", plan.deleteIds) : null,
      plan.insert.length
        ? supabase.from("course_lessons").insert(plan.insert.map((l) => ({
          user_id: user.id, module_id: m.id, name: l.name, position: l.position, duration_seconds: l.duration_seconds, completed: l.completed,
        })))
        : null,
      ...plan.reposition.map((l) => supabase.from("course_lessons").update({ position: l.position }).eq("id", l.id)),
      supabase.from("course_modules").update({
        lesson_count: plan.lessonCount,
        duration_minutes: plan.durationMinutes,
        completed: plan.allDone,
        completed_at: plan.allDone ? m.completed_at : null,
      }).eq("id", m.id),
    ]);
    return results.every((r) => !r?.error);
  };

  /**
   * Creates new modules with their lessons, or none: failed lessons remove the modules again.
   * Modules whose name already exists in the course get their lessons synced, keeping completed ones.
   * Returns how many modules were created or changed, or null on failure.
   */
  const importModules = async (courseId: string, imported: ImportedModule[]) => {
    if (!user) return null;
    const existing = modules.filter((m) => m.course_id === courseId);
    const byName = new Map(existing.map((m) => [m.name, m]));
    const fresh = imported.filter((m) => !byName.has(m.name));
    const synced = imported.filter((m) => {
      const old = byName.get(m.name);
      return old && lessonSyncPlan(old.lessons ?? [], m.lessons).changed;
    });
    if (fresh.length === 0 && synced.length === 0) return 0;
    if (fresh.length > 0) {
      const { moduleRows, lessonRows } = courseImportRows(fresh, courseId, user.id, existing.length);
      const { error } = await supabase.from("course_modules").insert(moduleRows);
      if (error) { toast.error("Erro ao criar os módulos"); return null; }
      const { error: lessonsError } = await supabase.from("course_lessons").insert(lessonRows);
      if (lessonsError) {
        await supabase.from("course_modules").delete().in("id", moduleRows.map((m) => m.id));
        toast.error("Erro ao criar as aulas");
        return null;
      }
    }
    const syncOk = (await Promise.all(synced.map((m) => syncModuleLessons(byName.get(m.name)!, m)))).every(Boolean);
    await load();
    if (!syncOk) { toast.error("Erro ao atualizar as aulas de alguns módulos"); return null; }
    return fresh.length + synced.length;
  };

  const deleteModule = async (id: string) => {
    await supabase.from("course_modules").delete().eq("id", id);
    setModules((p) => p.filter((m) => m.id !== id));
  };

  return { modules, loading, modulesFor, addModule, updateModule, setModuleCompleted, toggleModuleComplete, toggleLesson, importModules, deleteModule, refresh: load };
}
