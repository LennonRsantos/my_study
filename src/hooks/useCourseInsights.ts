import { useMemo } from "react";
import { addDays, eachWeekOfInterval, endOfWeek, format, parseISO, startOfWeek, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStudy } from "@/contexts/StudyContext";
import type { Subject } from "@/lib/types";
import { useCourses, type Course } from "./useCourses";
import { useCourseModules, moduleStats, type CourseModule } from "./useCourseModules";

const PACE_DAYS = 28;
export const COURSE_WEEKS = 12;

interface TimedEntry {
  courseId?: string | null;
  subjectId?: string | null;
  date: string; // YYYY-MM-DD
  hours: number;
}

export interface SubjectShare {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface CourseInsight {
  course: Course;
  modules: CourseModule[];
  /** Where progress comes from: completed modules (when they have durations) or linked sessions. */
  source: "modules" | "sessions";
  dedicatedHours: number;
  /** Module durations sum, or the course's manual load; 0 when unknown. */
  totalHours: number;
  progress: number; // 0..1
  /** Study + practice sessions linked to the course, whatever the source. */
  sessionHours: number;
  modulesDone: number;
  modulesTotal: number;
  lessonsDone: number;
  lessonsTotal: number;
  subjects: SubjectShare[];
  topSubject: SubjectShare | null;
  /** Hours per week over the last 28 days. */
  pacePerWeek: number;
  eta: Date | null;
  lastActivity: string | null; // YYYY-MM-DD
  nextModule: CourseModule | null;
  events: { day: string; hours: number }[];
}

export interface CourseInsights {
  loading: boolean;
  courses: CourseInsight[];
  active: CourseInsight[];
  completed: CourseInsight[];
  totals: { dedicatedHours: number; lessonsDone: number; lessonsTotal: number };
  weekly: { week: string; tooltipLabel: string; hours: number }[];
}

const NO_SUBJECT = "__none__";

function subjectShares(hoursById: Map<string, number>, subjects: Subject[]): SubjectShare[] {
  return [...hoursById.entries()]
    .filter(([, h]) => h > 0)
    .map(([id, value]) => {
      const subject = subjects.find((s) => s.id === id);
      return {
        id,
        label: subject?.name ?? (id === NO_SUBJECT ? "Sem matéria" : "Matéria removida"),
        value,
        color: subject?.color,
      };
    })
    .sort((a, b) => b.value - a.value);
}

/** Pure: everything the dashboard shows about courses, computed from the raw records. */
export function buildCourseInsights(
  courses: Course[],
  modulesFor: (courseId: string) => CourseModule[],
  entries: TimedEntry[],
  subjects: Subject[],
  today = new Date(),
): Omit<CourseInsights, "loading"> {
  const todayStr = format(today, "yyyy-MM-dd");
  const paceStart = format(subDays(today, PACE_DAYS - 1), "yyyy-MM-dd");

  const insights = courses.map((course): CourseInsight => {
    const modules = modulesFor(course.id);
    const stats = moduleStats(modules);
    const courseEntries = entries.filter((e) => e.courseId === course.id && e.date <= todayStr);
    const sessionHours = courseEntries.reduce((a, e) => a + e.hours, 0);
    const source = stats.hasDurations ? "modules" : "sessions";

    const hoursBySubject = new Map<string, number>();
    const add = (id: string, h: number) => hoursBySubject.set(id, (hoursBySubject.get(id) || 0) + h);
    let events: { day: string; hours: number }[];

    if (source === "modules") {
      const done = modules.filter((m) => m.completed && (m.duration_minutes ?? 0) > 0);
      for (const m of done) {
        const hours = (m.duration_minutes ?? 0) / 60;
        // Split a module's time across its subjects; fall back to the course's subjects
        const ids = m.subject_ids?.length ? m.subject_ids : course.subjectIds.length ? course.subjectIds : [NO_SUBJECT];
        ids.forEach((id) => add(id, hours / ids.length));
      }
      events = done
        .filter((m) => m.completed_at)
        .map((m) => ({ day: format(parseISO(m.completed_at!), "yyyy-MM-dd"), hours: (m.duration_minutes ?? 0) / 60 }));
    } else {
      courseEntries.forEach((e) => add(e.subjectId || NO_SUBJECT, e.hours));
      events = courseEntries.map((e) => ({ day: e.date, hours: e.hours }));
    }

    const dedicatedHours = source === "modules" ? stats.doneHours : sessionHours;
    const totalHours = source === "modules" ? stats.totalHours : course.targetHours;
    const pacePerWeek = events.filter((e) => e.day >= paceStart).reduce((a, e) => a + e.hours, 0) / (PACE_DAYS / 7);
    const remaining = totalHours - dedicatedHours;
    const eta = !course.completed && pacePerWeek > 0 && remaining > 0
      ? addDays(today, Math.ceil((remaining / pacePerWeek) * 7))
      : null;
    const activityDays = [...events.map((e) => e.day), ...courseEntries.map((e) => e.date)].sort();
    const shares = subjectShares(hoursBySubject, subjects);

    return {
      course,
      modules,
      source,
      dedicatedHours,
      totalHours,
      progress: totalHours > 0 ? Math.min(dedicatedHours / totalHours, 1) : 0,
      sessionHours,
      modulesDone: stats.doneCount,
      modulesTotal: modules.length,
      lessonsDone: modules.filter((m) => m.completed).reduce((a, m) => a + (m.lesson_count || 0), 0),
      lessonsTotal: modules.reduce((a, m) => a + (m.lesson_count || 0), 0),
      subjects: shares,
      topSubject: shares[0] ?? null,
      pacePerWeek,
      eta,
      lastActivity: activityDays[activityDays.length - 1] ?? null,
      nextModule: modules.find((m) => !m.completed) ?? null,
      events,
    };
  });

  const byRecent = (a: CourseInsight, b: CourseInsight) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "");
  const active = insights.filter((i) => !i.course.completed).sort(byRecent);
  const completed = insights
    .filter((i) => i.course.completed)
    .sort((a, b) => (b.course.completedAt ?? "").localeCompare(a.course.completedAt ?? ""));

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const allEvents = insights.flatMap((i) => i.events);
  const weekly = eachWeekOfInterval(
    { start: subDays(weekStart, (COURSE_WEEKS - 1) * 7), end: today },
    { weekStartsOn: 1 },
  ).map((wStart) => {
    const from = format(wStart, "yyyy-MM-dd");
    const to = format(endOfWeek(wStart, { weekStartsOn: 1 }), "yyyy-MM-dd");
    return {
      week: format(wStart, "dd/MM"),
      tooltipLabel: `Semana de ${format(wStart, "d 'de' MMM", { locale: ptBR })}`,
      hours: allEvents.filter((e) => e.day >= from && e.day <= to).reduce((a, e) => a + e.hours, 0),
    };
  });

  return {
    courses: [...active, ...completed],
    active,
    completed,
    totals: {
      dedicatedHours: insights.reduce((a, i) => a + i.dedicatedHours, 0),
      lessonsDone: insights.reduce((a, i) => a + i.lessonsDone, 0),
      lessonsTotal: insights.reduce((a, i) => a + i.lessonsTotal, 0),
    },
    weekly,
  };
}

export function useCourseInsights(): CourseInsights {
  const { sessions, practiceSessions, subjects } = useStudy();
  const { courses, loading: coursesLoading } = useCourses();
  const { loading: modulesLoading, modulesFor } = useCourseModules();

  return useMemo(() => {
    const entries: TimedEntry[] = [...sessions, ...practiceSessions];
    return {
      loading: coursesLoading || modulesLoading,
      ...buildCourseInsights(courses, modulesFor, entries, subjects),
    };
  }, [courses, modulesFor, sessions, practiceSessions, subjects, coursesLoading, modulesLoading]);
}
