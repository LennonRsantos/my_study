import { ReactNode } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDuration } from "@/lib/format";
import { ListCard } from "./bits";

function dayLabel(day: string): string {
  const diff = differenceInCalendarDays(new Date(), parseISO(day));
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  const label = format(parseISO(day), diff < 7 ? "EEEE" : "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface DayGroupedListProps<T> {
  items: T[];
  getDay: (item: T) => string; // YYYY-MM-DD, items already sorted newest first
  getHours: (item: T) => number;
  getKey: (item: T) => string;
  renderRow: (item: T) => ReactNode;
}

/** Rows grouped under day headings ("Hoje", "Ontem", "Segunda-feira"…) with the day's total. */
export default function DayGroupedList<T>({ items, getDay, getHours, getKey, renderRow }: DayGroupedListProps<T>) {
  const groups: { day: string; items: T[] }[] = [];
  for (const item of items) {
    const day = getDay(item);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.day} aria-label={dayLabel(g.day)}>
          <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
            <h2 className="font-sans text-sm font-medium">{dayLabel(g.day)}</h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatDuration(g.items.reduce((a, i) => a + getHours(i), 0))}
            </span>
          </div>
          <ListCard>
            {g.items.map((item) => (
              <li key={getKey(item)}>{renderRow(item)}</li>
            ))}
          </ListCard>
        </section>
      ))}
    </div>
  );
}
