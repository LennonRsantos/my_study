import { format, subDays, parseISO, isAfter, isBefore, eachDayOfInterval } from "date-fns";
import type { StudySession, FrozenDay } from "./types";

/**
 * Single source of truth for "did the user study on this day?".
 *
 * Rule: a day counts as a study day if EITHER
 *   1. There's at least one StudySession with hours > 0 on that date, OR
 *   2. The date is registered as a FrozenDay.
 *
 * This rule is shared by:
 *   - Dashboard streak counter
 *   - Dashboard week/month "days studied" metrics
 *   - Calendar visual indicators
 *   - Week-over-week comparisons (frozen days preserve continuity)
 *
 * Do NOT reimplement these checks anywhere else — import from here.
 */

export type DayKey = string; // YYYY-MM-DD

export function toDayKey(d: Date): DayKey {
  return format(d, "yyyy-MM-dd");
}

export function buildFrozenSet(frozenDays: FrozenDay[]): Set<DayKey> {
  return new Set(frozenDays.map((f) => f.frozenDate));
}

export function hoursOnDay(sessions: StudySession[], dayKey: DayKey): number {
  return sessions
    .filter((s) => s.date === dayKey)
    .reduce((acc, s) => acc + s.hours, 0);
}

export function dayQualifies(
  date: Date,
  sessions: StudySession[],
  frozenSet: Set<DayKey>,
): boolean {
  const key = toDayKey(date);
  if (frozenSet.has(key)) return true;
  return hoursOnDay(sessions, key) > 0;
}

export function dayIsFrozen(date: Date, frozenSet: Set<DayKey>): boolean {
  return frozenSet.has(toDayKey(date));
}

/**
 * Counts qualifying days in [start, end] up to and including `today`.
 * Does NOT count future days.
 */
export function countQualifyingDays(
  start: Date,
  end: Date,
  today: Date,
  sessions: StudySession[],
  frozenSet: Set<DayKey>,
): number {
  return eachDayOfInterval({ start, end })
    .filter((d) => !isAfter(d, today) && dayQualifies(d, sessions, frozenSet))
    .length;
}

/**
 * Walks back from `today` counting consecutive qualifying days.
 * "Today" doesn't break the streak if the day is still ongoing
 * (no session yet and not frozen) — we just start from yesterday.
 */
export function computeStreak(
  today: Date,
  sessions: StudySession[],
  frozenSet: Set<DayKey>,
): number {
  let streak = 0;
  let cursor = today;
  if (!dayQualifies(cursor, sessions, frozenSet)) {
    cursor = subDays(cursor, 1);
  }
  while (dayQualifies(cursor, sessions, frozenSet)) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export function sessionsInRange(
  sessions: StudySession[],
  start: Date,
  end: Date,
): StudySession[] {
  return sessions.filter((s) => {
    const d = parseISO(s.date);
    return !isBefore(d, start) && !isAfter(d, end);
  });
}

export function hoursInRange(
  sessions: StudySession[],
  start: Date,
  end: Date,
): number {
  return sessionsInRange(sessions, start, end).reduce((a, s) => a + s.hours, 0);
}

export function frozenDaysInRange(
  frozenDays: FrozenDay[],
  start: Date,
  end: Date,
): FrozenDay[] {
  return frozenDays.filter((f) => {
    const d = parseISO(f.frozenDate);
    return !isBefore(d, start) && !isAfter(d, end);
  });
}
