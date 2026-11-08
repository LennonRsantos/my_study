import { addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toDayKey } from "./streak";

/** Days after completion for each spaced review, and the length of each review. */
export const REVIEW_OFFSETS = [3, 7, 21];
export const REVIEW_MINUTES = 15;

export interface ReviewDraft {
  date: string; // YYYY-MM-DD
  minutes: number;
  label: string;
  reviewStep: number; // 1-based
}

export function reviewBlocks(completedAt: Date, name: string): ReviewDraft[] {
  return REVIEW_OFFSETS.map((days, i) => ({
    date: toDayKey(addDays(completedAt, days)),
    minutes: REVIEW_MINUTES,
    label: `Revisão ${i + 1}/${REVIEW_OFFSETS.length} · ${name}`,
    reviewStep: i + 1,
  }));
}

/**
 * Keeps review blocks in step with a module (or a whole course when moduleId is null).
 * Completing schedules the missing steps; reopening removes the pending ones.
 * Reviews already done or missed stay as history. Returns false on a database error.
 */
export async function syncReviews(
  userId: string,
  courseId: string,
  moduleId: string | null,
  name: string,
  completed: boolean,
): Promise<boolean> {
  const target = () => {
    const q = supabase.from("plan_blocks").select("id, review_step, status").eq("block_type", "review").eq("course_id", courseId);
    return moduleId ? q.eq("module_id", moduleId) : q.is("module_id", null);
  };
  const { data, error } = await target();
  if (error) return false;

  const pending = (data ?? []).filter((r) => r.status === "planned").map((r) => r.id);
  if (pending.length > 0) {
    const { error: delError } = await supabase.from("plan_blocks").delete().in("id", pending);
    if (delError) return false;
  }
  if (!completed) return true;

  const kept = new Set((data ?? []).filter((r) => r.status !== "planned").map((r) => r.review_step));
  const rows = reviewBlocks(new Date(), name)
    .filter((r) => !kept.has(r.reviewStep))
    .map((r) => ({
      user_id: userId,
      course_id: courseId,
      module_id: moduleId,
      date: r.date,
      planned_minutes: r.minutes,
      label: r.label,
      block_type: "review",
      review_step: r.reviewStep,
    }));
  if (rows.length === 0) return true;
  const { error: insError } = await supabase.from("plan_blocks").insert(rows);
  return !insError;
}
