import { Link } from "react-router-dom";
import { CheckCircle2, Plus, Snowflake } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";

interface WeekDay {
  day: string;
  hours: number;
  studied: boolean;
  frozen: boolean;
  isToday: boolean;
  isFuture: boolean;
}

interface TodayPanelProps {
  hoursToday: number;
  goalHours: number;
  progress: number; // 0–100
  streak: number;
  weekStrip: WeekDay[];
  hasAnySession: boolean;
}

export default function TodayPanel({ hoursToday, goalHours, progress, streak, weekStrip, hasAnySession }: TodayPanelProps) {
  const remaining = Math.max(goalHours - hoursToday, 0);
  const goalMet = goalHours > 0 && hoursToday >= goalHours;

  return (
    <section
      aria-label="Resumo de hoje"
      className="grid overflow-hidden rounded-xl border bg-card lg:grid-cols-[3fr_2fr]"
    >
      <div className="p-5 sm:p-7">
        <h2 className="text-sm font-medium text-muted-foreground font-sans">Hoje</h2>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">
            {formatDuration(hoursToday)}
          </span>
          <span className="text-base text-muted-foreground">de {formatDuration(goalHours)} na meta</span>
        </p>

        <div
          role="progressbar"
          aria-label="Progresso da meta diária"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          className="mt-6 h-3 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full origin-left rounded-full bg-primary animate-meter-fill motion-reduce:animate-none"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-3 text-sm text-muted-foreground">
          {goalMet ? (
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
              Meta do dia cumprida
            </p>
          ) : !hasAnySession ? (
            <Link
              to="/sessions"
              className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Registrar primeira sessão
            </Link>
          ) : (
            <p>Faltam {formatDuration(remaining)} para a meta</p>
          )}
        </div>
      </div>

      <div className="border-t p-5 sm:p-7 lg:border-l lg:border-t-0">
        <h2 className="text-sm font-medium text-muted-foreground font-sans">Sequência</h2>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">{streak}</span>
          <span className="text-base text-muted-foreground">{streak === 1 ? "dia seguido" : "dias seguidos"}</span>
        </p>

        <ul className="mt-6 grid grid-cols-7 gap-1.5" aria-label="Esta semana">
          {weekStrip.map((d) => {
            const date = parseISO(d.day);
            const weekday = format(date, "EEEEEE", { locale: ptBR });
            const status = d.isFuture
              ? "ainda não chegou"
              : d.studied
                ? formatDuration(d.hours)
                : d.frozen
                  ? "dia congelado"
                  : "sem estudo";
            return (
              <li
                key={d.day}
                className="flex flex-col items-center gap-1.5"
                aria-label={`${format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}: ${status}`}
              >
                <span
                  className={cn(
                    "text-xs capitalize",
                    d.isToday ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {weekday}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    d.studied && "bg-primary text-primary-foreground",
                    !d.studied && d.frozen && "bg-primary/10 text-primary ring-1 ring-inset ring-primary/50",
                    !d.studied && !d.frozen && !d.isFuture && "bg-muted",
                    d.isFuture && "border border-border",
                    d.isToday && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-card",
                  )}
                >
                  {!d.studied && d.frozen && <Snowflake className="h-3.5 w-3.5" />}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
