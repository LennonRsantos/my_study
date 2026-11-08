import { useStudy } from "@/contexts/StudyContext";
import { useMemo } from "react";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  format, subDays, parseISO, eachDayOfInterval, addDays,
} from "date-fns";
import {
  buildFrozenSet, computeStreak, countQualifyingDays,
  hoursInRange, frozenDaysInRange,
} from "@/lib/streak";

export const HEATMAP_WEEKS = 26;

export type HeatDay = { day: string; hours: number; frozen: boolean } | null;
/** "recent" = last HEATMAP_WEEKS weeks; a number = that calendar year. */
export type HeatmapPeriod = "recent" | number;

/**
 * Full Mon–Sun weeks covering the period. Days outside the period or in the future are null,
 * so the grid keeps its shape.
 */
export function buildHeatmap(
  hoursByDay: Record<string, number>,
  frozenSet: Set<string>,
  period: HeatmapPeriod,
  today: Date,
): { days: HeatDay[]; weeks: number } {
  const todayStr = format(today, "yyyy-MM-dd");
  const from = period === "recent"
    ? subDays(startOfWeek(today, { weekStartsOn: 1 }), (HEATMAP_WEEKS - 1) * 7)
    : new Date(period, 0, 1);
  const to = period === "recent" ? today : new Date(period, 11, 31);
  const fromStr = format(from, "yyyy-MM-dd");
  const toStr = format(to, "yyyy-MM-dd");
  const days = eachDayOfInterval({
    start: startOfWeek(from, { weekStartsOn: 1 }),
    end: endOfWeek(to, { weekStartsOn: 1 }),
  }).map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    if (dayStr < fromStr || dayStr > toStr || dayStr > todayStr) return null;
    return { day: dayStr, hours: hoursByDay[dayStr] || 0, frozen: frozenSet.has(dayStr) };
  });
  return { days, weeks: days.length / 7 };
}

/** Longest run of qualifying days (study or frozen) in the whole history. */
export function longestStreak(hoursByDay: Record<string, number>, frozenSet: Set<string>): number {
  const keys = [...Object.keys(hoursByDay).filter((k) => hoursByDay[k] > 0), ...frozenSet].sort();
  if (keys.length === 0) return 0;
  const qualifies = new Set(keys);
  let best = 0;
  let run = 0;
  for (let d = parseISO(keys[0]); format(d, "yyyy-MM-dd") <= keys[keys.length - 1]; d = addDays(d, 1)) {
    run = qualifies.has(format(d, "yyyy-MM-dd")) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function useStats() {
  const { sessions, subjects, goal, frozenDays, practiceSessions } = useStudy();

  return useMemo(() => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Practice sessions count as study time too — merge for global metrics.
    const practiceAsSessions = practiceSessions.map((p) => ({
      id: p.id,
      subjectId: p.subjectId || "__practice__",
      courseId: p.courseId || null,
      date: p.date,
      startTime: p.startTime,
      endTime: p.endTime,
      hours: p.hours,
      notes: p.notes,
    }));
    const allSessions = [...sessions, ...practiceAsSessions];

    // Single source of truth for "did the user study?" — see src/lib/streak.ts
    const frozenSet = buildFrozenSet(frozenDays);

    const hoursToday = allSessions
      .filter((s) => s.date === todayStr)
      .reduce((a, s) => a + s.hours, 0);

    const hoursWeek = hoursInRange(allSessions, weekStart, weekEnd);
    const hoursMonth = hoursInRange(allSessions, monthStart, monthEnd);
    const hoursTotal = allSessions.filter((s) => s.date <= todayStr).reduce((a, s) => a + s.hours, 0);

    const weekDaysStudied = countQualifyingDays(weekStart, weekEnd, today, allSessions, frozenSet);
    const monthDaysStudied = countQualifyingDays(monthStart, monthEnd, today, allSessions, frozenSet);

    const weekFrozenDays = frozenDaysInRange(frozenDays, weekStart, weekEnd).length;
    const monthFrozenDays = frozenDaysInRange(frozenDays, monthStart, monthEnd).length;

    // Hours by subject (only real subjects, ignore practice-without-subject placeholder)
    const bySubject: Record<string, number> = {};
    allSessions.forEach((s) => {
      if (s.subjectId === "__practice__") return;
      bySubject[s.subjectId] = (bySubject[s.subjectId] || 0) + s.hours;
    });

    const subjectRanking = Object.entries(bySubject)
      .map(([id, hours]) => ({ subject: subjects.find((s) => s.id === id), hours }))
      .filter((x) => x.subject)
      .sort((a, b) => b.hours - a.hours);

    // Hours by weekday
    const weekdayHours = Array(7).fill(0);
    allSessions.forEach((s) => {
      const d = parseISO(s.date);
      weekdayHours[d.getDay()] += s.hours;
    });

    // Hours per day, used by the 30-day chart, the heatmap and the week strip
    const hoursByDay: Record<string, number> = {};
    allSessions.forEach((s) => {
      hoursByDay[s.date] = (hoursByDay[s.date] || 0) + s.hours;
    });

    // Last 30 days evolution
    const last30 = eachDayOfInterval({ start: subDays(today, 29), end: today });
    const dailyEvolution = last30.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      return { date: format(day, "dd/MM"), day: dayStr, hours: hoursByDay[dayStr] || 0 };
    });

    const firstDay = [...Object.keys(hoursByDay), ...frozenSet].filter((d) => d <= todayStr).sort()[0];
    const firstYear = firstDay ? Number(firstDay.slice(0, 4)) : today.getFullYear();

    // Current week, Mon–Sun
    const weekStrip = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const hours = hoursByDay[dayStr] || 0;
      return {
        day: dayStr,
        hours,
        studied: hours > 0,
        frozen: frozenSet.has(dayStr),
        isToday: dayStr === todayStr,
        isFuture: dayStr > todayStr,
      };
    });

    // Streak — same source of truth
    const streak = computeStreak(today, allSessions, frozenSet);

    // Average hours per qualifying day (sessions OR frozen counted as study days).
    const sessionDays = new Set(allSessions.map((s) => s.date));
    frozenSet.forEach((d) => sessionDays.add(d));
    const totalStudyDays = sessionDays.size;
    const avgHoursPerDay = totalStudyDays > 0
      ? allSessions.reduce((a, s) => a + s.hours, 0) / totalStudyDays
      : 0;

    // Week comparison — uses same range/source rules as current week.
    const prevWeekStart = subDays(weekStart, 7);
    const prevWeekEnd = subDays(weekStart, 1);
    const hoursPrevWeek = hoursInRange(allSessions, prevWeekStart, prevWeekEnd);
    const prevWeekDaysStudied = countQualifyingDays(prevWeekStart, prevWeekEnd, today, allSessions, frozenSet);

    const goalProgress = goal.hoursPerDay > 0 ? Math.min((hoursToday / goal.hoursPerDay) * 100, 100) : 0;

    return {
      hoursToday,
      hoursTotal,
      hoursWeek,
      hoursMonth,
      weekDaysStudied,
      monthDaysStudied,
      weekFrozenDays,
      monthFrozenDays,
      prevWeekDaysStudied,
      subjectRanking,
      weekdayHours,
      dailyEvolution,
      hoursByDay,
      frozenSet,
      firstYear,
      longestStreak: longestStreak(hoursByDay, frozenSet),
      weekStrip,
      streak,
      avgHoursPerDay,
      hoursPrevWeek,
      goalProgress,
      topSubject: subjectRanking[0]?.subject?.name || "—",
    };
  }, [sessions, subjects, goal, frozenDays, practiceSessions]);
}
