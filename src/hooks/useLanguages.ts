import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type LanguageLevel = "beginner" | "intermediate" | "advanced";

export const LANGUAGE_LEVEL_LABELS: Record<LanguageLevel, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

export interface Language {
  id: string;
  name: string;
  color: string;
  level: LanguageLevel;
  target_hours: number;
  start_date: string | null;
  notes: string | null;
}

export interface LangSubject {
  id: string;
  language_id: string;
  name: string;
  color: string;
  icon: string | null;
}

export interface LangCourse {
  id: string;
  language_id: string;
  name: string;
  description: string | null;
  total_hours: number;
  color: string;
  icon: string | null;
  completed: boolean;
  completed_at: string | null;
  subject_ids: string[];
}

export interface LangSession {
  id: string;
  language_id: string;
  subject_id: string | null;
  course_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  notes: string | null;
}

export function useLanguages() {
  const { user } = useAuth();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from("languages").select("*").order("created_at", { ascending: false });
    if (!error && data) setLanguages(data as any);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addLanguage = async (l: Omit<Language, "id">) => {
    if (!user) return;
    const { data, error } = await supabase.from("languages").insert({ ...l, user_id: user.id }).select().single();
    if (!error && data) setLanguages((p) => [data as any, ...p]);
    return data as any as Language | null;
  };
  const updateLanguage = async (id: string, patch: Partial<Language>) => {
    const { data, error } = await supabase.from("languages").update(patch).eq("id", id).select().single();
    if (!error && data) setLanguages((p) => p.map((x) => (x.id === id ? (data as any) : x)));
  };
  const deleteLanguage = async (id: string) => {
    await supabase.from("languages").delete().eq("id", id);
    setLanguages((p) => p.filter((x) => x.id !== id));
  };

  return { languages, loading, addLanguage, updateLanguage, deleteLanguage, refresh: load };
}

export function useLanguageData(languageId: string | undefined) {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<LangSubject[]>([]);
  const [courses, setCourses] = useState<LangCourse[]>([]);
  const [sessions, setSessions] = useState<LangSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !languageId) return;
    const [s, c, se] = await Promise.all([
      supabase.from("language_subjects").select("*").eq("language_id", languageId).order("created_at"),
      supabase.from("language_courses").select("*").eq("language_id", languageId).order("created_at"),
      supabase.from("language_sessions").select("*").eq("language_id", languageId).order("date", { ascending: false }),
    ]);
    if (s.data) setSubjects(s.data as any);
    if (c.data) setCourses(c.data as any);
    if (se.data) setSessions(se.data as any);
    setLoading(false);
  }, [user, languageId]);

  useEffect(() => { load(); }, [load]);

  // Subjects
  const addSubject = async (v: Omit<LangSubject, "id" | "language_id">) => {
    if (!user || !languageId) return;
    const { data } = await supabase.from("language_subjects").insert({ ...v, language_id: languageId, user_id: user.id }).select().single();
    if (data) setSubjects((p) => [...p, data as any]);
  };
  const updateSubject = async (id: string, patch: Partial<LangSubject>) => {
    const { data } = await supabase.from("language_subjects").update(patch).eq("id", id).select().single();
    if (data) setSubjects((p) => p.map((x) => (x.id === id ? (data as any) : x)));
  };
  const deleteSubject = async (id: string) => {
    await supabase.from("language_subjects").delete().eq("id", id);
    setSubjects((p) => p.filter((x) => x.id !== id));
  };

  // Courses
  const addCourse = async (v: Omit<LangCourse, "id" | "language_id" | "completed" | "completed_at">) => {
    if (!user || !languageId) return;
    const { data } = await supabase.from("language_courses").insert({ ...v, language_id: languageId, user_id: user.id }).select().single();
    if (data) setCourses((p) => [...p, data as any]);
  };
  const updateCourse = async (id: string, patch: Partial<LangCourse>) => {
    const { data } = await supabase.from("language_courses").update(patch).eq("id", id).select().single();
    if (data) setCourses((p) => p.map((x) => (x.id === id ? (data as any) : x)));
  };
  const deleteCourse = async (id: string) => {
    await supabase.from("language_courses").delete().eq("id", id);
    setCourses((p) => p.filter((x) => x.id !== id));
  };

  // Sessions
  const addSession = async (v: Omit<LangSession, "id" | "language_id">) => {
    if (!user || !languageId) return;
    const { data } = await supabase.from("language_sessions").insert({ ...v, language_id: languageId, user_id: user.id }).select().single();
    if (data) setSessions((p) => [data as any, ...p]);
  };
  const updateSession = async (id: string, patch: Partial<LangSession>) => {
    const { data } = await supabase.from("language_sessions").update(patch).eq("id", id).select().single();
    if (data) setSessions((p) => p.map((x) => (x.id === id ? (data as any) : x)));
  };
  const deleteSession = async (id: string) => {
    await supabase.from("language_sessions").delete().eq("id", id);
    setSessions((p) => p.filter((x) => x.id !== id));
  };

  const totalHours = sessions.reduce((a, s) => a + Number(s.hours || 0), 0);

  return {
    subjects, courses, sessions, loading, totalHours,
    addSubject, updateSubject, deleteSubject,
    addCourse, updateCourse, deleteCourse,
    addSession, updateSession, deleteSession,
    refresh: load,
  };
}
