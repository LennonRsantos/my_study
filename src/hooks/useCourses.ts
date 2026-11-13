import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ItemStatus } from "@/lib/planner";

export interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  completed: boolean;
  /** Pending / in progress / completed; a DB trigger keeps it in step with `completed`. */
  status: ItemStatus;
  completedAt: string | null;
  subjectIds: string[];
  targetHours: number;
}

/** The user's courses with their linked subjects. Mutations live in the caller, which calls `refresh` after them. */
export function useCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data: coursesData } = await supabase.from("courses").select("*").eq("user_id", user.id).order("created_at");
    const { data: linksData } = await supabase.from("course_subjects").select("*");
    const links = linksData || [];
    setCourses((coursesData || []).map((c: any) => ({
      id: c.id, name: c.name, description: c.description || "", color: c.color,
      completed: c.completed, completedAt: c.completed_at,
      status: c.status === "pending" || c.status === "completed" ? c.status : c.completed ? "completed" : "in_progress",
      targetHours: Number(c.target_hours) || 0,
      subjectIds: links.filter((l: any) => l.course_id === c.id).map((l: any) => l.subject_id),
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { courses, loading, refresh };
}
