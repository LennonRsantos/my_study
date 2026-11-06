import AppLayout from "@/components/AppLayout";
import { useParams } from "react-router-dom";
import { useLanguages, useLanguageData, LANGUAGE_LEVEL_LABELS, LangSubject, LangCourse, LangSession } from "@/hooks/useLanguages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SUBJECT_COLORS } from "@/lib/types";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import RowActions from "@/components/page/RowActions";
import StatRow, { Delta } from "@/components/page/StatRow";
import ColorSwatchPicker from "@/components/page/ColorSwatchPicker";
import DayGroupedList from "@/components/page/DayGroupedList";
import { ColorAvatar, ColorDot, HoursProgress, LoadingState } from "@/components/page/bits";
import ChartCard from "@/components/dashboard/ChartCard";
import ChartTooltip from "@/components/dashboard/ChartTooltip";
import RankedBars from "@/components/dashboard/RankedBars";
import { axisTick, gridStroke, hourTick } from "@/components/dashboard/chartStyle";
import { formatDuration, formatHours } from "@/lib/format";

export default function LanguageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { languages, loading: lLoading } = useLanguages();
  const data = useLanguageData(id);
  const lang = languages.find((l) => l.id === id);

  if (lLoading || data.loading) return <AppLayout><LoadingState /></AppLayout>;
  if (!lang) {
    return (
      <AppLayout>
        <PageHeader back={{ to: "/languages", label: "Linguagens" }} title="Linguagem não encontrada" />
        <EmptyState framed text="Ela pode ter sido excluída." action={{ to: "/languages", label: "Ver todas as linguagens" }} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        back={{ to: "/languages", label: "Linguagens" }}
        leading={<ColorAvatar color={lang.color} name={lang.name} className="h-14 w-14 rounded-xl text-2xl" />}
        title={lang.name}
        description={
          <>
            {LANGUAGE_LEVEL_LABELS[lang.level]}
            {lang.start_date && <>, desde {format(parseISO(lang.start_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</>}
          </>
        }
      />

      <div className="space-y-6">
        <StatRow
          stats={[
            { label: "Horas estudadas", value: formatHours(data.totalHours) },
            { label: "Matérias", value: String(data.subjects.length) },
            { label: "Cursos", value: String(data.courses.length) },
          ]}
        />

        {lang.target_hours > 0 && (
          <section className="rounded-xl border bg-card p-5 sm:p-6" aria-label="Meta da linguagem">
            <h2 className="mb-3 font-sans text-sm font-medium text-muted-foreground">Meta</h2>
            <HoursProgress done={data.totalHours} target={lang.target_hours} label={`Meta de horas em ${lang.name}`} />
          </section>
        )}

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Resumo</TabsTrigger>
            <TabsTrigger value="sessions">Sessões</TabsTrigger>
            <TabsTrigger value="subjects">Matérias</TabsTrigger>
            <TabsTrigger value="courses">Cursos</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0"><DashboardTab data={data} /></TabsContent>
          <TabsContent value="sessions" className="mt-0"><SessionsTab data={data} /></TabsContent>
          <TabsContent value="subjects" className="mt-0"><SubjectsTab data={data} /></TabsContent>
          <TabsContent value="courses" className="mt-0"><CoursesTab data={data} /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

/** Toolbar row above each tab's list: short explanation + the "new" button. */
function TabToolbar({ text, action }: { text: string; action: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{text}</p>
      <div className="self-start sm:self-auto">{action}</div>
    </div>
  );
}

/* ----- Dashboard tab ----- */
function DashboardTab({ data }: { data: ReturnType<typeof useLanguageData> }) {
  // Last 14 days series
  const daily = useMemo(() => {
    const days: { day: string; date: string; hours: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({ day: format(d, "yyyy-MM-dd"), date: format(d, "dd/MM"), hours: 0 });
    }
    const idx = new Map(days.map((d, i) => [d.day, i]));
    for (const s of data.sessions) {
      const i = idx.get(s.date);
      if (i !== undefined) days[i].hours += Number(s.hours || 0);
    }
    return days;
  }, [data.sessions]);

  const bySubject = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of data.sessions) {
      const key = s.subject_id || "__none__";
      m.set(key, (m.get(key) || 0) + Number(s.hours || 0));
    }
    return Array.from(m.entries()).map(([key, hours]) => {
      const sub = data.subjects.find((x) => x.id === key);
      return { id: key, label: sub?.name || "Sem matéria", value: hours, color: sub?.color };
    });
  }, [data.sessions, data.subjects]);

  const byCourse = useMemo(() => {
    return data.courses.map((c) => ({
      course: c,
      done: data.sessions.filter((s) => s.course_id === c.id).reduce((a, s) => a + Number(s.hours || 0), 0),
    }));
  }, [data.courses, data.sessions]);

  const last7 = daily.slice(-7).reduce((a, d) => a + d.hours, 0);
  const prev7 = daily.slice(0, 7).reduce((a, d) => a + d.hours, 0);

  if (data.sessions.length === 0) {
    return <EmptyState framed title="Sem sessões ainda" text="Registre a primeira sessão na aba Sessões para ver os gráficos aqui." />;
  }

  return (
    <div className="space-y-6">
      <StatRow
        stats={[
          { label: "Últimos 7 dias", value: formatHours(last7), sub: <Delta value={last7 - prev7} format={formatDuration} suffix="vs. 7 dias antes" /> },
          { label: "Média por dia", value: formatDuration(last7 / 7), sub: "Nos últimos 7 dias" },
          { label: "Sessões", value: String(data.sessions.length) },
          { label: "Total", value: formatHours(data.totalHours) },
        ]}
      />

      <ChartCard
        title="Últimos 14 dias"
        description={`${formatHours(daily.reduce((a, d) => a + d.hours, 0))} no período.`}
        table={{
          caption: "Horas por dia nos últimos 14 dias",
          columns: ["Dia", "Tempo"],
          rows: daily.map((d) => [d.date, formatDuration(d.hours)]),
        }}
      >
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={daily} margin={{ top: 12, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke={gridStroke} />
            <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} interval={1} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={hourTick} allowDecimals={false} width={44} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--chart-axis))", strokeWidth: 1 }} />
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
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Por matéria" description="Tempo total em cada matéria.">
          <RankedBars items={bySubject} />
        </ChartCard>

        <ChartCard title="Cursos" description="Horas feitas em relação à carga de cada curso.">
          {byCourse.length === 0 ? (
            <EmptyState text="Nenhum curso nesta linguagem." />
          ) : (
            <ul className="space-y-5">
              {byCourse.map(({ course, done }) => (
                <li key={course.id}>
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <ColorDot color={course.color} />
                    {course.name}
                  </p>
                  {course.total_hours > 0 ? (
                    <HoursProgress done={done} target={course.total_hours} label={`Progresso do curso ${course.name}`} />
                  ) : (
                    <p className="text-sm tabular-nums text-muted-foreground">{formatHours(done)} estudadas</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

/* ----- Subjects tab ----- */
function SubjectsTab({ data }: { data: ReturnType<typeof useLanguageData> }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LangSubject | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[1]);

  const openNew = () => { setEditing(null); setName(""); setColor(SUBJECT_COLORS[1]); setOpen(true); };
  const openEdit = (s: LangSubject) => { setEditing(s); setName(s.name); setColor(s.color); setOpen(true); };
  const save = async () => {
    if (!name.trim()) return;
    if (editing) await data.updateSubject(editing.id, { name: name.trim(), color });
    else await data.addSubject({ name: name.trim(), color, icon: null });
    toast.success(editing ? "Matéria salva" : "Matéria criada");
    setOpen(false);
  };

  return (
    <div>
      <TabToolbar
        text="Temas dentro desta linguagem, como gramática ou conversação."
        action={<Button size="sm" onClick={openNew}><Plus className="w-4 h-4" />Nova matéria</Button>}
      />
      {data.subjects.length === 0 ? (
        <EmptyState framed text="Nenhuma matéria nesta linguagem ainda." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.subjects.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <ColorAvatar color={s.color} name={s.name} className="h-9 w-9 text-sm" />
              <span className="flex-1 truncate font-medium">{s.name}</span>
              <RowActions
                itemLabel={`matéria ${s.name}`}
                onEdit={() => openEdit(s)}
                onDelete={async () => { await data.deleteSubject(s.id); toast.success("Matéria excluída"); }}
              />
            </li>
          ))}
        </ul>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar matéria" : "Nova matéria"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <div className="space-y-2">
              <Label htmlFor="lang-subject-name">Nome</Label>
              <Input id="lang-subject-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <ColorSwatchPicker value={color} onChange={setColor} label="Cor da matéria" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">{editing ? "Salvar" : "Criar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----- Courses tab ----- */
function CoursesTab({ data }: { data: ReturnType<typeof useLanguageData> }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LangCourse | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [totalHours, setTotalHours] = useState("0");
  const [color, setColor] = useState(SUBJECT_COLORS[1]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);

  const openNew = () => {
    setEditing(null); setName(""); setDescription(""); setTotalHours("0"); setColor(SUBJECT_COLORS[1]);
    setSubjectIds([]); setOpen(true);
  };
  const openEdit = (c: LangCourse) => {
    setEditing(c); setName(c.name); setDescription(c.description || ""); setTotalHours(String(c.total_hours));
    setColor(c.color); setSubjectIds(c.subject_ids || []); setOpen(true);
  };

  const toggleSubject = (id: string) => {
    setSubjectIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const save = async () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      description: description || null,
      total_hours: Number(totalHours) || 0,
      color,
      icon: null,
      subject_ids: subjectIds,
    };
    if (editing) await data.updateCourse(editing.id, payload);
    else await data.addCourse(payload);
    toast.success(editing ? "Curso salvo" : "Curso criado");
    setOpen(false);
  };

  const hoursByCourse = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of data.sessions) {
      if (s.course_id) m.set(s.course_id, (m.get(s.course_id) || 0) + Number(s.hours || 0));
    }
    return m;
  }, [data.sessions]);

  return (
    <div>
      <TabToolbar
        text="Cursos desta linguagem, com carga horária e matérias ligadas."
        action={<Button size="sm" onClick={openNew}><Plus className="w-4 h-4" />Novo curso</Button>}
      />
      {data.courses.length === 0 ? (
        <EmptyState framed text="Nenhum curso nesta linguagem ainda." />
      ) : (
        <ul className="space-y-3">
          {data.courses.map((c) => {
            const done = hoursByCourse.get(c.id) || 0;
            const completed = c.total_hours > 0 && done >= c.total_hours;
            const linkedSubjects = (c.subject_ids || [])
              .map((id) => data.subjects.find((s) => s.id === id))
              .filter(Boolean) as LangSubject[];
            return (
              <li key={c.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-start gap-4">
                  <ColorAvatar color={c.color} name={c.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold">{c.name}</h3>
                      {completed && <Badge className="gap-1 font-normal"><CheckCircle2 className="h-3 w-3" aria-hidden />Concluído</Badge>}
                    </div>
                    {c.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                  </div>
                  <RowActions
                    itemLabel={`curso ${c.name}`}
                    onEdit={() => openEdit(c)}
                    onDelete={async () => { await data.deleteCourse(c.id); toast.success("Curso excluído"); }}
                  />
                </div>
                <div className="mt-4 space-y-3 sm:pl-14">
                  {c.total_hours > 0 ? (
                    <HoursProgress done={done} target={c.total_hours} label={`Progresso do curso ${c.name}`} />
                  ) : (
                    <p className="text-sm tabular-nums text-muted-foreground">{formatHours(done)} estudadas</p>
                  )}
                  {linkedSubjects.length > 0 && (
                    <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Matérias do curso">
                      {linkedSubjects.map((s) => (
                        <li key={s.id} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <ColorDot color={s.color} className="h-2 w-2" />
                          {s.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar curso" : "Novo curso"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <div className="space-y-2">
              <Label htmlFor="lang-course-name">Nome</Label>
              <Input id="lang-course-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lang-course-description">Descrição <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <Textarea id="lang-course-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lang-course-hours">Carga horária (horas)</Label>
              <Input id="lang-course-hours" type="number" inputMode="decimal" min="0" step="0.5" value={totalHours} onChange={(e) => setTotalHours(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Matérias ligadas</Label>
              {data.subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Crie matérias na aba Matérias para ligar ao curso.</p>
              ) : (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Matérias ligadas ao curso">
                  {data.subjects.map((s) => {
                    const active = subjectIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleSubject(s.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <ColorDot color={s.color} className="h-2 w-2" />
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <ColorSwatchPicker value={color} onChange={setColor} label="Cor do curso" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">{editing ? "Salvar" : "Criar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----- Sessions tab ----- */
function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 100) / 100;
}

function SessionsTab({ data }: { data: ReturnType<typeof useLanguageData> }) {
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LangSession | null>(null);
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [subjectId, setSubjectId] = useState<string>("none");
  const [courseId, setCourseId] = useState<string>("none");
  const [notes, setNotes] = useState("");

  // When a course is selected, restrict subjects to its linked ones.
  const selectedCourse = data.courses.find((c) => c.id === courseId);
  const availableSubjects = selectedCourse && selectedCourse.subject_ids?.length
    ? data.subjects.filter((s) => selectedCourse.subject_ids.includes(s.id))
    : data.subjects;

  const sorted = useMemo(
    () => [...data.sessions].sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time)),
    [data.sessions],
  );

  const openNew = () => {
    setEditing(null); setDate(today); setStartTime("09:00"); setEndTime("10:00");
    setSubjectId("none"); setCourseId("none"); setNotes(""); setOpen(true);
  };
  const openEdit = (s: LangSession) => {
    setEditing(s); setDate(s.date); setStartTime(s.start_time); setEndTime(s.end_time);
    setSubjectId(s.subject_id || "none"); setCourseId(s.course_id || "none");
    setNotes(s.notes || ""); setOpen(true);
  };

  const save = async () => {
    const hours = hoursBetween(startTime, endTime);
    const payload = {
      date, start_time: startTime, end_time: endTime, hours,
      subject_id: subjectId === "none" ? null : subjectId,
      course_id: courseId === "none" ? null : courseId,
      notes: notes || null,
    };
    if (editing) await data.updateSession(editing.id, payload);
    else await data.addSession(payload);
    toast.success(editing ? "Sessão salva" : "Sessão registrada");
    setOpen(false);
  };

  return (
    <div>
      <TabToolbar
        text="Sessões de estudo desta linguagem."
        action={<Button size="sm" onClick={openNew}><Plus className="w-4 h-4" />Nova sessão</Button>}
      />
      {sorted.length === 0 ? (
        <EmptyState framed text="Nenhuma sessão registrada nesta linguagem." />
      ) : (
        <DayGroupedList
          items={sorted}
          getDay={(s) => s.date}
          getHours={(s) => Number(s.hours || 0)}
          getKey={(s) => s.id}
          renderRow={(s) => {
            const sub = data.subjects.find((x) => x.id === s.subject_id);
            const crs = data.courses.find((x) => x.id === s.course_id);
            return (
              <div className="flex items-start gap-4 px-4 py-3.5 sm:px-5">
                <ColorDot color={sub?.color || crs?.color} className="mt-1.5 h-3 w-3" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium">{sub?.name || crs?.name || "Sessão livre"}</span>
                    {sub && crs && <span className="text-xs text-muted-foreground">{crs.name}</span>}
                  </div>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{s.start_time}–{s.end_time}</p>
                  {s.notes && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.notes}</p>}
                </div>
                <span className="shrink-0 pt-0.5 text-sm font-medium tabular-nums">{formatDuration(Number(s.hours || 0))}</span>
                <RowActions
                  itemLabel={`sessão das ${s.start_time}`}
                  onEdit={() => openEdit(s)}
                  onDelete={async () => { await data.deleteSession(s.id); toast.success("Sessão excluída"); }}
                />
              </div>
            );
          }}
        />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar sessão" : "Nova sessão"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <div className="space-y-2">
              <Label htmlFor="lang-session-date">Data</Label>
              <Input id="lang-session-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lang-session-start">Início</Label>
                <Input id="lang-session-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lang-session-end">Fim</Label>
                <Input id="lang-session-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lang-session-course">Curso <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <Select value={courseId} onValueChange={(v) => { setCourseId(v); setSubjectId("none"); }}>
                <SelectTrigger id="lang-session-course"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {data.courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lang-session-subject">Matéria <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger id="lang-session-subject"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {availableSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedCourse && selectedCourse.subject_ids?.length > 0 && (
                <p className="text-xs text-muted-foreground">Mostrando só as matérias ligadas a este curso.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lang-session-notes">Notas <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <Textarea id="lang-session-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">{editing ? "Salvar" : "Registrar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
