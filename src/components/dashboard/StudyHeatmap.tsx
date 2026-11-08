import { KeyboardEvent, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatDayShort, formatDuration, formatHours } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildHeatmap, HEATMAP_WEEKS, type HeatmapPeriod } from "@/hooks/useStats";
import ChartCard from "./ChartCard";

// One hue, light -> dark (sequential). Level 0 is the empty track.
const LEVEL_CLASS = ["bg-muted", "bg-primary/25", "bg-primary/50", "bg-primary/75", "bg-primary"];
const ROW_LABELS = ["seg", "", "qua", "", "sex", "", ""];

/** Quartile thresholds over the user's own non-zero days, so the scale fits light and heavy studiers alike. */
function thresholds(values: number[]): number[] {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return [Infinity, Infinity, Infinity];
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return [q(0.25), q(0.5), q(0.75)];
}

function levelOf(hours: number, t: number[]): number {
  if (hours <= 0) return 0;
  if (hours < t[0]) return 1;
  if (hours < t[1]) return 2;
  if (hours < t[2]) return 3;
  return 4;
}

interface StudyHeatmapProps {
  hoursByDay: Record<string, number>;
  frozenSet: Set<string>;
  firstYear: number;
  currentStreak: number;
  longestStreak: number;
}

export default function StudyHeatmap({ hoursByDay, frozenSet, firstYear, currentStreak, longestStreak }: StudyHeatmapProps) {
  const [period, setPeriod] = useState<HeatmapPeriod>("recent");
  const { days, weeks } = useMemo(() => buildHeatmap(hoursByDay, frozenSet, period, new Date()), [hoursByDay, frozenSet, period]);
  const firstIndex = days.findIndex(Boolean);
  const lastIndex = days.reduce((acc, d, i) => (d ? i : acc), 0);
  const [hovered, setHovered] = useState<number | null>(null);
  // A click pins the day so touch users can read it; hover and arrows move freely.
  const [pinned, setPinned] = useState<number | null>(null);
  const active = hovered ?? pinned;
  const setActive = setHovered;
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: Math.max(1, thisYear - firstYear + 1) }, (_, i) => thisYear - i);

  const { levels, studiedDays, totalHours, bestDay, monthLabels, monthTable } = useMemo(() => {
    const t = thresholds(days.map((d) => d?.hours ?? 0));
    const levels = days.map((d) => (d ? levelOf(d.hours, t) : -1));

    let bestDay: { day: string; hours: number } | null = null;
    let studiedDays = 0;
    let totalHours = 0;
    for (const d of days) {
      if (!d) continue;
      if (d.hours > 0) studiedDays++;
      totalHours += d.hours;
      if (d.hours > 0 && (!bestDay || d.hours > bestDay.hours)) bestDay = { day: d.day, hours: d.hours };
    }

    // A month label sits over the first week column whose first shown day falls in a new month
    const firstOfWeek = (w: number) => days.slice(w * 7, w * 7 + 7).find(Boolean) ?? null;
    const monthLabels: { col: number; label: string }[] = [];
    for (let w = 0; w < weeks; w++) {
      const first = firstOfWeek(w);
      const month = first ? first.day.slice(0, 7) : null;
      const prev = w > 0 ? firstOfWeek(w - 1)?.day.slice(0, 7) : null;
      if (month && month !== prev) {
        monthLabels.push({ col: w, label: format(parseISO(first!.day), "MMM", { locale: ptBR }) });
      }
    }

    const byMonth = new Map<string, { hours: number; days: number }>();
    days.forEach((d) => {
      if (!d) return;
      const key = d.day.slice(0, 7);
      const m = byMonth.get(key) ?? { hours: 0, days: 0 };
      m.hours += d.hours;
      if (d.hours > 0) m.days++;
      byMonth.set(key, m);
    });
    const monthTable = [...byMonth.entries()].map(([key, m]) => [
      format(parseISO(`${key}-01`), "MMMM yyyy", { locale: ptBR }),
      formatHours(m.hours),
      m.days,
    ]);

    return { levels, studiedDays, totalHours, bestDay, monthLabels, monthTable };
  }, [days, weeks]);

  const focused = active !== null ? days[active] : null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
    if (!(e.key in step)) return;
    e.preventDefault();
    const from = active ?? lastIndex;
    const next = Math.min(Math.max(from + step[e.key], firstIndex), lastIndex);
    setActive(next);
  };

  const elapsed = days.filter(Boolean).length;

  return (
    <ChartCard
      title="Mapa de estudo"
      description={`${period === "recent" ? `Últimas ${HEATMAP_WEEKS} semanas` : `Ano de ${period}`}. Cada quadrado é um dia; quanto mais escuro, mais horas.`}
      action={
        <Select value={String(period)} onValueChange={(v) => { setPinned(null); setPeriod(v === "recent" ? "recent" : Number(v)); }}>
          <SelectTrigger className="h-8 w-44" aria-label="Período do mapa"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Últimas {HEATMAP_WEEKS} semanas</SelectItem>
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      }
      table={{
        caption: "Horas estudadas por mês no período do mapa",
        columns: ["Mês", "Horas", "Dias com estudo"],
        rows: monthTable,
      }}
    >
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          {/* Width cap keeps cells near 28px on wide screens */}
          <div className="grid max-w-[52rem] grid-cols-[auto_1fr] gap-x-2">
            <span aria-hidden />
            <div
              className="relative mb-1.5 h-4 text-xs text-muted-foreground"
              style={{ display: "grid", gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
              aria-hidden
            >
              {monthLabels.map((m) => (
                <span key={m.col} className="whitespace-nowrap" style={{ gridColumnStart: m.col + 1 }}>
                  {m.label}
                </span>
              ))}
            </div>

            <div className="grid grid-rows-7 gap-[3px] text-[11px] leading-none text-muted-foreground" aria-hidden>
              {ROW_LABELS.map((l, i) => (
                <span key={i} className="flex items-center">{l}</span>
              ))}
            </div>

            <div
              role="img"
              tabIndex={0}
              aria-label={`Mapa de estudo: ${studiedDays} dias com estudo e ${formatHours(totalHours)} no período. Use as setas para percorrer os dias.`}
              onKeyDown={onKeyDown}
              onBlur={() => setActive(null)}
              onMouseLeave={() => setActive(null)}
              className="grid grid-flow-col grid-rows-7 gap-[3px] rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card"
              style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
            >
              {days.map((d, i) => (
                <span
                  key={i}
                  onMouseEnter={() => d && setActive(i)}
                  onClick={() => d && setPinned((p) => (p === i ? null : i))}
                  className={cn(
                    "aspect-square rounded-[3px]",
                    d ? LEVEL_CLASS[levels[i]] : "bg-transparent",
                    d?.frozen && d.hours === 0 && "ring-1 ring-inset ring-primary/60",
                    active === i && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex max-w-[52rem] flex-wrap items-center justify-between gap-x-6 gap-y-3 pl-8 text-xs text-muted-foreground">
            <p aria-live="polite" className="min-h-4 tabular-nums">
              {focused
                ? `${formatDayShort(parseISO(focused.day))}: ${
                    focused.hours > 0 ? formatDuration(focused.hours) : focused.frozen ? "dia congelado" : "sem estudo"
                  }`
                : "Passe o mouse, toque ou use as setas para ver cada dia"}
            </p>
            <div className="flex items-center gap-4" aria-hidden>
              <span className="flex items-center gap-1.5">
                Menos
                {LEVEL_CLASS.map((c) => (
                  <span key={c} className={cn("h-3 w-3 rounded-[3px]", c)} />
                ))}
                Mais
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-[3px] bg-muted ring-1 ring-inset ring-primary/60" />
                Congelado
              </span>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4 xl:w-48 xl:grid-cols-1 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <div>
            <dt className="text-xs text-muted-foreground">Dias com estudo</dt>
            <dd className="mt-0.5 font-display text-xl font-semibold">
              {studiedDays}
              <span className="ml-1 text-sm font-normal text-muted-foreground">de {elapsed}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Sequência atual</dt>
            <dd className="mt-0.5 font-display text-xl font-semibold">
              {currentStreak}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{currentStreak === 1 ? "dia" : "dias"}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Maior sequência histórica</dt>
            <dd className="mt-0.5 font-display text-xl font-semibold">
              {longestStreak}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{longestStreak === 1 ? "dia" : "dias"}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Dia mais forte</dt>
            <dd className="mt-0.5 font-display text-xl font-semibold">
              {bestDay ? formatDuration(bestDay.hours) : "—"}
            </dd>
            {bestDay && (
              <dd className="text-xs text-muted-foreground">{format(parseISO(bestDay.day), "d 'de' MMM", { locale: ptBR })}</dd>
            )}
          </div>
        </dl>
      </div>
    </ChartCard>
  );
}
