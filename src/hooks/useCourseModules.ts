import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
}

/** Totals used by the course progress bar: completed modules' durations over all durations. */
export function moduleStats(modules: CourseModule[]) {
  const withDuration = modules.filter((m) => (m.duration_minutes ?? 0) > 0);
  const totalMinutes = withDuration.reduce((a, m) => a + (m.duration_minutes ?? 0), 0);
  const doneMinutes = withDuration.filter((m) => m.completed).reduce((a, m) => a + (m.duration_minutes ?? 0), 0);
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
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (!error && data) setModules(data as any);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const modulesFor = useCallback(
    (courseId: string) => modules.filter((m) => m.course_id === courseId),
    [modules]
  );

  const addModule = async (v: Omit<CourseModule, "id" | "position" | "completed" | "completed_at"> & { position?: number }) => {
    if (!user) return;
    const position = v.position ?? modules.filter((m) => m.course_id === v.course_id).length;
    const { data } = await supabase
      .from("course_modules")
      .insert({ ...v, position, user_id: user.id })
      .select()
      .single();
    if (data) setModules((p) => [...p, data as any]);
  };

  const updateModule = async (id: string, patch: Partial<CourseModule>) => {
    const { data } = await supabase.from("course_modules").update(patch).eq("id", id).select().single();
    if (data) setModules((p) => p.map((m) => (m.id === id ? (data as any) : m)));
  };

  const toggleModuleComplete = async (id: string) => {
    const m = modules.find((x) => x.id === id);
    if (!m) return;
    const completed = !m.completed;
    await updateModule(id, { completed, completed_at: completed ? new Date().toISOString() : null });
  };

  const deleteModule = async (id: string) => {
    await supabase.from("course_modules").delete().eq("id", id);
    setModules((p) => p.filter((m) => m.id !== id));
  };

  return { modules, loading, modulesFor, addModule, updateModule, toggleModuleComplete, deleteModule, refresh: load };
}
