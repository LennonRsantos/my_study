import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, PlayCircle } from "lucide-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CourseInsight, CourseInsights } from "@/hooks/useCourseInsights";
import { COURSE_WEEKS } from "@/hooks/useCourseInsights";
import StatRow from "@/components/page/StatRow";
import EmptyState from "@/components/page/EmptyState";
import { ColorDot, HoursProgress, ListCard, LoadingState } from "@/components/page/bits";
import { linkClass } from "@/components/page/styles";
import { formatDuration, formatHours } from "@/lib/format";
import ChartCard from "./ChartCard";
import ChartTooltip from "./ChartTooltip";
import RankedBars from "./RankedBars";
import { axisTick, gridStroke, hourTick } from "./chartStyle";

function relativeDay(day: string): string {
  const diff = differenceInCalendarDays(new Date(), parseISO(day));
  if (diff <= 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return `Há ${diff} dias`;
}

function Fact({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 truncate font-display text-xl font-semibold tabular-nums">{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}

function CourseInsightCard({ insight }: { insight: CourseInsight }) {
  const { course, source } = insight;
  return (
    <article className="rounded-xl border bg-card p-5 sm:p-6">
      <header className="flex items-start gap-4">
        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: course.color }}>
          <GraduationCap className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{course.name}</h3>
          {course.description && <p className="mt-0.5 text-sm text-muted-foreground">{course.description}</p>}
        </div>
        <Link to="/courses" className={linkClass}>Abrir curso</Link>
      </header>

      <div className="mt-5 sm:pl-[60px]">
        {insight.totalHours > 0 ? (
          <HoursProgress
            done={insight.dedicatedHours}
            target={insight.totalHours}
            doneSuffix={source === "modules" ? " concluídas" : undefined}
            label={`Progresso do curso ${course.name}`}
          />
        ) : (
          <p className="text-sm tabular-nums text-muted-foreground">{formatHours(insight.dedicatedHours)} dedicadas</p>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          <Fact
            label="Tempo dedicado"
            value={formatHours(insight.dedicatedHours)}
            sub={
              source === "modules"
                ? insight.sessionHours > 0
                  ? `Módulos, mais ${formatHours(insight.sessionHours)} em sessões`
                  : "Em módulos concluídos"
                : "Em sessões"
            }
          />
          {insight.modulesTotal > 0 && (
            <Fact label="Módulos" value={insight.modulesDone} sub={`de ${insight.modulesTotal}`} />
          )}
          {insight.lessonsTotal > 0 && (
            <Fact label="Aulas assistidas" value={insight.lessonsDone} sub={`de ${insight.lessonsTotal}`} />
          )}
          {insight.topSubject && (
            <Fact
              label="Matéria principal"
              value={
                <>
                  <ColorDot color={insight.topSubject.color} />
                  <span className="truncate">{insight.topSubject.label}</span>
                </>
              }
              sub={formatHours(insight.topSubject.value)}
            />
          )}
          {insight.pacePerWeek > 0 && (
            <Fact label="Ritmo" value={formatHours(insight.pacePerWeek)} sub="Por semana, últimas 4 semanas" />
          )}
          {insight.eta ? (
            <Fact label="Previsão de término" value={format(insight.eta, "d 'de' MMM", { locale: ptBR })} sub="Mantendo o ritmo" />
          ) : (
            insight.lastActivity && <Fact label="Última atividade" value={relativeDay(insight.lastActivity)} />
          )}
        </dl>

        {insight.nextModule && (
          <p className="mt-6 flex min-w-0 items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
            <PlayCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="shrink-0 text-muted-foreground">Próximo módulo:</span>
            <span className="truncate font-medium">{insight.nextModule.name}</span>
            {(insight.nextModule.duration_minutes ?? 0) > 0 && (
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatDuration((insight.nextModule.duration_minutes ?? 0) / 60)}
              </span>
            )}
          </p>
        )}

        {insight.subjects.length > 1 && (
          <div className="mt-6">
            <h4 className="mb-3 font-sans text-sm font-medium text-muted-foreground">Tempo por matéria</h4>
            <RankedBars items={insight.subjects} />
          </div>
        )}
      </div>
    </article>
  );
}

export default function CoursesDashboard({ insights }: { insights: CourseInsights }) {
  if (insights.loading) return <LoadingState />;

  if (insights.courses.length === 0) {
    return (
      <EmptyState
        framed
        title="Nenhum curso ainda"
        text="Crie um curso e divida em módulos. O tempo, as aulas e o ritmo de cada curso aparecem aqui."
        action={{ to: "/courses", label: "Criar curso" }}
      />
    );
  }

  const { totals } = insights;
  const weeklyTotal = insights.weekly.reduce((a, w) => a + w.hours, 0);

  return (
    <>
      <StatRow
        stats={[
          { label: "Em andamento", value: String(insights.active.length) },
          { label: "Concluídos", value: String(insights.completed.length) },
          { label: "Tempo dedicado", value: formatHours(totals.dedicatedHours), sub: "Somando todos os cursos" },
          {
            label: "Aulas assistidas",
            value: String(totals.lessonsDone),
            sub: totals.lessonsTotal > 0 ? `de ${totals.lessonsTotal}` : undefined,
          },
        ]}
      />

      {insights.active.length > 0 && (
        <section aria-label="Cursos em andamento" className="space-y-4">
          {insights.active.map((i) => <CourseInsightCard key={i.course.id} insight={i} />)}
        </section>
      )}

      <ChartCard
        title="Tempo dedicado por semana"
        description={`Últimas ${COURSE_WEEKS} semanas, pela data em que os módulos foram concluídos ou as sessões registradas.`}
        table={{
          caption: "Horas dedicadas aos cursos por semana",
          columns: ["Semana de", "Tempo"],
          rows: insights.weekly.map((w) => [w.week, formatDuration(w.hours)]),
        }}
      >
        {weeklyTotal > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={insights.weekly} margin={{ top: 4, right: 0, bottom: 0, left: -12 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={gridStroke} />
              <XAxis dataKey="week" tick={axisTick} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={hourTick} allowDecimals={false} width={44} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }} />
              <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState text="Marque módulos como concluídos ou registre sessões num curso para ver o ritmo semanal." />
        )}
      </ChartCard>

      {insights.completed.length > 0 && (
        <section aria-labelledby="completed-courses">
          <h2 id="completed-courses" className="mb-3 px-1 font-sans text-sm font-medium">Concluídos</h2>
          <ListCard>
            {insights.completed.map((i) => (
              <li key={i.course.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                <ColorDot color={i.course.color} className="h-3 w-3" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.course.name}</p>
                  {i.course.completedAt && (
                    <p className="text-xs text-muted-foreground">
                      Concluído em {format(parseISO(i.course.completedAt), "d 'de' MMM yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-right text-sm tabular-nums">
                  {formatHours(i.dedicatedHours)}
                  {i.lessonsTotal > 0 && <span className="block text-xs text-muted-foreground">{i.lessonsDone} aulas</span>}
                </span>
              </li>
            ))}
          </ListCard>
        </section>
      )}
    </>
  );
}
