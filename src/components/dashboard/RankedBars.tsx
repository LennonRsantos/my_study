import { formatDuration, formatPercent } from "@/lib/format";

export interface RankedItem {
  id: string;
  label: string;
  value: number;
  /** Identity color (e.g. the subject's own color), shown as a dot — bars stay one hue. */
  color?: string;
}

const MAX_ROWS = 8;

export default function RankedBars({ items }: { items: RankedItem[] }) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const rows =
    sorted.length > MAX_ROWS
      ? [
          ...sorted.slice(0, MAX_ROWS - 1),
          {
            id: "__other__",
            label: `Outras (${sorted.length - MAX_ROWS + 1})`,
            value: sorted.slice(MAX_ROWS - 1).reduce((a, x) => a + x.value, 0),
          },
        ]
      : sorted;
  const total = rows.reduce((a, x) => a + x.value, 0);
  const max = rows[0]?.value || 0;

  return (
    <ol className="space-y-4">
      {rows.map((r) => (
        <li key={r.id}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/40"
                style={r.color ? { backgroundColor: r.color } : undefined}
                aria-hidden
              />
              <span className="truncate font-medium">{r.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatDuration(r.value)}
              <span className="ml-3 inline-block w-9 text-right">{formatPercent(total > 0 ? r.value / total : 0)}</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${max > 0 ? Math.max((r.value / max) * 100, 2) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
