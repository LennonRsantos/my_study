import { z } from "zod";
import type { LearningPathStep, StepStatus } from "@/hooks/useLearningPaths";

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  completed: "Concluído",
};

export interface StepNode extends LearningPathStep {
  children: StepNode[];
}

/** Nests flat steps by parentId, each level ordered by position. */
export function buildTree(steps: LearningPathStep[]): StepNode[] {
  const nodes = new Map<string, StepNode>(steps.map((s) => [s.id, { ...s, children: [] }]));
  const roots: StepNode[] = [];
  for (const step of [...steps].sort((a, b) => a.position - b.position)) {
    const parent = step.parentId ? nodes.get(step.parentId) : undefined;
    (parent ? parent.children : roots).push(nodes.get(step.id)!);
  }
  return roots;
}

/** Steps without children: the unit of progress, so a parent and its topics never count twice. */
export function leafSteps<T extends LearningPathStep>(steps: T[]): T[] {
  const parents = new Set(steps.map((s) => s.parentId));
  return steps.filter((s) => !parents.has(s.id));
}

/** The node and everything below it. */
export function flattenNode(node: StepNode): StepNode[] {
  return [node, ...node.children.flatMap(flattenNode)];
}

export function nodeLeaves(node: StepNode): StepNode[] {
  return node.children.length === 0 ? [node] : node.children.flatMap(nodeLeaves);
}

/** A parent's status comes from its topics. Its own column only says the parent itself was started. */
export function effectiveStatus(node: StepNode): StepStatus {
  if (node.children.length === 0) return node.status;
  const statuses = node.children.map(effectiveStatus);
  if (statuses.every((s) => s === "completed")) return "completed";
  return node.status !== "not_started" || statuses.some((s) => s !== "not_started") ? "in_progress" : "not_started";
}

/** True when nothing under the node can be unchecked, because hours or a module keep it completed. */
export function isLocked(node: StepNode): boolean {
  return nodeLeaves(node).every((n) => n.autoDone);
}

interface HoursSession {
  subject_id: string;
  step_id: string | null;
  hours: number | string;
}

/**
 * Hours per step id, parents including their topics.
 * A session linked to a step counts only there. An unlinked session counts for steps of its subject.
 */
export function stepHours(steps: LearningPathStep[], sessions: HoursSession[]): Map<string, number> {
  const hours = new Map<string, number>();
  const add = (id: string, h: number) => hours.set(id, (hours.get(id) || 0) + h);
  for (const session of sessions) {
    if (session.step_id) add(session.step_id, Number(session.hours));
    else steps.filter((s) => s.subjectId === session.subject_id).forEach((s) => add(s.id, Number(session.hours)));
  }
  const total = (node: StepNode): number => {
    const sum = (hours.get(node.id) || 0) + node.children.reduce((a, c) => a + total(c), 0);
    hours.set(node.id, sum);
    return sum;
  };
  buildTree(steps).forEach(total);
  return hours;
}

export interface RoadmapNode {
  name: string;
  topics: RoadmapNode[];
}

export interface Roadmap {
  name: string;
  description: string;
  steps: RoadmapNode[];
}

const MAX_DEPTH = 3;
const MAX_NODES = 500;

const nameSchema = z.string().trim().min(1).max(120);
const nodeSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({ name: nameSchema, topics: z.array(nodeSchema).default([]) }),
);
const roadmapSchema = z.object({
  name: nameSchema,
  description: z.string().trim().max(500).default(""),
  steps: z.array(nodeSchema).min(1),
});

const depthOf = (nodes: RoadmapNode[]): number =>
  nodes.length === 0 ? 0 : 1 + Math.max(...nodes.map((n) => depthOf(n.topics)));
const countOf = (nodes: RoadmapNode[]): number =>
  nodes.reduce((sum, n) => sum + 1 + countOf(n.topics), 0);

export type RoadmapResult = { ok: true; roadmap: Roadmap } | { ok: false; error: string };

/** Reads the JSON an AI chat returned, ignoring code fences or text around it. */
export function parseRoadmapJson(text: string): RoadmapResult {
  try {
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const parsed = roadmapSchema.safeParse(json);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: `Campo inválido em "${issue.path.join(".") || "raiz"}": ${issue.message}` };
    }
    const roadmap = parsed.data as Roadmap;
    if (depthOf(roadmap.steps) > MAX_DEPTH) return { ok: false, error: `Use no máximo ${MAX_DEPTH} níveis de tópicos.` };
    if (countOf(roadmap.steps) > MAX_NODES) return { ok: false, error: `Use no máximo ${MAX_NODES} itens.` };
    return { ok: true, roadmap };
  } catch {
    return { ok: false, error: "O texto não é um JSON válido." };
  }
}

interface RoadmapRow {
  id: string;
  path_id: string;
  parent_id: string | null;
  name: string;
  position: number;
}

/** Insert rows for a roadmap, parents first. Ids are generated here so one insert can carry the whole tree. */
export function roadmapRows(nodes: RoadmapNode[], pathId: string, parentId: string | null = null): RoadmapRow[] {
  return nodes.flatMap((node, position) => {
    const id = crypto.randomUUID();
    return [{ id, path_id: pathId, parent_id: parentId, name: node.name, position }, ...roadmapRows(node.topics, pathId, id)];
  });
}

export const ROADMAP_PROMPT = `Leia o roadmap de estudos da imagem anexada e devolva somente um JSON, sem nenhum texto antes ou depois, neste formato:

{
  "name": "Nome do roadmap",
  "description": "",
  "steps": [
    {
      "name": "Nó principal",
      "topics": [
        { "name": "Subtópico", "topics": [{ "name": "Item do subtópico" }] }
      ]
    }
  ]
}

Regras:
- "steps" são os nós principais, na ordem em que a linha do roadmap os percorre, de cima para baixo.
- "topics" são as caixas ligadas a cada nó principal.
- Caixas agrupadas sob um subtópico vão em "topics" desse subtópico. Use no máximo 3 níveis.
- Copie os nomes exatamente como aparecem, sem traduzir.
- Ignore anúncios, botões, links, legendas e roadmaps relacionados.`;
