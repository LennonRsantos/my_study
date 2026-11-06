import AppLayout from "@/components/AppLayout";
import { useStudy } from "@/contexts/StudyContext";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Gift, CheckCircle2 } from "lucide-react";
import { ptBR } from "date-fns/locale";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import RowActions from "@/components/page/RowActions";
import StatRow from "@/components/page/StatRow";
import { ColorDot, HoursProgress } from "@/components/page/bits";
import { Goal, GoalPeriod, PERIOD_LABELS } from "@/lib/types";
import { format, parseISO, isAfter, isBefore, addDays, differenceInCalendarDays } from "date-fns";

function calcGoalProgress(goal: Goal, sessions: { subjectId: string; date: string; hours: number }[]): number {
  const start = parseISO(goal.startDate);
  const end = parseISO(goal.endDate);
  const filtered = sessions.filter((s) => {
    const d = parseISO(s.date);
    if (isBefore(d, start) || isAfter(d, end)) return false;
    if (goal.subjectId) return s.subjectId === goal.subjectId;
    return true;
  });
  const total = filtered.reduce((a, s) => a + s.hours, 0);
  return goal.targetHours > 0 ? Math.min((total / goal.targetHours) * 100, 100) : 0;
}

function getHoursLogged(goal: Goal, sessions: { subjectId: string; date: string; hours: number }[]): number {
  const start = parseISO(goal.startDate);
  const end = parseISO(goal.endDate);
  return sessions
    .filter((s) => {
      const d = parseISO(s.date);
      if (isBefore(d, start) || isAfter(d, end)) return false;
      if (goal.subjectId) return s.subjectId === goal.subjectId;
      return true;
    })
    .reduce((a, s) => a + s.hours, 0);
}

const defaultPeriodDates = (period: GoalPeriod): { start: string; end: string } => {
  const today = new Date();
  const s = format(today, "yyyy-MM-dd");
  const days: Record<GoalPeriod, number> = { week: 7, month: 30, quarter: 90, semester: 180, year: 365 };
  return { start: s, end: format(addDays(today, days[period]), "yyyy-MM-dd") };
};

export default function GoalsPage() {
  const { goals, sessions, subjects, addGoal, updateGoal, deleteGoal } = useStudy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetHours, setTargetHours] = useState("10");
  const [subjectId, setSubjectId] = useState<string>("all");
  const [period, setPeriod] = useState<GoalPeriod>("week");
  const [reward, setReward] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const resetForm = () => {
    setTitle(""); setDescription(""); setTargetHours("10");
    setSubjectId("all"); setPeriod("week"); setReward("");
    const d = defaultPeriodDates("week");
    setStartDate(d.start); setEndDate(d.end);
    setEditing(null);
  };

  const openNew = () => {
    resetForm();
    const d = defaultPeriodDates("week");
    setStartDate(d.start); setEndDate(d.end);
    setOpen(true);
  };

  const openEdit = (g: Goal) => {
    setEditing(g); setTitle(g.title); setDescription(g.description);
    setTargetHours(String(g.targetHours)); setSubjectId(g.subjectId || "all");
    setPeriod(g.period); setReward(g.reward);
    setStartDate(g.startDate); setEndDate(g.endDate);
    setOpen(true);
  };

  const handlePeriodChange = (p: GoalPeriod) => {
    setPeriod(p);
    if (!editing) {
      const d = defaultPeriodDates(p);
      setStartDate(d.start); setEndDate(d.end);
    }
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const goalData: Goal = {
      id: editing?.id || crypto.randomUUID(),
      title: title.trim(),
      description,
      targetHours: Number(targetHours) || 0,
      subjectId: subjectId === "all" ? null : subjectId,
      period,
      reward,
      startDate,
      endDate,
      completed: editing?.completed || false,
      completedAt: editing?.completedAt || null,
    };
    if (editing) updateGoal(goalData); else addGoal(goalData);
    setOpen(false); resetForm();
  };

  const handleComplete = (g: Goal) => {
    updateGoal({ ...g, completed: !g.completed, completedAt: g.completed ? null : new Date().toISOString() });
  };

  const activeGoals = useMemo(() => goals.filter((g) => !g.completed), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.completed), [goals]);

  // Auto-complete goals when target hours are reached
  useEffect(() => {
    goals.forEach((g) => {
      if (g.completed) return;
      const progress = calcGoalProgress(g, sessions);
      if (progress >= 100) {
        updateGoal({ ...g, completed: true, completedAt: new Date().toISOString() });
        toast.success(`Meta "${g.title}" concluída`);
      }
    });
  }, [goals, sessions, updateGoal]);

  const dueSoon = activeGoals.filter((g) => {
    const diff = differenceInCalendarDays(parseISO(g.endDate), new Date());
    return diff >= 0 && diff <= 7;
  }).length;

  return (
    <AppLayout>
      <PageHeader
        title="Metas"
        description="Horas que você quer cumprir num período, com uma recompensa no fim."
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" />Nova meta</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar meta" : "Nova meta"}</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <div className="space-y-2">
                  <Label htmlFor="goal-title">Título</Label>
                  <Input id="goal-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: 20 h de React" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-description">Descrição <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                  <Textarea id="goal-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal-hours">Horas</Label>
                    <Input id="goal-hours" type="number" inputMode="decimal" min="1" required value={targetHours} onChange={(e) => setTargetHours(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal-period">Período</Label>
                    <Select value={period} onValueChange={(v) => handlePeriodChange(v as GoalPeriod)}>
                      <SelectTrigger id="goal-period"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PERIOD_LABELS) as GoalPeriod[]).map((p) => (
                          <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-subject">Matéria</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger id="goal-subject"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as matérias</SelectItem>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2"><ColorDot color={s.color} />{s.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal-start">Início</Label>
                    <Input id="goal-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal-end">Fim</Label>
                    <Input id="goal-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-reward">Recompensa <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                  <Input id="goal-reward" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Ex.: assistir um filme" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit">{editing ? "Salvar" : "Criar meta"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-6">
        <StatRow
          stats={[
            { label: "Ativas", value: String(activeGoals.length) },
            { label: "Concluídas", value: String(completedGoals.length) },
            { label: "Vencem em 7 dias", value: String(dueSoon) },
            { label: "Recompensas ganhas", value: String(completedGoals.filter((g) => g.reward).length) },
          ]}
        />

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Ativas ({activeGoals.length})</TabsTrigger>
            <TabsTrigger value="completed">Concluídas ({completedGoals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-0 space-y-3">
            {activeGoals.length === 0 && (
              <EmptyState
                framed
                title="Nenhuma meta ativa"
                text="Escolha quantas horas quer estudar numa semana ou num mês. O progresso conta sozinho a partir das suas sessões."
                action={<Button size="sm" onClick={openNew}><Plus className="w-4 h-4" />Nova meta</Button>}
              />
            )}
            {activeGoals.map((g) => <GoalCard key={g.id} goal={g} sessions={sessions} subjects={subjects} onEdit={openEdit} onDelete={deleteGoal} onToggle={handleComplete} />)}
          </TabsContent>

          <TabsContent value="completed" className="mt-0 space-y-3">
            {completedGoals.length === 0 && <EmptyState framed text="Metas concluídas aparecem aqui." />}
            {completedGoals.map((g) => <GoalCard key={g.id} goal={g} sessions={sessions} subjects={subjects} onEdit={openEdit} onDelete={deleteGoal} onToggle={handleComplete} />)}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function GoalCard({ goal, sessions, subjects, onEdit, onDelete, onToggle }: {
  goal: Goal;
  sessions: { subjectId: string; date: string; hours: number }[];
  subjects: { id: string; name: string; color: string }[];
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
  onToggle: (g: Goal) => void;
}) {
  const progress = calcGoalProgress(goal, sessions);
  const hoursLogged = getHoursLogged(goal, sessions);
  const subject = goal.subjectId ? subjects.find((s) => s.id === goal.subjectId) : null;
  const isExpired = isAfter(new Date(), parseISO(goal.endDate)) && !goal.completed;
  const isComplete = progress >= 100 || goal.completed;
  const daysLeft = differenceInCalendarDays(parseISO(goal.endDate), new Date());

  return (
    <article className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold">{goal.title}</h3>
            <Badge variant="secondary" className="font-normal">{PERIOD_LABELS[goal.period]}</Badge>
            {isComplete && <Badge className="gap-1 font-normal"><CheckCircle2 className="h-3 w-3" aria-hidden />Concluída</Badge>}
            {isExpired && <Badge variant="destructive" className="font-normal">Expirada</Badge>}
          </div>
          {goal.description && <p className="mt-1 text-sm text-muted-foreground">{goal.description}</p>}
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {format(parseISO(goal.startDate), "d MMM", { locale: ptBR })} – {format(parseISO(goal.endDate), "d MMM yyyy", { locale: ptBR })}
              {!isComplete && !isExpired && daysLeft >= 0 && (
                <> ({daysLeft === 0 ? "termina hoje" : daysLeft === 1 ? "falta 1 dia" : `faltam ${daysLeft} dias`})</>
              )}
            </span>
            {subject && (
              <span className="inline-flex items-center gap-1.5">
                <ColorDot color={subject.color} className="h-2 w-2" />
                {subject.name}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => onToggle(goal)}
            aria-label={goal.completed ? `Reabrir meta ${goal.title}` : `Marcar meta ${goal.title} como concluída`}
            aria-pressed={goal.completed}
          >
            <CheckCircle2 className={goal.completed ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground"} />
          </Button>
          <RowActions itemLabel={`meta ${goal.title}`} onEdit={() => onEdit(goal)} onDelete={() => onDelete(goal.id)} />
        </div>
      </div>

      <HoursProgress className="mt-5" done={hoursLogged} target={goal.targetHours} label={`Progresso da meta ${goal.title}`} />

      {goal.reward && (
        <p className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isComplete ? "bg-primary/10 text-foreground" : "bg-muted text-muted-foreground"}`}>
          <Gift className={`h-4 w-4 shrink-0 ${isComplete ? "text-primary" : ""}`} aria-hidden />
          <span>{isComplete ? "Recompensa liberada: " : "Recompensa: "}<strong className="font-medium text-foreground">{goal.reward}</strong></span>
        </p>
      )}
    </article>
  );
}
