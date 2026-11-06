import { useStudy } from "@/contexts/StudyContext";
import { useMemo } from "react";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  format, subDays, parseISO, eachDayOfInterval,
} from "date-fns";
import {
  buildFrozenSet, computeStreak, countQualifyingDays,
  hoursInRange, frozenDaysInRange,
} from "@/lib/streak";

export const HEATMAP_WEEKS = 26;

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

    // Heatmap: HEATMAP_WEEKS full weeks (Mon–Sun) ending with the current week.
    // Future days of the current week are null so the grid keeps its shape.
    const heatmapStart = subDays(weekStart, (HEATMAP_WEEKS - 1) * 7);
    const heatmap = eachDayOfInterval({ start: heatmapStart, end: weekEnd }).map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      if (dayStr > todayStr) return null;
      return { day: dayStr, hours: hoursByDay[dayStr] || 0, frozen: frozenSet.has(dayStr) };
    });

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
      heatmap,
      weekStrip,
      streak,
      avgHoursPerDay,
      hoursPrevWeek,
      goalProgress,
      topSubject: subjectRanking[0]?.subject?.name || "—",
    };
  }, [sessions, subjects, goal, frozenDays, practiceSessions]);
}
