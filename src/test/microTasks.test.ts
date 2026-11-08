import { describe, it, expect } from "vitest";
import { microTasks } from "@/lib/microTasks";
import type { CourseInsight } from "@/hooks/useCourseInsights";
import type { CourseModule } from "@/hooks/useCourseModules";

const mod = (over: Partial<CourseModule>): CourseModule => ({
  id: "m", course_id: "c", name: "M", description: null, lesson_count: 0, subject_ids: [],
  position: 0, duration_minutes: 30, completed: false, completed_at: null, ...over,
});

const insight = (modules: CourseModule[]): CourseInsight =>
  ({
    course: { id: "c", name: "JS", subjectIds: ["s1"] },
    modules,
    nextModule: modules.find((m) => !m.completed) ?? null,
  }) as unknown as CourseInsight;

describe("microTasks", () => {
  it("suggests the next short lesson, then a review of the last module, then light tasks", () => {
    const next = mod({
      id: "m2", name: "Funções",
      lessons: [{ id: "l", module_id: "m2", name: "Arrow", position: 0, duration_seconds: 300, completed: false, completed_at: null }],
    });
    const done = mod({ id: "m1", name: "Variáveis", completed: true, completed_at: "2026-11-01T10:00:00" });
    const tasks = microTasks([insight([done, next])]);
    expect(tasks.map((t) => t.text)).toEqual([
      'Assistir à aula curta "Arrow"',
      'Revisar o que estudou em "Variáveis"',
      "Revisar uma anotação do curso",
      "Resolver um exercício simples",
    ]);
    expect(tasks[0].module?.id).toBe("m2");
    expect(tasks[2].subjectIds).toEqual(["s1"]);
  });
});
