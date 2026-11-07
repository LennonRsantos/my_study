import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { courseImportRows, type ImportedModule } from "@/lib/courseImport";

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

  /**
   * Creates modules and lessons, or nothing: failed lessons remove the modules again.
   * Modules whose name already exists in the course are skipped, so importing twice keeps progress.
   * Returns how many modules were created, or null on failure.
   */
  const importModules = async (courseId: string, imported: ImportedModule[]) => {
    if (!user) return null;
    const existing = modules.filter((m) => m.course_id === courseId);
    const names = new Set(existing.map((m) => m.name));
    const fresh = imported.filter((m) => !names.has(m.name));
    if (fresh.length === 0) return 0;
    const { moduleRows, lessonRows } = courseImportRows(fresh, courseId, user.id, existing.length);
    const { error } = await supabase.from("course_modules").insert(moduleRows);
    if (error) { toast.error("Erro ao criar os módulos"); return null; }
    const { error: lessonsError } = await supabase.from("course_lessons").insert(lessonRows);
    if (lessonsError) {
      await supabase.from("course_modules").delete().in("id", moduleRows.map((m) => m.id));
      toast.error("Erro ao criar as aulas");
      return null;
    }
    await load();
    return fresh.length;
  };

  const deleteModule = async (id: string) => {
    await supabase.from("course_modules").delete().eq("id", id);
    setModules((p) => p.filter((m) => m.id !== id));
  };

  return { modules, loading, modulesFor, addModule, updateModule, setModuleCompleted, toggleModuleComplete, toggleLesson, importModules, deleteModule, refresh: load };
}
