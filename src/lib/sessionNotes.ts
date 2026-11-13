// Session notes are stored in study_sessions.notes as a prefixed JSON string.
// v4: { moduleId, moduleName, subjectIds, sections, studied, memo } — current format (sections/memo optional).
// v3: { courseSessions: [{ number, title, progress }], topics } — legacy, read only.
// v2: { course, topics } — legacy, read only.
// Plain text legacy -> treated as studied text.
const NOTES_PREFIX_V2 = "@@v2@@";
const NOTES_PREFIX_V3 = "@@v3@@";
const NOTES_PREFIX_V4 = "@@v4@@";

export interface CourseSessionEntry {
  number: number;
  title: string;
  progress: string;
}

export interface SessionModuleRef {
  id: string;
  name: string;
  subjectIds: string[];
}

export interface SessionNotes {
  module: SessionModuleRef | null;
  studied: string;
  /** Submodules (lesson sections) of the module studied in the session. */
  sections?: string[];
  /** Free notes. */
  memo?: string;
}

export interface ParsedNotes {
  module: SessionModuleRef | null;
  /** Legacy v2/v3 course entries. Empty for v4. */
  courseSessions: CourseSessionEntry[];
  /** Studied text. For legacy notes, the old topics text. */
  topics: string;
  /** Submodules studied (v4 only). */
  sections: string[];
  /** Free notes (v4 only). */
  memo: string;
  /** Convenience: first legacy course session title, for compact displays */
  course: string;
}

export function parseNotes(raw: string | null | undefined): ParsedNotes {
  const empty: ParsedNotes = { module: null, courseSessions: [], topics: "", course: "", sections: [], memo: "" };
  if (!raw) return empty;
  if (raw.startsWith(NOTES_PREFIX_V4)) {
    try {
      const obj = JSON.parse(raw.slice(NOTES_PREFIX_V4.length));
      const module: SessionModuleRef | null = obj.moduleId
        ? {
            id: String(obj.moduleId),
            name: String(obj.moduleName || ""),
            subjectIds: Array.isArray(obj.subjectIds) ? obj.subjectIds.map(String) : [],
          }
        : null;
      return {
        ...empty,
        module,
        topics: obj.studied || "",
        sections: Array.isArray(obj.sections) ? obj.sections.map(String) : [],
        memo: obj.memo || "",
      };
    } catch {
      return { ...empty, topics: raw };
    }
  }
  if (raw.startsWith(NOTES_PREFIX_V3)) {
    try {
      const obj = JSON.parse(raw.slice(NOTES_PREFIX_V3.length));
      const cs: CourseSessionEntry[] = Array.isArray(obj.courseSessions)
        ? obj.courseSessions.map((c: Partial<CourseSessionEntry>, i: number) => ({
            number: Number.isFinite(Number(c.number)) && Number(c.number) > 0 ? Number(c.number) : i + 1,
            title: c.title || "",
            progress: c.progress || "",
          }))
        : [];
      return { ...empty, courseSessions: cs, topics: obj.topics || "", course: cs[0]?.title || "" };
    } catch {
      return { ...empty, topics: raw };
    }
  }
  if (raw.startsWith(NOTES_PREFIX_V2)) {
    try {
      const obj = JSON.parse(raw.slice(NOTES_PREFIX_V2.length));
      const cs = obj.course ? [{ number: 1, title: obj.course, progress: "" }] : [];
      return { ...empty, courseSessions: cs, topics: obj.topics || "", course: obj.course || "" };
    } catch {
      return { ...empty, topics: raw };
    }
  }
  return { ...empty, topics: raw };
}

export function serializeNotes(notes: SessionNotes): string {
  const studied = notes.studied.trim();
  const memo = (notes.memo ?? "").trim();
  if (!notes.module && !studied && !memo) return "";
  return NOTES_PREFIX_V4 + JSON.stringify({
    moduleId: notes.module?.id ?? null,
    moduleName: notes.module?.name ?? "",
    subjectIds: notes.module?.subjectIds ?? [],
    sections: notes.sections ?? [],
    studied,
    memo,
  });
}
