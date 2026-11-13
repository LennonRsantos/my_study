import { CSSProperties, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { STEP_STATUS_LABELS, StepNode, effectiveStatus, isLocked, nodeLeaves } from "@/lib/learningPath";
import { Rect, SIZE, layoutRoadmap, rowsOf } from "@/lib/roadmapLayout";

interface NodeActions {
  onOpen: (node: StepNode) => void;
  onToggle: (node: StepNode, completed: boolean) => void;
}

const LEVEL_TEXT = ["text-sm font-semibold", "text-sm font-medium", "text-xs"];
const LEVEL_COLOR = ["bg-yellow-300", "bg-amber-200", "bg-amber-100"];

/** One box of the roadmap: check it to complete, click its name to open details. A chip is the half-width form. */
function NodeCard({ node, level, chip, onOpen, onToggle }: NodeActions & { node: StepNode; level: number; chip?: boolean }) {
  const status = effectiveStatus(node);
  const locked = isLocked(node);
  const leaves = nodeLeaves(node);
  const done = leaves.filter((n) => n.status === "completed").length;
  const depth = Math.min(level, 2);

  return (
    <div
      // The layout math assumes these exact heights
      style={{ height: level === 0 ? SIZE.main : SIZE.card }}
      className={cn(
        "flex items-center rounded-md border-2 border-black text-black transition-shadow hover:shadow-md",
        chip ? "gap-1.5 px-1.5 text-xs" : cn("gap-2 px-2.5", LEVEL_TEXT[depth]),
        status === "completed" ? "bg-success text-success-foreground" : LEVEL_COLOR[depth],
        status === "in_progress" && "ring-2 ring-primary ring-offset-2 ring-offset-card",
      )}
    >
      <Checkbox
        checked={status === "completed"}
        disabled={locked && status === "completed"}
        onCheckedChange={(c) => onToggle(node, c === true)}
        aria-label={`Marcar ${node.name} como concluído`}
        title={locked ? "Concluído pelas horas ou pelo módulo do curso" : undefined}
        className={cn(
          "shrink-0 border-black bg-white/70 data-[state=checked]:bg-black data-[state=checked]:text-white",
          chip ? "h-4 w-4" : "h-5 w-5",
        )}
      />
      <button
        type="button"
        onClick={() => onOpen(node)}
        title={node.name}
        aria-label={`${node.name}, ${STEP_STATUS_LABELS[status]}. Abrir detalhes`}
        className="min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-black"
      >
        <span className="line-clamp-2 break-words leading-tight">{node.name}</span>
      </button>
      {node.children.length > 0 && (
        <span className="shrink-0 text-xs font-normal tabular-nums">{done}/{leaves.length}</span>
      )}
    </div>
  );
}

/** A topic list: two short leaves share a row, anything else takes the whole row. Same rows as the layout math. */
function TopicRows({ nodes, level, className, style, ...actions }: NodeActions & {
  nodes: StepNode[];
  level: number;
  className?: string;
  style?: CSSProperties;
}) {
  const paired = new Set(rowsOf(nodes).filter((row) => row.length === 2).flat());
  return (
    <ul className={cn("grid grid-cols-2", className)} style={{ gap: SIZE.gap, ...style }}>
      {nodes.map((node) => (
        <li key={node.id} className={cn("min-w-0", !paired.has(node) && "col-span-2")}>
          {node.children.length === 0 ? (
            <NodeCard node={node} level={level} chip={paired.has(node)} {...actions} />
          ) : (
            // A group box: the topic's own card on top, its children inside. The 2px border is part of SIZE.pad.
            <div
              className="flex flex-col rounded-md border-2 border-foreground/70 bg-background"
              style={{ padding: SIZE.pad - 2, gap: SIZE.gap }}
            >
              <NodeCard node={node} level={level} {...actions} />
              <TopicRows nodes={node.children} level={level + 1} {...actions} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

const at = (rect: Rect) => ({ left: rect.x, top: rect.y, width: rect.w });

/**
 * Main nodes follow a line that snakes across three columns, topics fill the columns beside them.
 * The canvas has a fixed width, so narrow screens scroll it sideways.
 */
export default function RoadmapView({ tree, onOpen, onToggle }: NodeActions & { tree: StepNode[] }) {
  const actions = { onOpen, onToggle };
  const layout = useMemo(() => layoutRoadmap(tree), [tree]);
  return (
    <div className="overflow-x-auto rounded-xl border bg-card p-4 sm:p-6">
      <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
        <svg aria-hidden className="pointer-events-none absolute inset-0" width={layout.width} height={layout.height} fill="none">
          {layout.links.map((d, i) => (
            <path key={i} d={d} className="stroke-blue-500" strokeWidth={2.5} strokeDasharray="0.1 7" strokeLinecap="round" />
          ))}
          {layout.spine.map((d, i) => (
            <path key={i} d={d} className="stroke-blue-500" strokeWidth={3} strokeLinecap="round" />
          ))}
        </svg>
        {layout.frames.map((frame, i) => (
          <div
            key={i}
            aria-hidden
            className="absolute rounded-lg border border-foreground/40 bg-muted/30"
            style={{ ...at(frame), height: frame.h }}
          />
        ))}
        {/* Boxes are placed against the canvas, but the lists keep data order for keyboard and screen readers */}
        <ol aria-label="Etapas da trilha">
          {layout.mains.map((main, i) => (
            <li key={main.node.id}>
              <div className="absolute" style={at(main)}>
                <NodeCard node={main.node} level={0} {...actions} />
              </div>
              {layout.stacks[i].map((stack) => (
                <TopicRows key={stack.nodes[0].id} nodes={stack.nodes} level={1} className="absolute" style={at(stack)} {...actions} />
              ))}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
