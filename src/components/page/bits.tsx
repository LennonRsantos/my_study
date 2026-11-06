import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/format";

/** The entity's own color (subject, course, category) as a small dot. Decorative: the name next to it carries meaning. */
export function ColorDot({ color, className }: { color?: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/40", className)}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

/** Rounded square with the entity's color and its initial. */
export function ColorAvatar({ color, name, className }: { color?: string | null; name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-display text-base font-semibold text-white",
        className,
      )}
      style={{ backgroundColor: color || "hsl(var(--muted-foreground))" }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/** "12,5 h de 40 h" with a bar. `label` names the bar for screen readers. */
export function HoursProgress({
  done, target, label, doneSuffix, className,
}: { done: number; target: number; label: string; doneSuffix?: string; className?: string }) {
  const pct = target > 0 ? Math.min((done / target) * 100, 100) : 0;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="tabular-nums">
          <span className="font-medium">{formatHours(done)}</span>
          <span className="text-muted-foreground"> de {formatHours(target)}{doneSuffix}</span>
        </span>
        <span className="tabular-nums text-muted-foreground">{Math.round(pct)}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function LoadingState({ text = "Carregando…" }: { text?: string }) {
  return (
    <p role="status" aria-live="polite" className="py-16 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

/** Bordered surface that holds a list of rows separated by hairlines. */
export function ListCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("divide-y overflow-hidden rounded-xl border bg-card", className)}>{children}</ul>;
}
