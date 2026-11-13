import { supabase } from "@/integrations/supabase/client";
import { Subject, StudySession, DailyGoal, Goal, FrozenDay, PracticeSession, PracticeType } from "./types";

function getUserId(): string {
  const session = supabase.auth.getSession;
  // We'll pass userId explicitly to avoid async issues
  throw new Error("Use parameterized functions");
}

// Subjects
export async function getSubjects(): Promise<Subject[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from("subjects").select("*").eq("user_id", user.id).order("created_at");
  if (error) throw error;
  return (data || []).map((r: any) => ({ id: r.id, name: r.name, color: r.color, icon: r.icon || undefined }));
}

export async function saveSubject(subject: Subject): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("subjects").upsert({
    id: subject.id,
    name: subject.name,
    color: subject.color,
    icon: subject.icon || null,
    user_id: user.id,
  });
  if (error) throw error;
}

export async function deleteSubjectDb(id: string): Promise<void> {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}

// Sessions
export async function getSessions(): Promise<StudySession[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from("study_sessions").select("*").eq("user_id", user.id).order("created_at");
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    subjectId: r.subject_id,
    courseId: r.course_id || null,
    stepId: r.step_id || null,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    hours: Number(r.hours),
    notes: r.notes || "",
  }));
}

export async function saveSession(session: StudySession): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("study_sessions").upsert({
    id: session.id,
    subject_id: session.subjectId,
    course_id: session.courseId || null,
    step_id: session.stepId,
    date: session.date,
    start_time: session.startTime,
    end_time: session.endTime,
    hours: session.hours,
    notes: session.notes,
    user_id: user.id,
  });
  if (error) throw error;
}

export async function deleteSessionDb(id: string): Promise<void> {
  const { error } = await supabase.from("study_sessions").delete().eq("id", id);
  if (error) throw error;
}

// Daily Goal
export const DEFAULT_GOAL: DailyGoal = { hoursPerDay: 4, dailyLimitHours: null, maxBlockMinutes: 90, availableDays: null };

export async function getGoal(): Promise<DailyGoal> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_GOAL;
  const { data, error } = await supabase.from("daily_goals").select("*").eq("user_id", user.id).limit(1).maybeSingle();
  if (error || !data) return DEFAULT_GOAL;
  return {
    hoursPerDay: Number(data.hours_per_day),
    dailyLimitHours: data.plan_daily_limit_hours == null ? null : Number(data.plan_daily_limit_hours),
    maxBlockMinutes: data.plan_max_block_minutes ?? DEFAULT_GOAL.maxBlockMinutes,
    availableDays: data.plan_days?.length ? data.plan_days : null,
  };
}

export async function saveGoal(goal: DailyGoal): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const row = {
    hours_per_day: goal.hoursPerDay,
    plan_daily_limit_hours: goal.dailyLimitHours,
    plan_max_block_minutes: goal.maxBlockMinutes,
    plan_days: goal.availableDays?.length ? goal.availableDays : null,
  };
  const { data } = await supabase.from("daily_goals").select("id").eq("user_id", user.id).limit(1).maybeSingle();
  const { error } = data
    ? await supabase.from("daily_goals").update(row).eq("id", data.id)
    : await supabase.from("daily_goals").insert({ ...row, user_id: user.id });
  if (error) throw error;
}

// Goals
export async function getGoals(): Promise<Goal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from("goals").select("*").eq("user_id", user.id).order("created_at");
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description || "",
    targetHours: Number(r.target_hours),
    subjectId: r.subject_id || null,
    period: r.period,
    reward: r.reward || "",
    startDate: r.start_date,
    endDate: r.end_date,
    completed: r.completed,
    completedAt: r.completed_at || null,
  }));
}

export async function saveGoalDb(goal: Goal): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("goals").upsert({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    target_hours: goal.targetHours,
    subject_id: goal.subjectId,
    period: goal.period,
    reward: goal.reward,
    start_date: goal.startDate,
    end_date: goal.endDate,
    completed: goal.completed,
    completed_at: goal.completedAt,
    user_id: user.id,
  });
  if (error) throw error;
}

export async function deleteGoalDb(id: string): Promise<void> {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}

// Frozen Days
export async function getFrozenDays(): Promise<FrozenDay[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from("frozen_days").select("*").eq("user_id", user.id).order("frozen_date");
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    frozenDate: r.frozen_date,
    reason: r.reason,
    compensationDate: r.compensation_date,
    compensationHours: Number(r.compensation_hours),
    compensated: r.compensated,
    compensatedAt: r.compensated_at,
  }));
}

export async function saveFrozenDay(day: FrozenDay): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("frozen_days").upsert({
    id: day.id,
    user_id: user.id,
    frozen_date: day.frozenDate,
    reason: day.reason,
    compensation_date: day.compensationDate,
    compensation_hours: day.compensationHours,
    compensated: day.compensated,
    compensated_at: day.compensatedAt,
  });
  if (error) throw error;
}

export async function deleteFrozenDayDb(id: string): Promise<void> {
  const { error } = await supabase.from("frozen_days").delete().eq("id", id);
  if (error) throw error;
}


// Practice Sessions
export async function getPracticeSessions(): Promise<PracticeSession[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await (supabase as any)
    .from("practice_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at");
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    practiceType: (r.practice_type || "exercise") as PracticeType,
    subjectId: r.subject_id || null,
    courseId: r.course_id || null,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    hours: Number(r.hours),
    notes: r.notes || "",
  }));
}

export async function savePracticeSession(p: PracticeSession): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await (supabase as any).from("practice_sessions").upsert({
    id: p.id,
    user_id: user.id,
    practice_type: p.practiceType,
    subject_id: p.subjectId,
    course_id: p.courseId,
    date: p.date,
    start_time: p.startTime,
    end_time: p.endTime,
    hours: p.hours,
    notes: p.notes,
  });
  if (error) throw error;
}

export async function deletePracticeSessionDb(id: string): Promise<void> {
  const { error } = await (supabase as any).from("practice_sessions").delete().eq("id", id);
  if (error) throw error;
}


export function calcHoursFromTimes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}
