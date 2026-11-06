import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { STEP_STATUS_LABELS, StepNode, effectiveStatus, isLocked, nodeLeaves } from "@/lib/learningPath";

interface NodeActions {
  onOpen: (node: StepNode) => void;
  onToggle: (node: StepNode, completed: boolean) => void;
}

const LEVEL_STYLE = [
  "bg-yellow-300 font-semibold min-h-11",
  "bg-amber-200 text-sm font-medium",
  "bg-amber-100 text-xs",
];

/** One box of the roadmap: check it to complete, click its name to open details. */
function NodeCard({ node, level, onOpen, onToggle }: NodeActions & { node: StepNode; level: number }) {
  const status = effectiveStatus(node);
  const locked = isLocked(node);
  const leaves = nodeLeaves(node);
  const done = leaves.filter((n) => n.status === "completed").length;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border-2 border-black px-2.5 py-1.5 text-black transition-shadow hover:shadow-md",
        status === "completed" ? "bg-success text-success-foreground" : LEVEL_STYLE[level],
        status === "completed" && level === 0 && "min-h-11 font-semibold",
        status === "in_progress" && "ring-2 ring-primary ring-offset-2 ring-offset-card",
      )}
    >
      <Checkbox
        checked={status === "completed"}
        disabled={locked && status === "completed"}
        onCheckedChange={(c) => onToggle(node, c === true)}
        aria-label={`Marcar ${node.name} como concluído`}
        title={locked ? "Concluído pelas horas ou pelo módulo do curso" : undefined}
        className="h-5 w-5 shrink-0 border-black bg-white/70 data-[state=checked]:bg-black data-[state=checked]:text-white"
      />
      <button
        type="button"
        onClick={() => onOpen(node)}
        aria-label={`${node.name}, ${STEP_STATUS_LABELS[status]}. Abrir detalhes`}
        className="min-w-0 flex-1 break-words rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-black"
      >
        {node.name}
      </button>
      {node.children.length > 0 && (
        <span className="shrink-0 text-xs font-normal tabular-nums">{done}/{leaves.length}</span>
      )}
    </div>
  );
}

function TopicList({ nodes, level, ...actions }: NodeActions & { nodes: StepNode[]; level: number }) {
  return (
    <ul className={cn("space-y-1.5", level > 1 && "ml-4 mt-1.5")}>
      {nodes.map((node) => (
        <li key={node.id} className="relative">
          {level === 1 && (
            <span aria-hidden className="roadmap-stub absolute top-5 hidden w-6 border-t-2 border-dotted border-blue-500 md:block" />
          )}
          <NodeCard node={node} level={level} {...actions} />
          {node.children.length > 0 && <TopicList nodes={node.children} level={level + 1} {...actions} />}
        </li>
      ))}
    </ul>
  );
}

/** Dotted bracket that ties a list of topics to the main node beside it. */
function TopicColumn({ nodes, side, ...actions }: NodeActions & { nodes: StepNode[]; side: "left" | "right" }) {
  if (nodes.length === 0) return null;
  return (
    <div
      className={cn(
        "relative ml-12 mt-2 border-l-2 border-dotted border-blue-500 pl-3 md:row-start-1 md:ml-0 md:mt-0 md:self-center",
        side === "right"
          ? "md:col-start-3 md:pl-6 [&_.roadmap-stub]:-left-6"
          : "md:col-start-1 md:border-l-0 md:border-r-2 md:pl-0 md:pr-6 [&_.roadmap-stub]:-right-6",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 hidden w-6 border-t-2 border-dotted border-blue-500 md:block",
          side === "right" ? "-left-6" : "-right-6",
        )}
      />
      <TopicList nodes={nodes} level={1} {...actions} />
    </div>
  );
}

/**
 * Main nodes run down a central line with their topics beside them.
 * Long topic lists split across both sides. On phones everything stacks under the line's left edge.
 */
export default function RoadmapView({ tree, onOpen, onToggle }: NodeActions & { tree: StepNode[] }) {
  const actions = { onOpen, onToggle };
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 sm:p-6">
      <span aria-hidden className="absolute bottom-0 left-8 top-0 w-0.5 bg-blue-500 md:left-1/2 md:-translate-x-1/2" />
      <ol className="relative space-y-8" aria-label="Etapas da trilha">
        {tree.map((root, i) => {
          const split = root.children.length > 5;
          const half = Math.ceil(root.children.length / 2);
          const onRight = i % 2 === 0;
          const right = split ? root.children.slice(0, half) : onRight ? root.children : [];
          const left = split ? root.children.slice(half) : onRight ? [] : root.children;
          return (
            <li key={root.id} className="md:grid md:grid-cols-[minmax(0,1fr)_14rem_minmax(0,1fr)] md:items-center md:gap-x-6">
              <div className="relative z-10 ml-8 md:col-start-2 md:row-start-1 md:ml-0">
                <NodeCard node={root} level={0} {...actions} />
              </div>
              <TopicColumn nodes={right} side="right" {...actions} />
              <TopicColumn nodes={left} side="left" {...actions} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
