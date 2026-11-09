import { z } from "zod";

export interface ImportedLesson {
  name: string;
  durationSeconds: number | null;
  completed: boolean;
}

export interface ImportedModule {
  name: string;
  lessons: ImportedLesson[];
}

const nameSchema = z.string().trim().min(1).max(200);

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const withName = (v: unknown) => (isObj(v) ? { ...v, name: v.name ?? v.title } : v);

// Only the fields used here: zod drops ids, thumbnails, hashes and the rest of the platform data.
const leafSchema = z.object({
  name: nameSchema,
  type: z.string().optional(),
  completed: z.boolean().default(false),
  mediaDurationInSeconds: z.number().nonnegative().nullish(),
});
const pageSchema = z.preprocess(withName, leafSchema.extend({
  items: z.array(z.preprocess(withName, leafSchema)).optional(),
}));
const moduleSchema = z.preprocess(
  (v) => (isObj(v) ? { ...v, name: v.name ?? v.title, pages: v.pages ?? v.lessons ?? v.items } : v),
  z.object({ name: nameSchema, pages: z.array(pageSchema) }),
);
// Accepts { course: { modules } }, { modules } or a bare array of modules.
const courseSchema = z.preprocess(
  (v) => (Array.isArray(v) ? v : isObj(v) ? (isObj(v.course) ? v.course.modules : v.modules) : v),
  z.array(moduleSchema),
);

export type CourseJsonResult = { ok: true; modules: ImportedModule[] } | { ok: false; error: string };

/** Reads a course JSON (platform export, or modules → pages → items). Ads and modules left without lessons are dropped. */
export function parseCourseJson(text: string): CourseJsonResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "O texto não é um JSON válido." };
  }
  const parsed = courseSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `Campo inválido em "${issue.path.join(".") || "raiz"}": ${issue.message}` };
  }
  const modules = parsed.data
    .map((m) => ({
      name: m.name,
      lessons: m.pages
        // A page with items is a section: its items are the lessons.
        .flatMap((p) => (p.items?.length ? p.items : [p]))
        .filter((p) => p.type !== "ADVERTISEMENT")
        .map((p) => ({
          name: p.name,
          durationSeconds: p.mediaDurationInSeconds ? Math.round(p.mediaDurationInSeconds) : null,
          completed: p.completed,
        })),
    }))
    .filter((m) => m.lessons.length > 0);
  if (modules.length === 0) return { ok: false, error: "Nenhum módulo com aulas encontrado no JSON." };
  return { ok: true, modules };
}

/**
 * Insert rows for imported modules and lessons. Ids are generated here so lessons can point at their module.
 * Imported progress has no date: completed_at stays null, so it counts in totals but not in weekly pace.
 */
export function courseImportRows(modules: ImportedModule[], courseId: string, userId: string, startPosition = 0) {
  const moduleRows = modules.map((m, i) => {
    const seconds = m.lessons.reduce((a, l) => a + (l.durationSeconds ?? 0), 0);
    return {
      id: crypto.randomUUID(),
      user_id: userId,
      course_id: courseId,
      name: m.name,
      position: startPosition + i,
      lesson_count: m.lessons.length,
      duration_minutes: seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : null,
      completed: m.lessons.every((l) => l.completed),
    };
  });
  const lessonRows = modules.flatMap((m, i) =>
    m.lessons.map((l, position) => ({
      user_id: userId,
      module_id: moduleRows[i].id,
      name: l.name,
      position,
      duration_seconds: l.durationSeconds,
      completed: l.completed,
    })),
  );
  return { moduleRows, lessonRows };
}
