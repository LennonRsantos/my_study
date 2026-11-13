import type { StepNode } from "@/lib/learningPath";

/** Pixel sizes shared by the layout math and the cards, so both always agree. */
export const SIZE = { col: 230, gapX: 80, main: 44, card: 40, gap: 8, pad: 8, row: 28 };

// Column of the main node: center, left, center, right. Only ever moves to a neighbor column.
const LANES = [1, 0, 1, 2];
const RADIUS = 10;

export interface Box {
  node: StepNode;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RoadmapLayout {
  width: number;
  height: number;
  mains: Box[];
  /** Topic boxes of each main node, in data order. */
  topics: Box[][];
  /** SVG paths of the solid line between main nodes. */
  spine: string[];
  /** SVG paths of the dotted lines from a main node to its topics. */
  links: string[];
}

const colX = (col: number) => col * (SIZE.col + SIZE.gapX);

/** A topic with children is a group box: its own card on top, children stacked inside. */
export function topicHeight(node: StepNode): number {
  if (node.children.length === 0) return SIZE.card;
  return SIZE.pad * 2 + SIZE.card + node.children.reduce((sum, child) => sum + SIZE.gap + topicHeight(child), 0);
}

const stackHeight = (nodes: StepNode[]) =>
  nodes.reduce((sum, node) => sum + topicHeight(node), 0) + SIZE.gap * Math.max(0, nodes.length - 1);

const cards = (count: number) => count * SIZE.card + (count - 1) * SIZE.gap;
/** Up to this height a center node keeps its topics on one side. */
const SHORT = cards(3);
/** Above this height a list is too tall for the single column of a side lane. */
const TALL = cards(8);

/** Index that cuts the nodes into two stacks of the closest heights. */
function splitAt(nodes: StepNode[]): number {
  const diff = (k: number) => Math.abs(stackHeight(nodes.slice(0, k)) - stackHeight(nodes.slice(k)));
  let best = 1;
  for (let k = 2; k < nodes.length; k++) if (diff(k) < diff(best)) best = k;
  return best;
}

/**
 * Places main nodes on a line that snakes across three columns, topics fanning into the free columns.
 * Each column tracks its own bottom, so the two sides of the line pack independently.
 */
export function layoutRoadmap(tree: StepNode[]): RoadmapLayout {
  const bottom = [0, 0, 0];
  const below = (col: number) => bottom[col] + (bottom[col] > 0 ? SIZE.row : 0);
  const mains: Box[] = [];
  const topics: Box[][] = [];
  const spine: string[] = [];
  const links: string[] = [];
  let step = 0;
  let prevLane = LANES[0];

  tree.forEach((root, i) => {
    const prev = mains[i - 1];
    // A main node without topics stacks under the previous one. Topics need room, so the line moves on.
    if (prev && prev.node.children.length > 0) step++;
    const kids = root.children;
    const total = stackHeight(kids);
    // A side lane has one column for topics. A tall list takes the center instead, to use both sides.
    const lane = total > TALL ? 1 : LANES[step % LANES.length];
    const half = splitAt(kids);
    const nextLane = LANES[(step + 1) % LANES.length];
    const stacks: [number, StepNode[]][] =
      kids.length === 0 ? []
      : lane !== 1 ? [[1, kids]]
      // First part on the left so the two stacks read in order, left to right
      : kids.length > 1 && total > SHORT ? [[0, kids.slice(0, half)], [2, kids.slice(half)]]
      // A short list goes opposite to where the line heads next, leaving that column free
      : [[nextLane === 0 ? 2 : 0, kids]];
    const heights = stacks.map(([, nodes]) => stackHeight(nodes));
    const blockH = Math.max(SIZE.main, ...heights);

    // On a lane change the line runs through a horizontal channel under everything in both lanes,
    // and the whole block of this node starts under the channel. The line never crosses a box.
    const changed = prev !== undefined && lane !== prevLane;
    const channel = changed ? Math.max(bottom[prevLane], bottom[lane]) + SIZE.row / 2 : 0;
    let cy = changed ? channel + SIZE.row / 2 + blockH / 2 : below(lane) + SIZE.main / 2;
    stacks.forEach(([col], s) => { cy = Math.max(cy, below(col) + heights[s] / 2); });

    const x = colX(lane);
    const y = cy - SIZE.main / 2;
    const cx = x + SIZE.col / 2;
    if (prev && changed) {
      const px = prev.x + SIZE.col / 2;
      const dir = Math.sign(cx - px);
      spine.push(
        `M ${px} ${prev.y + prev.h} V ${channel - RADIUS} Q ${px} ${channel} ${px + dir * RADIUS} ${channel} ` +
        `H ${cx - dir * RADIUS} Q ${cx} ${channel} ${cx} ${channel + RADIUS} V ${y}`,
      );
      bottom[prevLane] = Math.max(bottom[prevLane], channel);
    } else if (prev) {
      spine.push(`M ${cx} ${prev.y + prev.h} V ${y}`);
    }
    mains.push({ node: root, x, y, w: SIZE.col, h: SIZE.main });
    bottom[lane] = cy + SIZE.main / 2;

    const boxes: Box[] = [];
    stacks.forEach(([col, nodes], s) => {
      const left = col < lane;
      const from = left ? x : x + SIZE.col;
      const to = left ? colX(col) + SIZE.col : colX(col);
      const mid = (from + to) / 2;
      let top = cy - heights[s] / 2;
      for (const node of nodes) {
        const h = topicHeight(node);
        boxes.push({ node, x: colX(col), y: top, w: SIZE.col, h });
        links.push(`M ${from} ${cy} C ${mid} ${cy}, ${mid} ${top + h / 2}, ${to} ${top + h / 2}`);
        top += h + SIZE.gap;
      }
      bottom[col] = cy + heights[s] / 2;
    });
    topics.push(boxes);
    prevLane = lane;
  });

  return { width: colX(2) + SIZE.col, height: Math.max(...bottom), mains, topics, spine, links };
}
