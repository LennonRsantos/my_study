import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Stat {
  label: string;
  value: string;
  sub?: ReactNode;
}

/** A row of headline numbers sharing one surface, split by hairlines. */
export default function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border",
        stats.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="bg-card px-5 py-4">
          <dt className="text-sm text-muted-foreground">{s.label}</dt>
          <dd className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{s.value}</dd>
          {s.sub && <dd className="mt-1 text-xs text-muted-foreground">{s.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Up/down change with icon and sign, so direction never relies on color alone. */
export function Delta({ value, format, suffix }: { value: number; format: (n: number) => string; suffix?: string }) {
  if (Math.abs(value) < 0.01) return <span>Igual {suffix}</span>;
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className={cn("inline-flex items-center font-medium", up ? "text-success" : "text-destructive")}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {up ? "+" : "−"}
        {format(Math.abs(value))}
      </span>
      {suffix && <span className="ml-1">{suffix}</span>}
    </span>
  );
}
