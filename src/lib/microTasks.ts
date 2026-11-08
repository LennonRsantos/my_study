import type { SessionModuleRef } from "./sessionNotes";
import type { CourseInsight } from "@/hooks/useCourseInsights";

export interface MicroTask {
  courseId: string;
  courseName: string;
  module: SessionModuleRef | null;
  subjectIds: string[];
  text: string;
}

const SHORT_LESSON_SECONDS = 15 * 60;

/** Small real tasks from the courses in progress: next lesson, a review of the last module, then light generic ones. */
export function microTasks(courses: CourseInsight[]): MicroTask[] {
  const out: MicroTask[] = [];
  for (const { course, nextModule, modules } of courses) {
    const base = { courseId: course.id, courseName: course.name, subjectIds: course.subjectIds };
    if (nextModule) {
      const ref = { id: nextModule.id, name: nextModule.name, subjectIds: nextModule.subject_ids };
      const lesson = nextModule.lessons?.find((l) => !l.completed);
      const ids = nextModule.subject_ids.length ? nextModule.subject_ids : course.subjectIds;
      out.push({
        ...base,
        module: ref,
        subjectIds: ids,
        text: lesson
          ? (lesson.duration_seconds ?? Infinity) <= SHORT_LESSON_SECONDS
            ? `Assistir à aula curta "${lesson.name}"`
            : `Assistir 5 minutos da aula "${lesson.name}"`
          : `Estudar 5 minutos de "${nextModule.name}"`,
      });
    }
    const last = modules
      .filter((m) => m.completed && m.completed_at)
      .sort((a, b) => b.completed_at!.localeCompare(a.completed_at!))[0];
    if (last) {
      out.push({
        ...base,
        module: { id: last.id, name: last.name, subjectIds: last.subject_ids },
        subjectIds: last.subject_ids.length ? last.subject_ids : course.subjectIds,
        text: `Revisar o que estudou em "${last.name}"`,
      });
    }
    out.push({ ...base, module: null, text: "Revisar uma anotação do curso" });
    out.push({ ...base, module: null, text: "Resolver um exercício simples" });
  }
  return out;
}
