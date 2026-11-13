import { describe, it, expect } from "vitest";
import type { StepNode } from "@/lib/learningPath";
import { Rect, SIZE, layoutRoadmap, rowsOf, stackHeight, topicHeight } from "@/lib/roadmapLayout";

const node = (id: string, children: StepNode[] = []): StepNode => ({
  id, pathId: "p", parentId: null, name: id, icon: null, status: "not_started", estimatedHours: 0, actualHours: 0,
  position: 0, completedAt: null, subjectId: null, moduleId: null, studyNote: "", autoDone: false, children,
});
const leaves = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => node(`${prefix}${i}`));
const LONG = "a name with more than twenty characters";

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (inner: Rect, outer: Rect) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;

describe("rowsOf", () => {
  it("pairs consecutive short leaves and keeps the order", () => {
    const rows = rowsOf([node("a"), node("b"), node(LONG), node("c"), node("g", leaves("x", 2)), node("d"), node("e")]);
    expect(rows.map((row) => row.map((n) => n.id))).toEqual([["a", "b"], [LONG], ["c"], ["g"], ["d", "e"]]);
  });
});

describe("topicHeight", () => {
  it("is one card for a leaf and counts paired rows in a group", () => {
    expect(topicHeight(node("a"))).toBe(SIZE.card);
    // Header plus two rows of two
    expect(topicHeight(node("g", leaves("c", 4)))).toBe(SIZE.pad * 2 + 3 * SIZE.card + 2 * SIZE.gap);
    expect(stackHeight(leaves("c", 5))).toBe(3 * SIZE.card + 2 * SIZE.gap);
  });
});

describe("layoutRoadmap", () => {
  // Every shape at once: no topics, short list, long list, groups, a long run of main nodes
  const tree = [
    node("intro", leaves("i", 8)),
    node("types", [node("primitive", leaves("p", 12)), node("object", leaves("o", 10)), node("top", leaves("t", 4)), node(LONG)]),
    node("inference"),
    node("compat"),
    node("combining", leaves("c", 8)),
    node("guards", leaves("g", 5)),
    node("functions", leaves("f", 2)),
    node("utility", leaves("u", 30)),
    node("modules", leaves("m", 10)),
    node("ecosystem", leaves("e", 4)),
  ];
  const layout = layoutRoadmap(tree);
  const x = (id: string) => layout.mains.find((m) => m.node.id === id)!.x;
  const index = (id: string) => tree.findIndex((root) => root.id === id);
  const framed = layout.stacks.flat().filter((stack) => layout.frames.some((frame) => inside(stack, frame)));
  const loose = layout.stacks.flat().filter((stack) => !framed.includes(stack));

  it("places every topic once, inside the canvas, without overlap", () => {
    expect(layout.mains).toHaveLength(tree.length);
    layout.stacks.forEach((stacks, i) => {
      expect(stacks.flatMap((stack) => stack.nodes.map((n) => n.id))).toEqual(tree[i].children.map((n) => n.id));
    });
    const rects: Rect[] = [...layout.mains, ...layout.frames, ...loose];
    for (const rect of [...rects, ...framed]) {
      expect(inside(rect, { x: 0, y: 0, w: layout.width, h: layout.height })).toBe(true);
    }
    rects.forEach((a, i) => rects.slice(i + 1).forEach((b) => expect(overlaps(a, b)).toBe(false)));
    framed.forEach((a, i) => framed.slice(i + 1).forEach((b) => expect(overlaps(a, b)).toBe(false)));
  });

  it("runs main nodes top to bottom with one line between each pair", () => {
    const ys = layout.mains.map((m) => m.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(new Set(ys).size).toBe(ys.length);
    expect(layout.spine).toHaveLength(tree.length - 1);
  });

  it("changes lane after a main node with topics and stacks one without", () => {
    expect(x("types")).toBeLessThan(x("intro"));
    expect(x("inference")).toBe(x("intro"));
    expect(x("compat")).toBe(x("inference"));
    expect(x("combining")).toBe(x("compat"));
    expect(x("guards")).toBeGreaterThan(x("combining"));
    expect(x("functions")).toBe(x("combining"));
  });

  it("splits a long list of a center node in reading order", () => {
    const [left, right] = layout.stacks[index("intro")];
    expect(left.x).toBeLessThan(x("intro"));
    expect(right.x).toBeGreaterThan(x("intro"));
    expect(left.nodes[0].id).toBe("i0");
  });

  it("frames a long list of a side node across both free columns", () => {
    expect(layout.frames).toHaveLength(2);
    const [first, second] = layout.stacks[index("types")];
    const frame = layout.frames[0];
    expect(frame.x).toBeGreaterThan(x("types"));
    expect(inside(first, frame) && inside(second, frame)).toBe(true);
    expect(first.x).toBeLessThan(second.x);
    expect(first.y).toBe(second.y);
    expect(first.nodes[0].id).toBe("primitive");
    // "utility" sits on the left too, "guards" is short enough for one column
    expect(layout.stacks[index("utility")]).toHaveLength(2);
    expect(layout.stacks[index("guards")]).toHaveLength(1);
  });

  it("draws one link per row, or one per frame", () => {
    const rows = loose.reduce((sum, stack) => sum + rowsOf(stack.nodes).length, 0);
    expect(layout.links).toHaveLength(rows + layout.frames.length);
  });

  it("keeps snaking when every main node has a long list", () => {
    const big = layoutRoadmap(Array.from({ length: 6 }, (_, i) => node(`m${i}`, [
      node(`a${i}`, leaves(`a${i}-`, 20)), node(`b${i}`, leaves(`b${i}-`, 20)),
    ])));
    expect(new Set(big.mains.map((m) => m.x)).size).toBe(3);
  });

  it("handles an empty path and a single step", () => {
    expect(layoutRoadmap([]).mains).toEqual([]);
    const single = layoutRoadmap([node("only")]);
    expect(single.height).toBe(SIZE.main);
    expect(single.spine).toEqual([]);
  });
});
