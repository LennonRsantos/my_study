import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useStudy } from "@/contexts/StudyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useStats } from "@/hooks/useStats";
import { usePracticeStats } from "@/hooks/usePracticeStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChartCard from "@/components/dashboard/ChartCard";
import ChartTooltip from "@/components/dashboard/ChartTooltip";
import { axisTick, gridStroke, hourTick } from "@/components/dashboard/chartStyle";
import RankedBars from "@/components/dashboard/RankedBars";
import StatRow, { Delta } from "@/components/page/StatRow";
import StudyHeatmap from "@/components/dashboard/StudyHeatmap";
import TodayPanel from "@/components/dashboard/TodayPanel";
import CoursesDashboard from "@/components/dashboard/CoursesDashboard";
import ActiveCoursesCard from "@/components/dashboard/ActiveCoursesCard";
import { useCourseInsights, type CourseInsights } from "@/hooks/useCourseInsights";
import EmptyState from "@/components/page/EmptyState";
import { linkClass } from "@/components/page/styles";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PRACTICE_TYPE_LABELS } from "@/lib/types";
import { formatDayLong, formatDuration, formatHours, greeting } from "@/lib/format";

// Monday-first, matching the rest of the app (weekStartsOn: 1)
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const WEEKDAY_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// Tab value -> ?aba= value in the URL ("general" has none)
const TAB_PARAM: Record<string, string> = { practice: "praticas", courses: "cursos" };
const PARAM_TAB: Record<string, string> = { praticas: "practice", cursos: "courses" };


export default function Dashboard() {
  const { goal, goals, sessions, subjects, practiceSessions } = useStudy();
  const { user } = useAuth();
  const stats = useStats();
  const practice = usePracticeStats();
  const courses = useCourseInsights();
  const [params, setParams] = useSearchParams();
  const tab = PARAM_TAB[params.get("aba") ?? ""] ?? "general";

  const now = new Date();
  const firstName = (user?.user_metadata?.display_name || user?.email?.split("@")[0] || "").split(" ")[0];
  const dateLine = formatDayLong(now);

  return (
    <AppLayout>
      <div className="space-y-6">
        <Tabs
          value={tab}
          onValueChange={(v) => setParams(TAB_PARAM[v] ? { aba: TAB_PARAM[v] } : {}, { replace: true })}
          className="space-y-6"
        >
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {greeting(now)}
                {firstName && `, ${firstName}`}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {dateLine.charAt(0).toUpperCase() + dateLine.slice(1)}
              </p>
            </div>
            <TabsList className="self-start sm:self-auto">
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="practice">Práticas</TabsTrigger>
              <TabsTrigger value="courses">Cursos</TabsTrigger>
            </TabsList>
          </header>

          <TabsContent value="general" className="mt-0 space-y-6">
            <GeneralDashboard
              stats={stats}
              goalHours={goal.hoursPerDay}
              goals={goals}
              hasAnySession={sessions.length + practiceSessions.length > 0}
              courses={courses}
            />
          </TabsContent>

          <TabsContent value="practice" className="mt-0 space-y-6">
            <PracticeDashboard practice={practice} subjects={subjects} />
          </TabsContent>

          <TabsContent value="courses" className="mt-0 space-y-6">
            <CoursesDashboard insights={courses} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function GeneralDashboard({
  stats, goalHours, goals, hasAnySession, courses,
}: {
  stats: ReturnType<typeof useStats>;
  goalHours: number;
  goals: ReturnType<typeof useStudy>["goals"];
  hasAnySession: boolean;
  courses: CourseInsights;
}) {
  const weekDiff = stats.hoursWeek - stats.hoursPrevWeek;

  const weekdayData = useMemo(() => {
    const best = Math.max(...stats.weekdayHours);
    return WEEKDAY_ORDER.map((i) => ({
      name: WEEKDAY_SHORT[i],
      tooltipLabel: WEEKDAY_LONG[i],
      hours: stats.weekdayHours[i],
      best: best > 0 && stats.weekdayHours[i] === best,
    }));
  }, [stats.weekdayHours]);

  const total30 = stats.dailyEvolution.reduce((a, d) => a + d.hours, 0);
  const daysOnGoal = stats.dailyEvolution.filter((d) => goalHours > 0 && d.hours >= goalHours).length;

  return (
    <>
      <TodayPanel
        hoursToday={stats.hoursToday}
        goalHours={goalHours}
        progress={stats.goalProgress}
        streak={stats.streak}
        weekStrip={stats.weekStrip}
        hasAnySession={hasAnySession}
      />

      <StatRow
        stats={[
          {
            label: "Esta semana",
            value: formatHours(stats.hoursWeek),
            sub: <Delta value={weekDiff} format={formatDuration} suffix="vs. semana passada" />,
          },
          {
            label: "Este mês",
            value: formatHours(stats.hoursMonth),
            sub: `${stats.monthDaysStudied} ${stats.monthDaysStudied === 1 ? "dia" : "dias"} com estudo`,
          },
          { label: "Total", value: formatHours(stats.hoursTotal), sub: "Desde o primeiro registro" },
          { label: "Média por dia estudado", value: formatDuration(stats.avgHoursPerDay) },
        ]}
      />

      <StudyHeatmap
        hoursByDay={stats.hoursByDay}
        frozenSet={stats.frozenSet}
        firstYear={stats.firstYear}
        currentStreak={stats.streak}
        longestStreak={stats.longestStreak}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <ChartCard
          className="lg:col-span-3"
          title="Últimos 30 dias"
          description={
            goalHours > 0
              ? `${formatHours(total30)} no período. Meta atingida em ${daysOnGoal} ${daysOnGoal === 1 ? "dia" : "dias"}.`
              : `${formatHours(total30)} no período.`
          }
          table={{
            caption: "Horas estudadas por dia nos últimos 30 dias",
            columns: ["Dia", "Tempo"],
            rows: stats.dailyEvolution.map((d) => [d.date, formatDuration(d.hours)]),
          }}
        >
          <DailyAreaChart data={stats.dailyEvolution} goalHours={goalHours} />
        </ChartCard>

        <ChartCard
          className="lg:col-span-2"
          title="Por dia da semana"
          description="Total de horas em cada dia, desde o início."
          table={{
            caption: "Horas totais por dia da semana",
            columns: ["Dia", "Tempo"],
            rows: weekdayData.map((d) => [d.tooltipLabel, formatDuration(d.hours)]),
          }}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weekdayData} margin={{ top: 4, right: 0, bottom: 0, left: -12 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={gridStroke} />
              <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={hourTick} allowDecimals={false} width={44} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }} />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {weekdayData.map((d) => (
                  <Cell key={d.name} fill="hsl(var(--primary))" fillOpacity={d.best ? 1 : 0.4} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ActiveCoursesCard insights={courses} />

      <div className="grid gap-6 lg:grid-cols-5">
        <ChartCard
          className="lg:col-span-3"
          title="Matérias"
          description="Onde seu tempo foi, desde o início."
          action={<Link to="/subjects" className={linkClass}>Ver matérias</Link>}
        >
          {stats.subjectRanking.length > 0 ? (
            <RankedBars
              items={stats.subjectRanking.map((r) => ({
                id: r.subject!.id,
                label: r.subject!.name,
                value: r.hours,
                color: r.subject!.color,
              }))}
            />
          ) : (
            <EmptyState text="Registre sessões com uma matéria para ver a divisão do seu tempo." action={{ to: "/sessions", label: "Registrar sessão" }} />
          )}
        </ChartCard>

        <GoalsCard goals={goals} className="lg:col-span-2" />
      </div>
    </>
  );
}

function DailyAreaChart({ data, goalHours }: { data: { date: string; day?: string; hours: number }[]; goalHours?: number }) {
  const showGoal = !!goalHours && goalHours > 0;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={gridStroke} />
        <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} interval={6} />
        <YAxis
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          tickFormatter={hourTick}
          allowDecimals={false}
          width={44}
          domain={[0, (max: number) => Math.ceil(Math.max(max, showGoal ? goalHours! : 0, 1))]}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--chart-axis))", strokeWidth: 1 }} />
        {showGoal && (
          <ReferenceLine
            y={goalHours}
            stroke="hsl(var(--chart-axis))"
            strokeOpacity={0.6}
            label={{ value: "meta", position: "insideTopRight", fill: "hsl(var(--chart-axis))", fontSize: 11 }}
          />
        )}
        <Area
          type="monotone"
          dataKey="hours"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="hsl(var(--primary))"
          fillOpacity={0.12}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function GoalsCard({ goals, className }: { goals: ReturnType<typeof useStudy>["goals"]; className?: string }) {
  const today = new Date();
  const active = goals.filter((g) => !g.completed);
  const completed = goals.filter((g) => g.completed);
  const rewards = completed.filter((g) => g.reward).length;
  const upcoming = active
    .map((g) => ({ goal: g, daysLeft: differenceInCalendarDays(parseISO(g.endDate), today) }))
    .filter((x) => x.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  return (
    <ChartCard
      className={className}
      title="Metas"
      action={<Link to="/goals" className={linkClass}>Ver metas</Link>}
    >
      {goals.length === 0 ? (
        <EmptyState text="Defina uma meta de horas para a semana ou o mês." action={{ to: "/goals", label: "Criar meta" }} />
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-4">
            {[
              { label: "Ativas", value: active.length },
              { label: "Concluídas", value: completed.length },
              { label: "Prêmios", value: rewards },
            ].map((s) => (
              <div key={s.label}>
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="mt-0.5 font-display text-2xl font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-6 font-sans text-sm font-medium text-muted-foreground">Próximas a vencer</h3>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nenhuma meta ativa com prazo pela frente.</p>
          ) : (
            <ul className="mt-2 divide-y">
              {upcoming.map(({ goal, daysLeft }) => (
                <li key={goal.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="truncate font-medium">{goal.title}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {daysLeft === 0 ? "vence hoje" : daysLeft === 1 ? "vence amanhã" : `em ${daysLeft} dias`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </ChartCard>
  );
}

function PracticeDashboard({ practice, subjects }: { practice: ReturnType<typeof usePracticeStats>; subjects: ReturnType<typeof useStudy>["subjects"] }) {
  return (
    <>
      <StatRow
        stats={[
          { label: "Práticas registradas", value: `${practice.total}`, sub: `${practice.countMonth} este mês` },
          { label: "Tempo total", value: formatHours(practice.totalHours), sub: `${formatDuration(practice.hoursMonth)} este mês` },
          { label: "Duração média", value: formatDuration(practice.avgDuration), sub: "Por sessão" },
          {
            label: "Esta semana",
            value: formatDuration(practice.hoursWeek),
            sub: `${practice.countWeek} ${practice.countWeek === 1 ? "sessão" : "sessões"}`,
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <ChartCard
          className="lg:col-span-3"
          title="Últimas 12 semanas"
          description="Horas de prática por semana (início na segunda)."
          table={{
            caption: "Horas de prática por semana",
            columns: ["Semana de", "Tempo"],
            rows: practice.weeklyEvolution.map((w) => [w.week, formatDuration(w.hours)]),
          }}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={practice.weeklyEvolution.map((w) => ({ ...w, tooltipLabel: `Semana de ${w.week}` }))}
              margin={{ top: 4, right: 0, bottom: 0, left: -12 }}
              barCategoryGap="28%"
            >
              <CartesianGrid vertical={false} stroke={gridStroke} />
              <XAxis dataKey="week" tick={axisTick} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={hourTick} allowDecimals={false} width={44} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }} />
              <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard className="lg:col-span-2" title="Por tipo" description="Tempo total em cada tipo de prática.">
          {practice.typeBreakdown.length > 0 ? (
            <RankedBars items={practice.typeBreakdown.map((t) => ({ id: t.type, label: t.label, value: t.hours }))} />
          ) : (
            <EmptyState text="Nenhuma prática registrada ainda." action={{ to: "/sessions", label: "Registrar prática" }} />
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Últimos 30 dias"
        description={`${formatHours(practice.dailyEvolution.reduce((a, d) => a + d.hours, 0))} de prática no período.`}
        table={{
          caption: "Horas de prática por dia nos últimos 30 dias",
          columns: ["Dia", "Tempo"],
          rows: practice.dailyEvolution.map((d) => [d.date, formatDuration(d.hours)]),
        }}
      >
        <DailyAreaChart data={practice.dailyEvolution} />
      </ChartCard>

      <ChartCard title="Práticas recentes">
        {practice.recent.length === 0 ? (
          <EmptyState text="Suas últimas sessões práticas aparecem aqui." action={{ to: "/sessions", label: "Registrar prática" }} />
        ) : (
          <ul className="divide-y">
            {practice.recent.map((p) => {
              const sub = p.subjectId ? subjects.find((s) => s.id === p.subjectId) : null;
              return (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{PRACTICE_TYPE_LABELS[p.practiceType]}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {sub && (
                        <>
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: sub.color }} aria-hidden />
                          <span className="truncate">{sub.name}</span>
                          <span aria-hidden>·</span>
                        </>
                      )}
                      <span className="shrink-0">{format(parseISO(p.date), "d 'de' MMM", { locale: ptBR })}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{formatDuration(p.hours)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </ChartCard>
    </>
  );
}
