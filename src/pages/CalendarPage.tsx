import AppLayout from "@/components/AppLayout";
import { useStudy } from "@/contexts/StudyContext";
import { parseNotes } from "@/lib/sessionNotes";
import { PRACTICE_TYPE_LABELS } from "@/lib/types";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Snowflake, CheckCircle2, Trash2, Wrench } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay, parseISO, addWeeks, subWeeks, startOfWeek as sow, isAfter, isBefore, startOfDay
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { FrozenDay } from "@/lib/types";
import { buildFrozenSet } from "@/lib/streak";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import PageHeader from "@/components/page/PageHeader";
import { ColorDot } from "@/components/page/bits";
import { ConfirmDelete } from "@/components/page/RowActions";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Same sequential steps as the dashboard study map; the top step means the daily goal was met.
const LEVEL_CLASS = [
  "bg-muted/60 hover:bg-muted",
  "bg-primary/15 hover:bg-primary/20",
  "bg-primary/30 hover:bg-primary/35",
  "bg-primary/50 hover:bg-primary/55",
  "bg-primary text-primary-foreground hover:bg-primary/90",
];

function levelFor(hours: number, goal: number): number {
  if (hours <= 0) return 0;
  const ratio = goal > 0 ? hours / goal : 1;
  if (ratio >= 1) return 4;
  if (ratio >= 0.66) return 3;
  if (ratio >= 0.33) return 2;
  return 1;
}

type View = "month" | "week";

export default function CalendarPage() {
  const { sessions, practiceSessions, subjects, frozenDays, goal, addFrozenDay, deleteFrozenDay } = useStudy();
  const [confirmUnfreeze, setConfirmUnfreeze] = useState(false);
  const [current, setCurrent] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeReason, setFreezeReason] = useState("");
  const [freezeCompDate, setFreezeCompDate] = useState("");
  const [freezeCompHours, setFreezeCompHours] = useState(1);
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => {
    if (view === "month") {
      const monthStart = startOfMonth(current);
      const monthEnd = endOfMonth(current);
      const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calStart, end: calEnd });
    } else {
      const weekStart = sow(current, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(current, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [current, view]);

  const navigate = (dir: number) => {
    setCurrent((c) => (view === "month" ? (dir > 0 ? addMonths(c, 1) : subMonths(c, 1)) : (dir > 0 ? addWeeks(c, 1) : subWeeks(c, 1))));
  };

  const frozenSet = useMemo(() => buildFrozenSet(frozenDays), [frozenDays]);
  const daySessions = (date: Date) => sessions.filter((s) => isSameDay(parseISO(s.date), date));
  const dayPractices = (date: Date) => practiceSessions.filter((p) => isSameDay(parseISO(p.date), date));
  const dayFrozen = (date: Date) => frozenDays.find((f) => isSameDay(parseISO(f.frozenDate), date));
  const dayCompensations = (date: Date) =>
    frozenDays.filter((f) => isSameDay(parseISO(f.compensationDate), date));
  const selectedSessions = selectedDate ? daySessions(selectedDate) : [];
  const selectedPractices = selectedDate ? dayPractices(selectedDate) : [];
  const selectedFrozen = selectedDate ? dayFrozen(selectedDate) : undefined;
  const selectedCompensations = selectedDate ? dayCompensations(selectedDate) : [];

  const openFreeze = () => {
    setFreezeReason("");
    setFreezeCompHours(1);
    // default compensation date = next day after selected
    if (selectedDate) {
      const def = new Date(selectedDate);
      def.setDate(def.getDate() + 1);
      setFreezeCompDate(format(def, "yyyy-MM-dd"));
    }
    setFreezeOpen(true);
  };

  const submitFreeze = async () => {
    if (!selectedDate) return;
    if (!freezeReason.trim()) {
      toast({ title: "Motivo obrigatório", description: "Informe o motivo do congelamento.", variant: "destructive" });
      return;
    }
    if (!freezeCompDate) {
      toast({ title: "Data de compensação obrigatória", variant: "destructive" });
      return;
    }
    const comp = parseISO(freezeCompDate);
    if (!isAfter(startOfDay(comp), startOfDay(selectedDate))) {
      toast({ title: "Data inválida", description: "A compensação deve ser posterior ao dia congelado.", variant: "destructive" });
      return;
    }
    if (freezeCompHours <= 0) {
      toast({ title: "Horas inválidas", description: "Informe um valor maior que zero.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const newFrozen: FrozenDay = {
        id: crypto.randomUUID(),
        frozenDate: format(selectedDate, "yyyy-MM-dd"),
        reason: freezeReason.trim(),
        compensationDate: freezeCompDate,
        compensationHours: freezeCompHours,
        compensated: false,
        compensatedAt: null,
      };
      await addFrozenDay(newFrozen);
      toast({ title: "Dia congelado", description: "Sua sequência continua intacta." });
      setFreezeOpen(false);
    } catch (e: any) {
      toast({ title: "Erro ao congelar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeFrozen = async (id: string) => {
    await deleteFrozenDay(id);
    toast({ title: "Congelamento removido" });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Calendário"
        description="Cada dia ganha cor conforme as horas estudadas em relação à sua meta diária."
        actions={
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="month">Mês</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <section className="rounded-xl border bg-card p-4 sm:p-6" aria-label="Calendário de estudos">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold capitalize">
            {view === "month"
              ? format(current, "MMMM yyyy", { locale: ptBR })
              : `${format(days[0], "d MMM", { locale: ptBR })} – ${format(days[6], "d MMM yyyy", { locale: ptBR })}`}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setCurrent(new Date())}>Hoje</Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)} aria-label={view === "month" ? "Mês anterior" : "Semana anterior"}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(1)} aria-label={view === "month" ? "Próximo mês" : "Próxima semana"}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="mb-1.5 grid grid-cols-7 gap-1.5" aria-hidden>
          {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((d) => (
            <div key={d} className="px-2 text-xs text-muted-foreground">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const ds = daySessions(day);
            const dp = dayPractices(day);
            const frozen = dayFrozen(day);
            const comps = dayCompensations(day);
            const isCurrentMonth = isSameMonth(day, current);
            const isToday = isSameDay(day, new Date());
            const totalHours = ds.reduce((a, s) => a + s.hours, 0) + dp.reduce((a, p) => a + p.hours, 0);
            const uniqueSubjects = [...new Set(ds.map((s) => s.subjectId))];
            const level = levelFor(totalHours, goal.hoursPerDay);
            const status = frozen
              ? "dia congelado"
              : totalHours > 0
                ? `${formatDuration(totalHours)} de estudo`
                : "sem estudo";

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                aria-label={`${format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}: ${status}`}
                className={cn(
                  "relative flex flex-col items-start gap-1 rounded-lg p-2 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  view === "month" ? "min-h-[64px] lg:min-h-[88px]" : "min-h-[120px]",
                  !isCurrentMonth && view === "month" && "opacity-35",
                  frozen ? "bg-info/10 ring-1 ring-inset ring-info/40 hover:bg-info/15" : LEVEL_CLASS[level],
                  isToday && "ring-2 ring-inset ring-foreground/80",
                )}
              >
                <span className={cn("text-xs font-medium tabular-nums", isToday && "font-semibold")}>
                  {format(day, "d")}
                </span>

                {frozen && <Snowflake className="h-3.5 w-3.5 text-info" aria-hidden />}

                {totalHours > 0 && (
                  <span className={cn("mt-auto hidden text-xs font-medium tabular-nums sm:block", level < 4 && "text-foreground/80")}>
                    {formatDuration(totalHours)}
                  </span>
                )}

                {(uniqueSubjects.length > 0 || dp.length > 0) && (
                  <span className="hidden gap-0.5 lg:flex" aria-hidden>
                    {uniqueSubjects.slice(0, 4).map((subId) => (
                      <ColorDot key={subId} className="h-1.5 w-1.5 ring-1 ring-card" color={subjects.find((x) => x.id === subId)?.color} />
                    ))}
                    {dp.length > 0 && <Wrench className="h-2.5 w-2.5" />}
                  </span>
                )}

                {comps.length > 0 && !frozen && (
                  <span className="hidden text-[11px] font-medium text-info lg:block">
                    +{formatDuration(comps.reduce((a, c) => a + c.compensationHours, 0))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground" aria-hidden>
          <span className="flex items-center gap-1.5">
            Menos
            {LEVEL_CLASS.map((c) => <span key={c} className={cn("h-3 w-3 rounded-[3px]", c.split(" ")[0])} />)}
            Meta cumprida
          </span>
          <span className="flex items-center gap-1.5">
            <Snowflake className="h-3.5 w-3.5 text-info" /> Dia congelado
          </span>
          <span className="flex items-center gap-1.5">
            <Wrench className="h-3 w-3" /> Prática
          </span>
        </div>
      </section>

      {/* Day details */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFrozen && <Snowflake className="w-5 h-5 text-info" aria-hidden />}
              {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>

          {selectedFrozen && (
            <div className="rounded-lg border border-info/30 bg-info/5 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-info text-sm font-medium">
                  <Snowflake className="w-4 h-4" aria-hidden /> Dia congelado
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setConfirmUnfreeze(true)} aria-label="Remover congelamento">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <ConfirmDelete
                  open={confirmUnfreeze}
                  onOpenChange={setConfirmUnfreeze}
                  itemLabel="o congelamento deste dia"
                  warning="O dia volta a contar como sem estudo na sua sequência."
                  onConfirm={() => removeFrozen(selectedFrozen.id)}
                />
              </div>
              <p className="text-sm"><span className="text-muted-foreground">Motivo:</span> {selectedFrozen.reason}</p>
              <p className="text-sm">
                <span className="text-muted-foreground">Compensação:</span>{" "}
                {format(parseISO(selectedFrozen.compensationDate), "d 'de' MMM", { locale: ptBR })}, {formatDuration(selectedFrozen.compensationHours)}
                {selectedFrozen.compensated && (
                  <span className="ml-2 inline-flex items-center gap-1 text-success text-xs">
                    <CheckCircle2 className="w-3 h-3" /> Compensado
                  </span>
                )}
              </p>
            </div>
          )}

          {selectedCompensations.length > 0 && (
            <div className="rounded-lg border border-info/30 bg-info/5 p-3 space-y-1">
              <p className="text-sm font-medium text-info">Compensações marcadas para este dia</p>
              {selectedCompensations.map((c) => (
                <p key={c.id} className="text-xs text-muted-foreground">
                  {formatDuration(c.compensationHours)} referente a {format(parseISO(c.frozenDate), "d 'de' MMM", { locale: ptBR })}: {c.reason}
                </p>
              ))}
            </div>
          )}

          {(selectedSessions.length === 0 && selectedPractices.length === 0) ? (
            <p className="text-sm text-muted-foreground py-2">Nenhuma sessão registrada neste dia.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {selectedSessions.map((s) => {
                const sub = subjects.find((x) => x.id === s.subjectId);
                return (
                  <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary">
                    <ColorDot color={sub?.color} className="mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{sub?.name || "Matéria removida"}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.startTime}–{s.endTime}, {formatDuration(s.hours)}
                      </p>
                      {(() => {
                        const n = parseNotes(s.notes);
                        if (!n.module && n.courseSessions.length === 0 && !n.topics) return null;
                        return (
                          <div className="mt-1 space-y-0.5">
                            {n.module && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">Módulo concluído:</span> {n.module.name || "—"}
                              </p>
                            )}
                            {n.module && n.module.subjectIds.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">Matérias:</span>{" "}
                                {subjects.filter((x) => n.module!.subjectIds.includes(x.id)).map((x) => x.name).join(", ")}
                              </p>
                            )}
                            {n.courseSessions.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">Sessões do curso:</span>
                                <ul className="ml-3 list-disc">
                                  {n.courseSessions.map((cs, i) => (
                                    <li key={i}>
                                      <span className="font-medium">Sessão {cs.number ?? i + 1}:</span> {cs.title || "—"}{cs.progress ? ` · ${cs.progress}` : ""}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {n.topics && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">Estudado:</span> {n.topics}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
              {selectedPractices.map((p) => {
                const sub = p.subjectId ? subjects.find((x) => x.id === p.subjectId) : null;
                return (
                  <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary">
                    <div className="w-6 h-6 rounded-full mt-0.5 flex-shrink-0 flex items-center justify-center bg-primary/10">
                      <Wrench className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{PRACTICE_TYPE_LABELS[p.practiceType]}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.startTime}–{p.endTime}, {formatDuration(p.hours)}
                      </p>
                      {sub && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-semibold text-foreground">Matéria:</span>{" "}
                          <span className="inline-flex items-center gap-1">
                            <ColorDot color={sub.color} className="h-2 w-2" />
                            {sub.name}
                          </span>
                        </p>
                      )}
                      {p.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!selectedFrozen && selectedSessions.length === 0 && selectedPractices.length === 0 && selectedDate && !isAfter(startOfDay(selectedDate), startOfDay(new Date())) && (
            <DialogFooter>
              <Button onClick={openFreeze} variant="outline" className="w-full">
                <Snowflake className="w-4 h-4" aria-hidden />
                Congelar este dia
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Freeze form */}
      <Dialog open={freezeOpen} onOpenChange={setFreezeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-info" aria-hidden />
              Congelar dia
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedDate && (
                <>Você vai congelar <strong className="font-medium text-foreground">{format(selectedDate, "d 'de' MMMM", { locale: ptBR })}</strong>. Sua sequência continua contando esse dia.</>
              )}
            </p>

            <div className="space-y-2">
              <Label htmlFor="freeze-reason">Motivo</Label>
              <Textarea
                id="freeze-reason"
                required
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder="Ex: Compromisso familiar, doença..."
                maxLength={300}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="freeze-date">Compensar em</Label>
                <Input
                  id="freeze-date"
                  required
                  type="date"
                  value={freezeCompDate}
                  min={selectedDate ? format(new Date(selectedDate.getTime() + 86400000), "yyyy-MM-dd") : undefined}
                  onChange={(e) => setFreezeCompDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="freeze-hours">Horas a compensar</Label>
                <Input
                  id="freeze-hours"
                  required
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={freezeCompHours}
                  onChange={(e) => setFreezeCompHours(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFreezeOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={submitFreeze} disabled={saving}>
              {saving ? "Congelando…" : "Congelar dia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
