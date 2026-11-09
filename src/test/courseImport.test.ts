import { describe, it, expect } from "vitest";
import { courseImportRows, lessonSyncPlan, parseCourseJson } from "@/lib/courseImport";
import { moduleLessonsDone, moduleStats, type CourseLesson, type CourseModule } from "@/hooks/useCourseModules";
import { buildCourseInsights } from "@/hooks/useCourseInsights";
import type { Course } from "@/hooks/useCourses";

const page = (name: string, patch: object = {}) => ({
  name, hash: "x", type: "CONTENT", locked: false, completed: false, mediaDurationInSeconds: 600, thumbnailUrl: "u", ...patch,
});
const json = (modules: unknown[]) => JSON.stringify({ course: { name: null, modules } });

const lesson = (id: string, patch: Partial<CourseLesson> = {}): CourseLesson => ({
  id, module_id: "m", name: id, position: 0, duration_seconds: 600, completed: false, completed_at: null, section: null, ...patch,
});
const mod = (patch: Partial<CourseModule> = {}): CourseModule => ({
  id: "m", course_id: "c", name: "M", description: null, lesson_count: 0, subject_ids: [], position: 0,
  duration_minutes: 20, completed: false, completed_at: null, ...patch,
});
const course: Course = {
  id: "c", name: "C", description: "", color: "#000", completed: false, targetHours: 0, subjectIds: [], completedAt: null,
} as Course;

describe("parseCourseJson", () => {
  it("keeps names, duration and completion, and trims names", () => {
    const result = parseCourseJson(json([{ id: "1", name: " HTML ", pages: [page(" Tags ", { completed: true })] }]));
    expect(result).toEqual({
      ok: true,
      modules: [{ name: "HTML", lessons: [{ name: "Tags", durationSeconds: 600, completed: true, section: null }] }],
    });
  });

  it("drops ads and modules left without lessons", () => {
    const result = parseCourseJson(json([
      { name: "A", pages: [page("a"), page("ad", { type: "ADVERTISEMENT" })] },
      { name: "Só anúncio", pages: [page("ad", { type: "ADVERTISEMENT" })] },
    ]));
    expect(result.ok && result.modules.map((m) => [m.name, m.lessons.length])).toEqual([["A", 1]]);
  });

  it("keeps quizzes as lessons without duration", () => {
    const result = parseCourseJson(json([{ name: "A", pages: [{ name: "Quiz", type: "QUIZ", completed: true }] }]));
    expect(result.ok && result.modules[0].lessons[0]).toEqual({ name: "Quiz", durationSeconds: null, completed: true, section: null });
  });

  it("turns page items into lessons and keeps item-less pages", () => {
    const result = parseCourseJson(json([{ name: "M1", pages: [
      { name: "1.1", items: [{ name: "1.1.1" }, { name: "1.1.2" }] },
      { name: "Quiz", items: [] },
    ] }]));
    expect(result.ok && result.modules[0].lessons.map((l) => [l.name, l.section])).toEqual([["1.1.1", "1.1"], ["1.1.2", "1.1"], ["Quiz", null]]);
  });

  it("accepts modules without wrapper, a bare array, title and lessons", () => {
    const mods = [{ title: "A", lessons: [{ title: "a1" }] }];
    const expected = { ok: true, modules: [{ name: "A", lessons: [{ name: "a1", durationSeconds: null, completed: false, section: null }] }] };
    expect(parseCourseJson(JSON.stringify({ modules: mods }))).toEqual(expected);
    expect(parseCourseJson(JSON.stringify(mods))).toEqual(expected);
  });

  it("rejects invalid input", () => {
    expect(parseCourseJson("nope")).toEqual({ ok: false, error: "O texto não é um JSON válido." });
    expect(parseCourseJson("{}").ok).toBe(false);
    expect(parseCourseJson(json([])).ok).toBe(false);
  });
});

describe("courseImportRows", () => {
  const modules = [
    { name: "A", lessons: [{ name: "a1", durationSeconds: 90, completed: true, section: "S" }, { name: "a2", durationSeconds: null, completed: true, section: null }] },
    { name: "B", lessons: [{ name: "b1", durationSeconds: 600, completed: true, section: null }, { name: "b2", durationSeconds: 600, completed: false, section: null }] },
  ];

  it("links lessons to modules and continues positions", () => {
    const { moduleRows, lessonRows } = courseImportRows(modules, "c", "u", 3);
    expect(moduleRows.map((m) => m.position)).toEqual([3, 4]);
    expect(lessonRows.map((l) => l.section)).toEqual(["S", null, null, null]);
    expect(lessonRows.filter((l) => l.module_id === moduleRows[1].id).map((l) => [l.name, l.position])).toEqual([["b1", 0], ["b2", 1]]);
  });

  it("sums the module and completes it only with every lesson done", () => {
    const { moduleRows } = courseImportRows(modules, "c", "u");
    expect(moduleRows.map((m) => [m.lesson_count, m.duration_minutes, m.completed])).toEqual([[2, 2, true], [2, 20, false]]);
  });

  it("leaves imported progress undated", () => {
    const { moduleRows, lessonRows } = courseImportRows(modules, "c", "u");
    expect([...moduleRows, ...lessonRows].every((r) => !("completed_at" in r))).toBe(true);
  });
});

describe("lessonSyncPlan", () => {
  const row = (id: string, name: string, position: number, completed = false) =>
    ({ id, name, position, duration_seconds: 60, completed, section: null as string | null });
  const imp = (name: string, section: string | null = null) => ({ name, durationSeconds: null, completed: false, section });

  it("swaps old sections for the JSON items, keeping completed lessons at the end", () => {
    const plan = lessonSyncPlan(
      [row("s1", "1.1. Seção", 0), row("s2", "1.2. Seção", 1, true), row("k", "1.1.2", 2)],
      [imp("1.1.1"), imp("1.1.2")],
    );
    expect(plan.deleteIds).toEqual(["s1"]);
    expect(plan.insert.map((l) => [l.name, l.position])).toEqual([["1.1.1", 0]]);
    expect(plan.reposition.map((l) => [l.id, l.position])).toEqual([["k", 1], ["s2", 2]]);
    expect([plan.lessonCount, plan.allDone, plan.changed]).toEqual([3, false, true]);
  });

  it("matches repeated names one row each and reports no change when equal", () => {
    const plan = lessonSyncPlan([row("a", "Quiz", 0), row("b", "Quiz", 1)], [imp("Quiz"), imp("Quiz")]);
    expect(plan.changed).toBe(false);
  });

  it("moves existing lessons into their submodule", () => {
    const plan = lessonSyncPlan([row("a", "1.1.1", 0, true)], [imp("1.1.1", "1.1")]);
    expect(plan.reposition.map((l) => [l.id, l.section, l.completed])).toEqual([["a", "1.1", true]]);
  });
});

describe("lesson progress", () => {
  const partial = mod({ lesson_count: 2, lessons: [lesson("a", { completed: true }), lesson("b")] });

  it("moves the course bar lesson by lesson", () => {
    const stats = moduleStats([partial]);
    expect(stats.doneHours).toBeCloseTo(10 / 60);
    expect(stats.totalHours).toBeCloseTo(20 / 60);
    expect(stats.allDone).toBe(false);
  });

  it("counts a completed module in full and keeps the old rule without lessons", () => {
    expect(moduleStats([mod({ completed: true, lessons: [lesson("a")] })]).doneHours).toBeCloseTo(20 / 60);
    expect(moduleLessonsDone(mod({ completed: true, lesson_count: 7 }))).toBe(7);
    expect(moduleLessonsDone(partial)).toBe(1);
  });

  const insightsOf = (modules: CourseModule[]) =>
    buildCourseInsights([course], () => modules, [], [], new Date("2026-11-06T12:00:00")).courses[0];

  it("counts undated imported progress in totals, not in pace", () => {
    const insight = insightsOf([partial]);
    expect(insight.dedicatedHours).toBeCloseTo(10 / 60);
    expect(insight.lessonsDone).toBe(1);
    expect(insight.events).toEqual([]);
    expect(insight.pacePerWeek).toBe(0);
  });

  it("dates each lesson checked in the app", () => {
    const insight = insightsOf([mod({
      lessons: [lesson("a", { completed: true, completed_at: "2026-11-05T12:00:00" }), lesson("b")],
    })]);
    expect(insight.events).toEqual([{ day: "2026-11-05", hours: 600 / 3600 }]);
    expect(insight.pacePerWeek).toBeGreaterThan(0);
  });

  it("keeps module events when the module has no lessons", () => {
    const insight = insightsOf([mod({ completed: true, completed_at: "2026-11-05T12:00:00" })]);
    expect(insight.events).toEqual([{ day: "2026-11-05", hours: 20 / 60 }]);
  });
});
