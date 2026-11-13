import type { StepNode } from "@/lib/learningPath";

/** Pixel sizes shared by the layout math and the cards, so both always agree. */
export const SIZE = { col: 260, gapX: 70, main: 44, card: 40, gap: 6, pad: 8, row: 28 };

// Column of the main node: center, left, center, right. Only ever moves to a neighbor column.
const LANES = [1, 0, 1, 2];
const RADIUS = 10;
/** Longest name that still fits a half-width card in two lines. */
const PAIR_MAX = 20;
/** Space between the two stacks inside a frame. */
const FRAME_GAP = 12;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Box extends Rect {
  node: StepNode;
}

/** Topics of one main node that sit in one column, rendered as rows of one or two cards. */
export interface Stack extends Rect {
  nodes: StepNode[];
}

export interface RoadmapLayout {
  width: number;
  height: number;
  mains: Box[];
  /** Topic stacks of each main node, in data order. */
  stacks: Stack[][];
  /** Boxes around the two stacks of a side node with a long list. */
  frames: Rect[];
  /** SVG paths of the solid line between main nodes. */
  spine: string[];
  /** SVG paths of the dotted lines from a main node to its topics. */
  links: string[];
}

const colX = (col: number) => col * (SIZE.col + SIZE.gapX);
const isShortLeaf = (node: StepNode) => node.children.length === 0 && node.name.length <= PAIR_MAX;

/** Rows of a topic list: two short leaves in a row share it, anything else takes the whole row. */
export function rowsOf(nodes: StepNode[]): StepNode[][] {
  const rows: StepNode[][] = [];
  for (let i = 0; i < nodes.length; i++) {
    const pair = isShortLeaf(nodes[i]) && i + 1 < nodes.length && isShortLeaf(nodes[i + 1]);
    rows.push(pair ? [nodes[i], nodes[++i]] : [nodes[i]]);
  }
  return rows;
}

const rowHeight = (row: StepNode[]) => (row.length === 2 ? SIZE.card : topicHeight(row[0]));

export function stackHeight(nodes: StepNode[]): number {
  const rows = rowsOf(nodes);
  return rows.reduce((sum, row) => sum + rowHeight(row), 0) + SIZE.gap * Math.max(0, rows.length - 1);
}

/** A topic with children is a group box: its own card on top, the rows of its children inside. */
export function topicHeight(node: StepNode): number {
  if (node.children.length === 0) return SIZE.card;
  return SIZE.pad * 2 + SIZE.card + SIZE.gap + stackHeight(node.children);
}

const cards = (count: number) => count * SIZE.card + (count - 1) * SIZE.gap;
/** Up to this height a center node keeps its topics on one side. */
const SHORT = cards(3);
/** Up to this height a side node keeps its topics in the one column beside it. */
const SIDE_MAX = cards(6);

/** Index that cuts the nodes into two stacks of the closest heights. */
function splitAt(nodes: StepNode[]): number {
  const diff = (k: number) => Math.abs(stackHeight(nodes.slice(0, k)) - stackHeight(nodes.slice(k)));
  let best = 1;
  for (let k = 2; k < nodes.length; k++) if (diff(k) < diff(best)) best = k;
  return best;
}

interface Part {
  /** Columns this stack keeps other boxes out of. */
  cols: number[];
  x: number;
  w: number;
  nodes: StepNode[];
}

/**
 * Places main nodes on a line that snakes across three columns, topics filling the free columns.
 * Each column tracks its own bottom, so the two sides of the line pack independently.
 */
export function layoutRoadmap(tree: StepNode[]): RoadmapLayout {
  const bottom = [0, 0, 0];
  const below = (col: number) => bottom[col] + (bottom[col] > 0 ? SIZE.row : 0);
  const mains: Box[] = [];
  const stacks: Stack[][] = [];
  const frames: Rect[] = [];
  const spine: string[] = [];
  const links: string[] = [];
  let step = 0;
  let prevLane = LANES[0];

  tree.forEach((root, i) => {
    const prev = mains[i - 1];
    // A main node without topics stacks under the previous one. Topics need room, so the line moves on.
    if (prev && prev.node.children.length > 0) step++;
    const lane = LANES[step % LANES.length];
    const nextLane = LANES[(step + 1) % LANES.length];
    const x = colX(lane);
    const kids = root.children;
    const cut = splitAt(kids);
    const split = kids.length > 1 && stackHeight(kids) > (lane === 1 ? SHORT : SIDE_MAX);
    // A side node has one column beside it. A long list takes both free columns, inside a frame.
    const framed = split && lane !== 1;
    const frameX = colX(lane === 0 ? 1 : 0);
    const frameW = SIZE.col * 2 + SIZE.gapX;
    const innerW = (frameW - SIZE.pad * 2 - FRAME_GAP) / 2;
    const column = (col: number, nodes: StepNode[]): Part => ({ cols: [col], x: colX(col), w: SIZE.col, nodes });
    // The first part always goes on the left, so two stacks read in order
    const parts: Part[] =
      kids.length === 0 ? []
      : framed ? [kids.slice(0, cut), kids.slice(cut)].map((nodes, s) => ({
        cols: lane === 0 ? [1, 2] : [0, 1], x: frameX + SIZE.pad + s * (innerW + FRAME_GAP), w: innerW, nodes,
      }))
      : split ? [column(0, kids.slice(0, cut)), column(2, kids.slice(cut))]
      // A short list of a center node goes opposite to where the line heads next, leaving that column free
      : [column(lane !== 1 ? 1 : nextLane === 0 ? 2 : 0, kids)];
    const heights = parts.map((part) => stackHeight(part.nodes));
    const frameH = framed ? Math.max(...heights) + SIZE.pad * 2 : 0;
    // Height each part keeps clear around the main node's center
    const reserve = heights.map((h) => (framed ? frameH : h));
    const blockH = Math.max(SIZE.main, ...reserve);

    // On a lane change the line runs through a horizontal channel under everything in both lanes,
    // and the whole block of this node starts under the channel. The line never crosses a box.
    const changed = prev !== undefined && lane !== prevLane;
    const channel = changed ? Math.max(bottom[prevLane], bottom[lane]) + SIZE.row / 2 : 0;
    let cy = changed ? channel + SIZE.row / 2 + blockH / 2 : below(lane) + SIZE.main / 2;
    parts.forEach((part, s) => part.cols.forEach((col) => { cy = Math.max(cy, below(col) + reserve[s] / 2); }));

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

    if (framed) {
      frames.push({ x: frameX, y: cy - frameH / 2, w: frameW, h: frameH });
      links.push(lane === 0 ? `M ${x + SIZE.col} ${cy} H ${frameX}` : `M ${x} ${cy} H ${frameX + frameW}`);
    }
    stacks.push(parts.map((part, s) => {
      // Stacks in a frame line up at its top, a lone stack centers on the main node
      const top = framed ? cy - frameH / 2 + SIZE.pad : cy - heights[s] / 2;
      if (!framed) {
        const left = part.x < x;
        const from = left ? x : x + SIZE.col;
        const to = left ? part.x + part.w : part.x;
        const mid = (from + to) / 2;
        let rowTop = top;
        for (const row of rowsOf(part.nodes)) {
          const rowY = rowTop + rowHeight(row) / 2;
          links.push(`M ${from} ${cy} C ${mid} ${cy}, ${mid} ${rowY}, ${to} ${rowY}`);
          rowTop += rowHeight(row) + SIZE.gap;
        }
      }
      part.cols.forEach((col) => { bottom[col] = cy + reserve[s] / 2; });
      return { nodes: part.nodes, x: part.x, y: top, w: part.w, h: heights[s] };
    }));
    prevLane = lane;
  });

  return { width: colX(2) + SIZE.col, height: Math.max(...bottom), mains, stacks, frames, spine, links };
}
