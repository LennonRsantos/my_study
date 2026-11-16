import { describe, it, expect } from "vitest";
import type { LearningPathStep } from "@/hooks/useLearningPaths";
import {
  buildTree, effectiveStatus, flattenNode, isLocked, leafHours, leafSteps, matchingStep, nextPendingStep, parseRoadmapJson, parseStudyLog, roadmapRows, serializeStudyLog, stepHours,
} from "@/lib/learningPath";

const step = (id: string, patch: Partial<LearningPathStep> = {}): LearningPathStep => ({
  id, pathId: "p", parentId: null, name: id, icon: null, status: "not_started", estimatedHours: 0, actualHours: 0,
  position: 0, completedAt: null, subjectId: null, moduleId: null, studyNote: "", autoDone: false, ...patch,
});

describe("buildTree / leafSteps", () => {
  it("nests by parent and orders by position", () => {
    const tree = buildTree([
      step("b", { position: 1 }),
      step("a", { position: 0 }),
      step("a2", { parentId: "a", position: 1 }),
      step("a1", { parentId: "a", position: 0 }),
    ]);
    expect(tree.map((n) => n.id)).toEqual(["a", "b"]);
    expect(tree[0].children.map((n) => n.id)).toEqual(["a1", "a2"]);
    expect(flattenNode(tree[0]).map((n) => n.id)).toEqual(["a", "a1", "a2"]);
  });

  it("keeps only steps without children", () => {
    const leaves = leafSteps([step("a"), step("a1", { parentId: "a" }), step("b")]);
    expect(leaves.map((s) => s.id)).toEqual(["a1", "b"]);
  });
});

describe("nextPendingStep", () => {
  const tree = buildTree([
    step("a", { position: 0 }),
    step("b", { position: 1 }),
    step("b1", { parentId: "b", position: 0 }),
    step("b2", { parentId: "b", position: 1 }),
    step("c", { position: 2, status: "completed" }),
    step("d", { position: 3 }),
  ]);
  const [a, b, , d] = tree;
  const ids = (n: ReturnType<typeof nextPendingStep>) => n?.id;

  it("picks the next pending leaf, skipping completed ones and the node's own topics", () => {
    expect(ids(nextPendingStep(tree, a))).toBe("b1");
    expect(ids(nextPendingStep(tree, b))).toBe("d");
    expect(ids(nextPendingStep(tree, b.children[0]))).toBe("b2");
  });

  it("wraps to the start and returns undefined when nothing is pending", () => {
    expect(ids(nextPendingStep(tree, d))).toBe("a");
    expect(nextPendingStep(buildTree([step("x")]), buildTree([step("x")])[0])).toBeUndefined();
  });
});

describe("leafHours", () => {
  it("splits the path total evenly when no step has hours", () => {
    const leaves = [step("a"), step("b"), step("c"), step("d")];
    expect(leaves.map(leafHours(leaves, 8))).toEqual([2, 2, 2, 2]);
    expect(leafHours([], 8)(step("x"))).toBe(8);
  });

  it("keeps the steps' own hours when any step has them", () => {
    const leaves = [step("a", { estimatedHours: 3 }), step("b")];
    expect(leaves.map(leafHours(leaves, 8))).toEqual([3, 0]);
  });
});

describe("matchingStep", () => {
  it("matches name ignoring case and accents before subject", () => {
    const steps = [step("bySubject", { subjectId: "s" }), step("byName", { name: "Lógica" })];
    expect(matchingStep(steps, "s", [" logica "])?.id).toBe("byName");
    expect(matchingStep(steps, "s", ["outra"])?.id).toBe("bySubject");
    expect(matchingStep(steps, "", ["outra"])).toBeUndefined();
  });

  it("skips completed and parent steps", () => {
    const steps = [
      step("done", { name: "TS", status: "completed" }),
      step("parent", { name: "TS" }),
      step("child", { parentId: "parent", name: "Generics" }),
    ];
    expect(matchingStep(steps, "", ["ts"])).toBeUndefined();
  });
});

describe("effectiveStatus", () => {
  const root = (a: LearningPathStep["status"], b: LearningPathStep["status"], own: LearningPathStep["status"] = "not_started") =>
    buildTree([step("r", { status: own }), step("a", { parentId: "r", status: a }), step("b", { parentId: "r", status: b })])[0];

  it("is completed only when every topic is", () => {
    expect(effectiveStatus(root("completed", "completed"))).toBe("completed");
    expect(effectiveStatus(root("completed", "not_started"))).toBe("in_progress");
  });

  it("is not started when nothing started", () => {
    expect(effectiveStatus(root("not_started", "not_started"))).toBe("not_started");
  });

  it("is in progress when the parent itself was started", () => {
    expect(effectiveStatus(root("not_started", "not_started", "in_progress"))).toBe("in_progress");
  });

  it("uses a leaf's own status", () => {
    expect(effectiveStatus(buildTree([step("a", { status: "in_progress" })])[0])).toBe("in_progress");
  });
});

describe("isLocked", () => {
  it("needs every leaf to be auto completed", () => {
    const tree = (b: boolean) =>
      buildTree([step("r"), step("a", { parentId: "r", autoDone: true }), step("b", { parentId: "r", autoDone: b })])[0];
    expect(isLocked(tree(true))).toBe(true);
    expect(isLocked(tree(false))).toBe(false);
  });
});

describe("stepHours", () => {
  it("counts a linked session only on its step", () => {
    const steps = [step("a", { subjectId: "s" }), step("b", { subjectId: "s" })];
    const hours = stepHours(steps, [{ subject_id: "s", step_id: "a", hours: 2 }]);
    expect(hours.get("a")).toBe(2);
    expect(hours.get("b")).toBe(0);
  });

  it("counts an unlinked session by subject", () => {
    const hours = stepHours([step("a", { subjectId: "s" })], [{ subject_id: "s", step_id: null, hours: "1.5" }]);
    expect(hours.get("a")).toBe(1.5);
  });

  it("adds topics into their parent", () => {
    const steps = [step("r"), step("a", { parentId: "r" }), step("a1", { parentId: "a" })];
    const hours = stepHours(steps, [
      { subject_id: "s", step_id: "r", hours: 1 },
      { subject_id: "s", step_id: "a1", hours: 2 },
    ]);
    expect(hours.get("a")).toBe(2);
    expect(hours.get("r")).toBe(3);
  });
});

describe("parseRoadmapJson", () => {
  const valid = { name: "SQL", steps: [{ name: "Basics", topics: [{ name: "Types", topics: [{ name: "INT" }] }] }] };

  it("reads valid JSON and fills defaults", () => {
    expect(parseRoadmapJson(JSON.stringify(valid))).toEqual({
      ok: true,
      roadmap: {
        name: "SQL",
        description: "",
        steps: [{ name: "Basics", topics: [{ name: "Types", topics: [{ name: "INT", topics: [] }] }] }],
      },
    });
  });

  it("accepts the modulos, topicos and itens format", () => {
    const result = parseRoadmapJson(JSON.stringify({
      name: "SQL",
      descricao: "Desc",
      fonte: "roadmap.sh",
      modulos: [
        { name: "Basics", topicos: ["Keywords", "Types"] },
        { name: "DML", topicos: [{ name: "Statements", itens: ["SELECT", "INSERT"] }] },
      ],
    }));
    const leaf = (name: string) => ({ name, topics: [] });
    expect(result).toEqual({
      ok: true,
      roadmap: {
        name: "SQL",
        description: "Desc",
        steps: [
          { name: "Basics", topics: [leaf("Keywords"), leaf("Types")] },
          { name: "DML", topics: [{ name: "Statements", topics: [leaf("SELECT"), leaf("INSERT")] }] },
        ],
      },
    });
  });

  it("accepts a wrapper with titulo and nome", () => {
    const result = parseRoadmapJson(JSON.stringify({
      trilha: {
        titulo: "SQL Roadmap",
        descricao: "Desc",
        fonte: "roadmap.sh",
        modulos: [{ nome: "Basics", topicos: [{ nome: "DML", subtopicos: ["SELECT"] }, "DDL"] }],
      },
    }));
    expect(result).toEqual({
      ok: true,
      roadmap: {
        name: "SQL Roadmap",
        description: "Desc",
        steps: [{
          name: "Basics",
          topics: [{ name: "DML", topics: [{ name: "SELECT", topics: [] }] }, { name: "DDL", topics: [] }],
        }],
      },
    });
  });

  it("sorts steps and topics by their order field", () => {
    const result = parseRoadmapJson(JSON.stringify({
      title: "TS",
      steps: [
        { order: 2, name: "Types", topics: [{ name: "b", order: 2 }, { name: "a", order: 1 }] },
        { order: 1, name: "Intro", topics: [{ name: "y" }, { name: "x" }] },
      ],
    }));
    const leaf = (name: string) => ({ name, topics: [] });
    expect(result.ok && result.roadmap.steps).toEqual([
      { name: "Intro", topics: [leaf("y"), leaf("x")] },
      { name: "Types", topics: [leaf("a"), leaf("b")] },
    ]);
  });

  it("names the roadmap when the JSON has no name", () => {
    const result = parseRoadmapJson(JSON.stringify({ steps: [{ name: "a" }] }));
    expect(result.ok && result.roadmap.name).toBe("Trilha importada");
  });

  it("ignores code fences and text around the JSON", () => {
    expect(parseRoadmapJson("Aqui está:\n```json\n" + JSON.stringify(valid) + "\n```\nPronto!").ok).toBe(true);
  });

  it("rejects text that is not JSON", () => {
    expect(parseRoadmapJson("sem json")).toEqual({ ok: false, error: "O texto não é um JSON válido." });
  });

  it("names the invalid field", () => {
    const result = parseRoadmapJson(JSON.stringify({ name: "SQL", steps: [{ name: "" }] }));
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.error).toContain("steps.0.name");
  });

  it("rejects an empty roadmap", () => {
    expect(parseRoadmapJson(JSON.stringify({ name: "SQL", steps: [] })).ok).toBe(false);
  });

  const chain = (depth: number): { name: string; topics: unknown[] } =>
    ({ name: `n${depth}`, topics: depth > 1 ? [chain(depth - 1)] : [] });

  it("accepts five levels", () => {
    expect(parseRoadmapJson(JSON.stringify({ name: "SQL", steps: [chain(5)] })).ok).toBe(true);
  });

  it("rejects a sixth level", () => {
    expect(parseRoadmapJson(JSON.stringify({ name: "SQL", steps: [chain(6)] }))).toEqual({
      ok: false,
      error: "Use no máximo 5 níveis de tópicos.",
    });
  });

  it("rejects more than 500 items", () => {
    const steps = Array.from({ length: 501 }, (_, i) => ({ name: `n${i}` }));
    expect(parseRoadmapJson(JSON.stringify({ name: "SQL", steps })).ok).toBe(false);
  });
});

describe("roadmapRows", () => {
  it("links topics to parents and numbers siblings", () => {
    const rows = roadmapRows(
      [{ name: "a", topics: [{ name: "a1", topics: [] }, { name: "a2", topics: [] }] }, { name: "b", topics: [] }],
      "p",
    );
    expect(rows.map((r) => [r.name, r.position])).toEqual([["a", 0], ["a1", 0], ["a2", 1], ["b", 1]]);
    expect(rows[1].parent_id).toBe(rows[0].id);
    expect(rows[3].parent_id).toBeNull();
    expect(rows.every((r) => r.path_id === "p")).toBe(true);
  });
});

describe("parseStudyLog / serializeStudyLog", () => {
  it("reads empty, legacy text and JSON entries", () => {
    expect(parseStudyLog("")).toEqual([]);
    expect(parseStudyLog("li o capítulo 2")).toEqual([{ date: null, text: "li o capítulo 2" }]);
    const entries = [{ date: "2026-11-16", text: "rotas" }, { date: null, text: "antigo" }];
    expect(parseStudyLog(serializeStudyLog(entries))).toEqual(entries);
    expect(serializeStudyLog([])).toBe("");
  });

  it("keeps a code example and drops empty or invalid ones", () => {
    const withCode = [{ date: "2026-11-16", text: "", code: "<p>\n  oi\n</p>" }];
    expect(parseStudyLog(serializeStudyLog(withCode))).toEqual(withCode);
    const bad = JSON.stringify([{ date: "2026-11-16", text: "a", code: "  " }, { date: null, text: "b", code: 3 }]);
    expect(parseStudyLog(bad)).toEqual([{ date: "2026-11-16", text: "a" }, { date: null, text: "b" }]);
  });
});
