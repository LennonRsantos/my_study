import { useStudy } from "@/contexts/StudyContext";
import { useMemo } from "react";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  format, subDays, parseISO, eachDayOfInterval, eachWeekOfInterval,
} from "date-fns";
import { PRACTICE_TYPE_LABELS, PracticeType } from "@/lib/types";

export function usePracticeStats() {
  const { practiceSessions } = useStudy();

  return useMemo(() => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const total = practiceSessions.length;
    const totalHours = practiceSessions.reduce((a, p) => a + p.hours, 0);
    const avgDuration = total > 0 ? totalHours / total : 0;

    const inRange = (dateStr: string, start: Date, end: Date) => {
      const d = parseISO(dateStr);
      return d >= start && d <= end;
    };

    const today_ = practiceSessions.filter((p) => p.date === todayStr);
    const week = practiceSessions.filter((p) => inRange(p.date, weekStart, weekEnd));
    const month = practiceSessions.filter((p) => inRange(p.date, monthStart, monthEnd));

    const hoursToday = today_.reduce((a, p) => a + p.hours, 0);
    const hoursWeek = week.reduce((a, p) => a + p.hours, 0);
    const hoursMonth = month.reduce((a, p) => a + p.hours, 0);

    // Last 30 days daily evolution
    const last30 = eachDayOfInterval({ start: subDays(today, 29), end: today });
    const dailyEvolution = last30.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const hours = practiceSessions.filter((p) => p.date === dayStr).reduce((a, p) => a + p.hours, 0);
      return { date: format(day, "dd/MM"), hours: Math.round(hours * 100) / 100 };
    });

    // Last 12 weeks evolution
    const weeksStart = subDays(today, 7 * 11);
    const weeks = eachWeekOfInterval({ start: weeksStart, end: today }, { weekStartsOn: 1 });
    const weeklyEvolution = weeks.map((wStart) => {
      const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
      const hours = practiceSessions
        .filter((p) => inRange(p.date, wStart, wEnd))
        .reduce((a, p) => a + p.hours, 0);
      return { week: format(wStart, "dd/MM"), hours: Math.round(hours * 100) / 100 };
    });

    // By type
    const byType: Record<string, number> = {};
    practiceSessions.forEach((p) => {
      byType[p.practiceType] = (byType[p.practiceType] || 0) + p.hours;
    });
    const typeBreakdown = Object.entries(byType)
      .map(([type, hours]) => ({
        type: type as PracticeType,
        label: PRACTICE_TYPE_LABELS[type as PracticeType] || type,
        hours: Math.round(hours * 100) / 100,
      }))
      .sort((a, b) => b.hours - a.hours);

    // Recent
    const recent = [...practiceSessions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
      .slice(0, 5);

    return {
      total,
      totalHours,
      avgDuration,
      hoursToday,
      hoursWeek,
      hoursMonth,
      countToday: today_.length,
      countWeek: week.length,
      countMonth: month.length,
      dailyEvolution,
      weeklyEvolution,
      typeBreakdown,
      recent,
    };
  }, [practiceSessions]);
}
