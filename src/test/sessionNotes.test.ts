import { describe, it, expect } from "vitest";
import { parseNotes, serializeNotes } from "@/lib/sessionNotes";

describe("serializeNotes / parseNotes (v4)", () => {
  it("returns empty string when no module and no studied text", () => {
    expect(serializeNotes({ module: null, studied: "  " })).toBe("");
  });

  it("round-trips module, subjects and studied text", () => {
    const raw = serializeNotes({
      module: { id: "m1", name: "Módulo 3", subjectIds: ["s1", "s2"] },
      studied: "Listas ligadas",
    });
    expect(raw.startsWith("@@v4@@")).toBe(true);
    expect(parseNotes(raw)).toEqual({
      module: { id: "m1", name: "Módulo 3", subjectIds: ["s1", "s2"] },
      courseSessions: [],
      topics: "Listas ligadas",
      course: "",
      sections: [],
      memo: "",
    });
  });

  it("round-trips submodules and notes", () => {
    const parsed = parseNotes(serializeNotes({
      module: { id: "m1", name: "TS", subjectIds: [] },
      studied: "",
      sections: ["Generics", "Classes"],
      memo: "  revisar keyof  ",
    }));
    expect(parsed.sections).toEqual(["Generics", "Classes"]);
    expect(parsed.memo).toBe("revisar keyof");
  });

  it("keeps notes alone", () => {
    expect(parseNotes(serializeNotes({ module: null, studied: "", memo: "x" })).memo).toBe("x");
  });

  it("reads old v4 notes without sections or memo", () => {
    const parsed = parseNotes('@@v4@@{"moduleId":"m1","moduleName":"A","subjectIds":[],"studied":"y"}');
    expect(parsed.sections).toEqual([]);
    expect(parsed.memo).toBe("");
  });

  it("keeps studied text without a module", () => {
    const parsed = parseNotes(serializeNotes({ module: null, studied: "Revisão" }));
    expect(parsed.module).toBeNull();
    expect(parsed.topics).toBe("Revisão");
  });

  it("trims studied text on write", () => {
    expect(parseNotes(serializeNotes({ module: null, studied: "  x  " })).topics).toBe("x");
  });
});

describe("parseNotes (legacy)", () => {
  it("reads plain text as studied text", () => {
    expect(parseNotes("Pomodoro (25min foco)")).toEqual({
      module: null,
      courseSessions: [],
      topics: "Pomodoro (25min foco)",
      course: "",
      sections: [],
      memo: "",
    });
  });

  it("reads v3 course sessions without a module", () => {
    const raw = '@@v3@@{"courseSessions":[{"number":2,"title":"Aula 2","progress":"Pilhas"}],"topics":"extra"}';
    const parsed = parseNotes(raw);
    expect(parsed.module).toBeNull();
    expect(parsed.courseSessions).toEqual([{ number: 2, title: "Aula 2", progress: "Pilhas" }]);
    expect(parsed.topics).toBe("extra");
    expect(parsed.course).toBe("Aula 2");
  });

  it("reads v2 course as a single course session", () => {
    const parsed = parseNotes('@@v2@@{"course":"Python","topics":"loops"}');
    expect(parsed.courseSessions).toEqual([{ number: 1, title: "Python", progress: "" }]);
    expect(parsed.topics).toBe("loops");
  });

  it("falls back to raw text when JSON is broken", () => {
    expect(parseNotes("@@v4@@{quebrado").topics).toBe("@@v4@@{quebrado");
  });

  it("returns empty for null or empty notes", () => {
    expect(parseNotes(null).module).toBeNull();
    expect(parseNotes("").topics).toBe("");
  });
});
