import type { TooltipProps } from "recharts";
import { parseISO } from "date-fns";
import { formatDayShort, formatDuration } from "@/lib/format";

/** Recharts tooltip in the app's popover style. Uses `payload.day` (YYYY-MM-DD) or `payload.tooltipLabel` when present. */
export default function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const data = point.payload as { day?: string; tooltipLabel?: string };
  const title = data.day ? formatDayShort(parseISO(data.day)) : data.tooltipLabel ?? label;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-sm font-semibold tabular-nums">{formatDuration(Number(point.value) || 0)}</p>
    </div>
  );
}

