import { describe, it, expect } from "vitest";
import type { StepNode } from "@/lib/learningPath";
import { Box, SIZE, layoutRoadmap, topicHeight } from "@/lib/roadmapLayout";

const node = (id: string, children: StepNode[] = []): StepNode => ({
  id, pathId: "p", parentId: null, name: id, icon: null, status: "not_started", estimatedHours: 0, actualHours: 0,
  position: 0, completedAt: null, subjectId: null, moduleId: null, studyNote: "", autoDone: false, children,
});
const leaves = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => node(`${prefix}${i}`));

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("topicHeight", () => {
  it("is one card for a leaf and adds children for a group", () => {
    expect(topicHeight(node("a"))).toBe(SIZE.card);
    expect(topicHeight(node("g", leaves("c", 2)))).toBe(SIZE.pad * 2 + SIZE.card + 2 * (SIZE.gap + SIZE.card));
  });
});

describe("layoutRoadmap", () => {
  // Every shape at once: no topics, short list, long list, groups, a long run of main nodes
  const tree = [
    node("intro", leaves("i", 4)),
    node("types", [node("primitive", leaves("p", 6)), node("object", leaves("o", 5)), node("top")]),
    node("inference"),
    node("compat"),
    node("combining", leaves("c", 4)),
    node("guards", leaves("g", 5)),
    node("functions", leaves("f", 2)),
    node("utility", leaves("u", 12)),
    node("modules", leaves("m", 5)),
    node("ecosystem", leaves("e", 4)),
  ];
  const layout = layoutRoadmap(tree);
  const boxes = [...layout.mains, ...layout.topics.flat()];

  it("places every node once, inside the canvas, without overlap", () => {
    expect(layout.mains).toHaveLength(tree.length);
    expect(layout.topics.flat()).toHaveLength(tree.reduce((sum, root) => sum + root.children.length, 0));
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(layout.width);
      expect(box.y + box.h).toBeLessThanOrEqual(layout.height);
    }
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => {
      expect(overlaps(a, b), `${a.node.id} x ${b.node.id}`).toBe(false);
    }));
  });

  it("runs main nodes top to bottom with one line between each pair", () => {
    const ys = layout.mains.map((m) => m.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(new Set(ys).size).toBe(ys.length);
    expect(layout.spine).toHaveLength(tree.length - 1);
    expect(layout.links).toHaveLength(layout.topics.flat().length);
  });

  const x = (id: string) => layout.mains.find((m) => m.node.id === id)!.x;

  it("changes lane after a main node with topics and stacks one without", () => {
    expect(x("compat")).toBe(x("inference"));
    expect(x("combining")).toBe(x("compat"));
    expect(x("guards")).toBeGreaterThan(x("combining"));
    expect(x("functions")).toBe(x("combining"));
  });

  it("keeps a tall list in the center, split by height", () => {
    expect(x("types")).toBe(x("intro"));
    expect(x("utility")).toBe(x("intro"));
    const [primitive, object, top] = layout.topics[1];
    expect(primitive.x).toBeLessThan(x("types"));
    expect(object.x).toBeGreaterThan(x("types"));
    expect(top.x).toBe(object.x);
  });

  it("splits a long list of a center node in reading order", () => {
    const [i0, i1, i2, i3] = layout.topics[0];
    expect(i0.x).toBe(i1.x);
    expect(i2.x).toBe(i3.x);
    expect(i0.x).toBeLessThan(i2.x);
    expect(i0.y).toBeLessThan(i1.y);
    expect(i2.y).toBeLessThan(i3.y);
  });

  it("keeps a side node's topics in one ordered stack", () => {
    const stack = layout.topics[5];
    expect(stack).toHaveLength(5);
    expect(new Set(stack.map((b) => b.x)).size).toBe(1);
    expect(stack.map((b) => b.y)).toEqual([...stack.map((b) => b.y)].sort((a, b) => a - b));
  });

  it("handles an empty path and a single step", () => {
    expect(layoutRoadmap([]).mains).toEqual([]);
    const single = layoutRoadmap([node("only")]);
    expect(single.height).toBe(SIZE.main);
    expect(single.spine).toEqual([]);
  });
});
