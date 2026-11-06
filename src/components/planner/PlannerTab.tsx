import { useMemo, useState } from "react";
import { addDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Minus, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import StatRow from "@/components/page/StatRow";
import EmptyState from "@/components/page/EmptyState";
import { ColorAvatar, ColorDot, ListCard } from "@/components/page/bits";
import PlanSettingsDialog from "./PlanSettingsDialog";
import { formatDuration, formatHours } from "@/lib/format";
import { buildPlan, type PlanBlock, type PlanKind, type PlanSettings, type PlanStatus } from "@/lib/planner";
import { toDayKey } from "@/lib/streak";
import type { PlannerItem, StoredBlock } from "@/hooks/usePlanner";

const STEP = 15;
const AGENDA_DAYS = 14;

const STATUS: Record<PlanStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  done: { label: "Concluído", variant: "secondary" },
  ahead: { label: "Adiantado", variant: "default" },
  ontrack: { label: "No ritmo", variant: "default" },
  behind: { label: "Atrasado", variant: "destructive" },
  nodata: { label: "Sem meta", variant: "outline" },
};

interface PlannerTabProps {
  kind: PlanKind;
  items: PlannerItem[];
  budgetHours: number;
  frozen: Set<string>;
  blocks: StoredBlock[];
  done: Map<string, number>; // minutes per `${itemKey}|${date}`
  emptyText: string;
  onSaveSettings: (item: PlannerItem, s: PlanSettings) => Promise<boolean>;
  onReplace: (kind: PlanKind, drafts: PlanBlock[]) => Promise<boolean>;
}

interface AgendaEntry {
  block: PlanBlock;
  /** Index in the draft; null for confirmed blocks, which are read-only. */
  draftIndex: number | null;
}

export default function PlannerTab({
  kind, items, budgetHours, frozen, blocks, done, emptyText, onSaveSettings, onReplace,
}: PlannerTabProps) {
  const [draft, setDraft] = useState<PlanBlock[] | null>(null);
  const [busy, setBusy] = useState(false);

  const today = new Date();
  const todayKey = toDayKey(today);

  const plan = useMemo(
    () => buildPlan({ items, today: new Date(), dailyBudgetHours: budgetHours, frozen }),
    [items, budgetHours, frozen],
  );
  const rowByKey = useMemo(() => new Map(plan.rows.map((r) => [r.key, r])), [plan]);
  const itemByKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);

  const confirmed: PlanBlock[] = useMemo(
    () => blocks.filter((b) => b.kind === kind).map((b) => ({ itemKey: b.itemKey, date: b.date, minutes: b.minutes, label: b.label })),
    [blocks, kind],
  );

  // Past days always show confirmed blocks. Today onward shows the draft when one is open.
  const agenda: AgendaEntry[] = useMemo(() => {
    const past = confirmed
      .filter((b) => b.date < todayKey)
      .map((block) => ({ block, draftIndex: null }));
    const future: AgendaEntry[] = draft
      ? draft.map((block, draftIndex) => ({ block, draftIndex })).filter((e) => e.block.date >= todayKey)
      : confirmed.filter((b) => b.date >= todayKey).map((block) => ({ block, draftIndex: null }));
    return [...past, ...future].filter((e) => itemByKey.has(e.block.itemKey));
  }, [confirmed, draft, todayKey, itemByKey]);

  const weekStart = toDayKey(startOfWeek(today, { weekStartsOn: 1 }));
  const weekEnd = toDayKey(endOfWeek(today, { weekStartsOn: 1 }));
  const weekEntries = agenda.filter((e) => e.block.date >= weekStart && e.block.date <= weekEnd);
  const plannedWeek = weekEntries.reduce((a, e) => a + e.block.minutes, 0);
  const doneWeek = weekEntries.reduce((a, e) => a + Math.min(done.get(`${e.block.itemKey}|${e.block.date}`) ?? 0, e.block.minutes), 0);
  const targetWeekly = plan.rows.reduce((a, r) => a + r.targetWeekly, 0);
  const unplacedTotal = plan.rows.filter((r) => r.unplacedHours > 0);

  // Monday of this week through today + AGENDA_DAYS - 1; only days with entries.
  const lastKey = toDayKey(addDays(today, AGENDA_DAYS - 1));
  const byDate = new Map<string, AgendaEntry[]>();
  for (const e of agenda) byDate.set(e.block.date, [...(byDate.get(e.block.date) ?? []), e]);
  const days: { key: string; entries: AgendaEntry[] }[] = [];
  for (let i = 0; i < 7 + AGENDA_DAYS; i++) {
    const key = toDayKey(addDays(startOfWeek(today, { weekStartsOn: 1 }), i));
    if (key > lastKey) break;
    const entries = byDate.get(key);
    if (entries?.length) days.push({ key, entries });
  }

  const generate = () => setDraft(plan.blocks.filter((b) => itemByKey.has(b.itemKey)));
  const adjust = () => setDraft(confirmed.filter((b) => b.date >= todayKey));
  const cancel = () => setDraft(null);

  const confirm = async () => {
    if (!draft) return;
    setBusy(true);
    const ok = await onReplace(kind, draft);
    setBusy(false);
    if (ok) {
      setDraft(null);
      toast.success("Plano confirmado");
    }
  };

  const nudge = (idx: number, delta: number) =>
    setDraft((d) => d && d.map((b, i) => (i === idx ? { ...b, minutes: Math.max(STEP, b.minutes + delta) } : b)));
  const remove = (idx: number) => setDraft((d) => d && d.filter((_, i) => i !== idx));

  if (items.length === 0) {
    return <EmptyState framed title="Nada para planejar" text={emptyText} />;
  }

  return (
    <div className="space-y-6">
      <StatRow
        stats={[
          { label: "Meta semanal", value: formatHours(targetWeekly), sub: "pelo prazo ou meta de cada item" },
          { label: "Planejado nesta semana", value: formatDuration(plannedWeek / 60) },
          {
            label: "Cumprido",
            value: formatDuration(doneWeek / 60),
            sub: plannedWeek > 0 ? `${Math.round((doneWeek / plannedWeek) * 100)}% do planejado` : "nada planejado",
          },
        ]}
      />

      {unplacedTotal.length > 0 && (
        <Alert>
          <AlertTitle>Tempo diário insuficiente</AlertTitle>
          <AlertDescription>
            {unplacedTotal
              .map((r) => `${itemByKey.get(r.key)?.name ?? "item"}: faltam ${formatHours(r.unplacedHours)} no limite diário.`)
              .join(" ")}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {draft === null ? (
          <>
            <Button onClick={generate} disabled={busy}><Sparkles className="w-4 h-4" />Gerar sugestão</Button>
            {confirmed.some((b) => b.date >= todayKey) && (
              <Button variant="outline" onClick={adjust} disabled={busy}>Ajustar plano</Button>
            )}
          </>
        ) : (
          <>
            <Button onClick={confirm} disabled={busy}>Confirmar plano</Button>
            <Button variant="outline" onClick={cancel} disabled={busy}>Cancelar</Button>
            <p className="text-xs text-muted-foreground">
              Confirmar substitui os blocos futuros desta aba. Dias passados ficam como histórico.
            </p>
          </>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const r = rowByKey.get(item.key);
          if (!r) return null;
          const st = STATUS[r.status];
          const overdue = !!item.deadline && item.deadline < todayKey && r.status !== "done";
          const underGoal = item.weeklyHours != null && r.requiredWeekly != null && item.weeklyHours < r.requiredWeekly;
          return (
            <article key={item.key} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ColorAvatar color={item.color} name={item.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium truncate">{item.name}</h3>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {r.status === "nodata"
                      ? "Defina prazo ou horas por semana."
                      : [
                          r.requiredWeekly != null ? `precisa ${formatHours(r.requiredWeekly)}/sem` : null,
                          `seu ritmo ${formatHours(item.paceHours)}/sem`,
                        ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <PlanSettingsDialog
                  name={item.name}
                  initial={{ deadline: item.deadline, weeklyHours: item.weeklyHours, days: item.days, priority: item.priority }}
                  onSave={(s) => onSaveSettings(item, s)}
                />
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                {item.deadline && (
                  <div>
                    <dt className="inline">Prazo: </dt>
                    <dd className={`inline ${overdue ? "text-destructive font-medium" : "text-foreground"}`}>
                      {overdue ? "vencido" : format(parseISO(item.deadline), "dd/MM/yyyy")}
                    </dd>
                  </div>
                )}
                {r.eta && (
                  <div>
                    <dt className="inline">Previsão: </dt>
                    <dd className="inline text-foreground">{format(r.eta, "dd/MM/yyyy")}</dd>
                  </div>
                )}
              </dl>
              {underGoal && (
                <p className="text-xs text-destructive">Meta semanal abaixo do necessário para o prazo.</p>
              )}
              {r.unplacedHours > 0 && (
                <p className="text-xs text-destructive">Faltam {formatHours(r.unplacedHours)} no limite diário.</p>
              )}
            </article>
          );
        })}
      </div>

      <section aria-labelledby="planner-agenda" className="space-y-3">
        <h2 id="planner-agenda" className="font-display text-lg font-semibold tracking-tight">Próximos dias</h2>
        {days.length === 0 ? (
          <EmptyState
            framed
            title="Nenhum bloco nos próximos dias"
            text="Gere uma sugestão para distribuir o tempo de estudo."
          />
        ) : (
          days.map((day) => (
            <div key={day.key} className="space-y-2">
              <h3 className="text-sm font-medium capitalize text-muted-foreground">
                {format(parseISO(day.key), "EEEE, d 'de' MMM", { locale: ptBR })}
              </h3>
              <ListCard>
                <ul className="divide-y">
                  {day.entries.map((e) => {
                    const item = itemByKey.get(e.block.itemKey)!;
                    const doneMin = done.get(`${e.block.itemKey}|${e.block.date}`) ?? 0;
                    const editable = e.draftIndex !== null;
                    return (
                      <li key={`${e.block.itemKey}|${e.block.date}`} className="flex items-center gap-3 px-4 py-3">
                        <ColorDot color={item.color} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {item.name}
                            {e.block.label && <span className="font-normal text-muted-foreground"> · {e.block.label}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            planejado {formatDuration(e.block.minutes / 60)} · feito {formatDuration(doneMin / 60)}
                          </p>
                        </div>
                        {editable && (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Diminuir 15 min de ${item.name}`} onClick={() => nudge(e.draftIndex!, -STEP)}>
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-16 text-center text-sm tabular-nums">{e.block.minutes} min</span>
                            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Aumentar 15 min de ${item.name}`} onClick={() => nudge(e.draftIndex!, STEP)}>
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Remover bloco de ${item.name}`} onClick={() => remove(e.draftIndex!)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </ListCard>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
