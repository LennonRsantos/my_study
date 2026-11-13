import { useMemo, useState } from "react";
import { addDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, Minus, Plus, Route, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import StatRow from "@/components/page/StatRow";
import EmptyState from "@/components/page/EmptyState";
import { ColorAvatar, ColorDot, ListCard } from "@/components/page/bits";
import PlanSettingsDialog from "./PlanSettingsDialog";
import ReviewList from "./ReviewList";
import { formatDuration, formatHours } from "@/lib/format";
import { WEEKDAYS, buildPlan, overloadedDays, splitBlock, type ItemStatus, type PlanBlock, type PlanKind, type PlanRow, type PlanSettings, type PlanStatus } from "@/lib/planner";
import { toDayKey } from "@/lib/streak";
import type { BlockStatus, PlannerItem, StoredBlock } from "@/hooks/usePlanner";

const STEP = 15;
const AGENDA_DAYS = 14;

const STATUS: Record<PlanStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  done: { label: "Concluído", variant: "secondary" },
  ahead: { label: "Adiantado", variant: "default" },
  ontrack: { label: "No ritmo", variant: "default" },
  behind: { label: "Atrasado", variant: "destructive" },
  nodata: { label: "Sem meta", variant: "outline" },
};

const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  pending: "Pendente para começar",
  in_progress: "Em andamento",
  completed: "Concluído",
};

const KIND_LABEL: Record<PlanKind, string> = { course: "Curso", path: "Trilha", language: "Idioma" };

interface PlannerTabProps {
  items: PlannerItem[];
  budgetHours: number; // hours per available day, shared by every item
  availableDays: number[] | null; // ISO weekdays; null = every day
  frozen: Set<string>;
  blocks: StoredBlock[];
  done: Map<string, number>; // minutes per `${itemKey}|${date}`
  reserved: Map<string, number>; // minutes per day already taken by reviews
  maxBlockMinutes: number;
  onSaveSettings: (item: PlannerItem, s: PlanSettings, workloadHours?: number) => Promise<boolean>;
  onSetItemStatus: (item: PlannerItem, status: ItemStatus) => Promise<boolean>;
  onReplace: (drafts: PlanBlock[]) => Promise<boolean>;
  onSetStatus: (blockId: string, status: BlockStatus) => Promise<boolean>;
  onReschedule: (blockId: string, date: string) => Promise<boolean>;
}

interface AgendaEntry {
  block: PlanBlock;
  /** Index in the draft; null for confirmed blocks, which are read-only. */
  draftIndex: number | null;
  /** Saved row behind a confirmed entry; null for draft entries. */
  stored: StoredBlock | null;
}

export default function PlannerTab({
  items, budgetHours, availableDays, frozen, blocks, done, reserved, maxBlockMinutes, onSaveSettings, onSetItemStatus, onReplace, onSetStatus, onReschedule,
}: PlannerTabProps) {
  const [draft, setDraft] = useState<PlanBlock[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [rerouted, setRerouted] = useState(false);

  const today = new Date();
  const todayKey = toDayKey(today);

  // Completed items stay listed (to reopen) but get no time.
  const open = useMemo(() => items.filter((i) => i.itemStatus !== "completed"), [items]);
  const plan = useMemo(
    () => buildPlan({ items: open, today: new Date(), dailyBudgetHours: budgetHours, frozen, reserved, availableDays }),
    [open, budgetHours, frozen, reserved, availableDays],
  );
  const rowByKey = useMemo(() => new Map(plan.rows.map((r) => [r.key, r])), [plan]);
  const itemByKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);

  const confirmed = useMemo(() => blocks.filter((b) => b.blockType === "study"), [blocks]);
  const toPlan = (b: StoredBlock): PlanBlock => ({ itemKey: b.itemKey, date: b.date, minutes: b.minutes, label: b.label });
  // Only planned future blocks are replaceable; past days and blocks marked as missed stay as history.
  const replaceable = (b: StoredBlock) => b.date >= todayKey && b.status === "planned";

  const agenda: AgendaEntry[] = useMemo(() => {
    const kept = confirmed
      .filter((b) => !replaceable(b))
      .map((b) => ({ block: toPlan(b), draftIndex: null, stored: b }));
    const future: AgendaEntry[] = draft
      ? draft.map((block, draftIndex) => ({ block, draftIndex, stored: null })).filter((e) => e.block.date >= todayKey)
      : confirmed.filter(replaceable).map((b) => ({ block: toPlan(b), draftIndex: null, stored: b }));
    return [...kept, ...future].filter((e) => itemByKey.has(e.block.itemKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helpers only read todayKey
  }, [confirmed, draft, todayKey, itemByKey]);

  // Minutes of missed blocks still not studied that day; they return to the remaining total.
  const missedPending = confirmed
    .filter((b) => b.status === "missed")
    .reduce((a, b) => a + Math.max(0, b.minutes - (done.get(`${b.itemKey}|${b.date}`) ?? 0)), 0);
  const pendingReviews = blocks.filter((b) => b.blockType === "review" && b.status === "planned");
  const missedToday = confirmed.some((b) => b.status === "missed" && b.date === todayKey);

  const weekStart = toDayKey(startOfWeek(today, { weekStartsOn: 1 }));
  const weekEnd = toDayKey(endOfWeek(today, { weekStartsOn: 1 }));
  const weekEntries = agenda.filter((e) => e.block.date >= weekStart && e.block.date <= weekEnd);
  const plannedWeek = weekEntries.reduce((a, e) => a + e.block.minutes, 0);
  const doneWeek = weekEntries.reduce((a, e) => a + Math.min(done.get(`${e.block.itemKey}|${e.block.date}`) ?? 0, e.block.minutes), 0);
  const availDays = availableDays?.length ? availableDays : WEEKDAYS.map((d) => d.iso);
  const weeklyAvailable = availDays.length * budgetHours;
  const unplacedTotal = plan.rows.filter((r) => r.unplacedHours > 0);

  // Overload counts every planned minute of the day: study (draft when open) plus pending reviews.
  const overloaded = overloadedDays(
    [...agenda.filter((e) => e.block.date >= todayKey).map((e) => e.block), ...pendingReviews.filter((b) => b.date >= todayKey)],
    budgetHours * 60,
  );

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

  const generate = () => {
    setRerouted(false);
    setDraft(plan.blocks.filter((b) => itemByKey.has(b.itemKey)));
  };
  const adjust = () => {
    setRerouted(false);
    setDraft(confirmed.filter(replaceable).map(toPlan));
  };
  const cancel = () => setDraft(null);

  // Remaining hours already reflect real study, so a fresh plan from today redistributes what was missed.
  // A block missed today means today is lost: start from tomorrow.
  const reroute = () => {
    const skip = missedToday ? new Set([...frozen, todayKey]) : frozen;
    const fresh = buildPlan({ items: open, today: new Date(), dailyBudgetHours: budgetHours, frozen: skip, reserved, availableDays });
    setRerouted(true);
    setDraft(fresh.blocks.filter((b) => itemByKey.has(b.itemKey)));
  };

  const draftDays = new Set(draft?.map((b) => b.date) ?? []).size;
  const draftDelta = draft
    ? draft.reduce((a, b) => a + b.minutes, 0) - confirmed.filter(replaceable).reduce((a, b) => a + b.minutes, 0)
    : 0;

  const confirm = async () => {
    if (!draft) return;
    setBusy(true);
    const ok = await onReplace(draft);
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
    return <EmptyState framed title="Nada para planejar" text="Cadastre um curso, trilha ou idioma para montar sua rotina." />;
  }

  const inProgress = open.filter((i) => i.itemStatus === "in_progress");
  // Queue order: whoever starts first; items the plan could not fit go last.
  const queue = open
    .filter((i) => i.itemStatus === "pending")
    .sort((a, b) => (rowByKey.get(a.key)?.startDate ?? "~").localeCompare(rowByKey.get(b.key)?.startDate ?? "~"));
  const completed = items.filter((i) => i.itemStatus === "completed");

  const card = (item: PlannerItem) => (
    <ItemCard
      key={item.key}
      item={item}
      row={rowByKey.get(item.key) ?? null}
      todayKey={todayKey}
      budgetHours={budgetHours}
      onSaveSettings={onSaveSettings}
      onSetItemStatus={onSetItemStatus}
    />
  );

  return (
    <div className="space-y-6">
      <StatRow
        stats={[
          {
            label: "Disponível por semana",
            value: formatHours(weeklyAvailable),
            sub: `${availDays.length === 7 ? "todos os dias" : availDays.map((d) => WEEKDAYS[d - 1].short).join(", ")} · ${formatHours(budgetHours)}/dia`,
          },
          { label: "Planejado nesta semana", value: formatDuration(plannedWeek / 60) },
          {
            label: "Cumprido",
            value: formatDuration(doneWeek / 60),
            sub: plannedWeek > 0 ? `${Math.round((doneWeek / plannedWeek) * 100)}% do planejado` : "nada planejado",
          },
        ]}
      />

      {overloaded.size > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Dia acima do limite</AlertTitle>
          <AlertDescription className="space-y-1">
            {[...overloaded].map(([day, min]) => (
              <p key={day}>
                Sua programação de {day === todayKey ? "hoje" : format(parseISO(day), "EEEE, d/MM", { locale: ptBR })} possui{" "}
                {formatDuration(min / 60)} de estudo. Considere dividir essa carga em sessões menores para melhorar a qualidade do aprendizado.
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}

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
            {confirmed.some(replaceable) && (
              <Button variant="outline" onClick={adjust} disabled={busy}>Ajustar plano</Button>
            )}
            <Button variant="outline" onClick={reroute} disabled={busy}><Route className="w-4 h-4" />Recalcular rota</Button>
          </>
        ) : (
          <>
            <Button onClick={confirm} disabled={busy}>Confirmar plano</Button>
            <Button variant="outline" onClick={cancel} disabled={busy}>Cancelar</Button>
            <p className="text-xs text-muted-foreground">
              Confirmar substitui os blocos futuros da agenda. Dias passados e sessões não realizadas ficam como histórico.
            </p>
          </>
        )}
      </div>

      {draft && rerouted && (
        <Alert>
          <AlertTitle>Prévia da nova rota</AlertTitle>
          <AlertDescription>
            {missedPending > 0
              ? `${formatDuration(missedPending / 60)} não realizadas voltam ao total e são redistribuídas. `
              : "Nenhuma sessão marcada como não realizada. "}
            {`Nova distribuição: ${draft.length} sessões em ${draftDays} dias`}
            {draftDelta !== 0 && ` (${draftDelta > 0 ? "+" : "−"}${formatDuration(Math.abs(draftDelta) / 60)} em relação ao plano atual)`}
            {missedToday && ". Hoje fica livre"}. Revise abaixo e confirme.
          </AlertDescription>
        </Alert>
      )}

      <ItemGroup title="Em andamento" empty="Nenhum item em andamento.">{inProgress.map(card)}</ItemGroup>
      {queue.length > 0 && (
        <ItemGroup title="Na fila" hint="Começam quando sobrar tempo na sua disponibilidade, na ordem abaixo.">
          {queue.map(card)}
        </ItemGroup>
      )}
      {completed.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="group -ml-2">
              Concluídos ({completed.length})
              <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="grid gap-3 md:grid-cols-2">{completed.map(card)}</div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {pendingReviews.length > 0 && (
        <ReviewList reviews={pendingReviews} todayKey={todayKey} onSetStatus={onSetStatus} onReschedule={onReschedule} />
      )}

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
                    const markable = e.stored && e.block.date <= todayKey;
                    return (
                      <li key={e.stored?.id ?? `draft-${e.draftIndex}`} className="flex items-center gap-3 px-4 py-3">
                        <ColorDot color={item.color} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {item.name}
                            {e.block.label && <span className="font-normal text-muted-foreground"> · {e.block.label}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            planejado {formatDuration(e.block.minutes / 60)} · feito {formatDuration(doneMin / 60)}
                          </p>
                          {e.block.minutes > maxBlockMinutes && <SplitHint minutes={e.block.minutes} max={maxBlockMinutes} />}
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
                        {markable && e.stored!.status === "missed" && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Não realizado</Badge>
                            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onSetStatus(e.stored!.id, "planned")}>Desfazer</Button>
                          </div>
                        )}
                        {markable && e.stored!.status === "planned" && doneMin < e.block.minutes && (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onSetStatus(e.stored!.id, "missed")}>
                            Não realizado
                          </Button>
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

function ItemGroup({ title, hint, empty, children }: { title: string; hint?: string; empty?: string; children: React.ReactNode[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">{children}</div>
      )}
    </section>
  );
}

interface ItemCardProps {
  item: PlannerItem;
  row: PlanRow | null; // null for completed items, which are not planned
  todayKey: string;
  budgetHours: number;
  onSaveSettings: PlannerTabProps["onSaveSettings"];
  onSetItemStatus: PlannerTabProps["onSetItemStatus"];
}

function ItemCard({ item, row: r, todayKey, budgetHours, onSaveSettings, onSetItemStatus }: ItemCardProps) {
  const [saving, setSaving] = useState(false);
  const st = r ? STATUS[r.status] : null;
  const overdue = !!r && !!item.deadline && item.deadline < todayKey && r.status !== "done";
  const underGoal = !!r && item.weeklyHours != null && r.requiredWeekly != null && item.weeklyHours < r.requiredWeekly;
  const changeStatus = async (v: string) => {
    setSaving(true);
    await onSetItemStatus(item, v as ItemStatus);
    setSaving(false);
  };
  return (
    <article className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <ColorAvatar color={item.color} name={item.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium truncate">{item.name}</h3>
            <Badge variant="outline">{KIND_LABEL[item.kind]}</Badge>
            {st && r?.mode !== "queue" && <Badge variant={st.variant}>{st.label}</Badge>}
          </div>
          {r ? <Recommendation row={r} item={item} /> : <p className="text-sm text-muted-foreground">Concluído. Fora da rotina.</p>}
          {r && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {[
                r.requiredWeekly != null ? `precisa ${formatHours(r.requiredWeekly)}/sem` : null,
                `seu ritmo ${formatHours(item.paceHours)}/sem`,
              ].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        {r && (
          <PlanSettingsDialog
            name={item.name}
            initial={{ deadline: item.deadline, weeklyHours: item.weeklyHours, days: item.days, priority: item.priority }}
            workloadHours={item.workloadHours}
            onSave={(s, w) => onSaveSettings(item, s, w)}
          />
        )}
      </div>
      <Select value={item.itemStatus} onValueChange={changeStatus} disabled={saving}>
        <SelectTrigger className="h-8 w-full sm:w-56 text-xs" aria-label={`Status de ${item.name}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(ITEM_STATUS_LABEL) as ItemStatus[]).map((v) => (
            <SelectItem key={v} value={v}>{ITEM_STATUS_LABEL[v]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {r && (
        <>
          <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {item.deadline && (
              <div>
                <dt className="inline">Prazo: </dt>
                <dd className={`inline ${overdue ? "text-destructive font-medium" : "text-foreground"}`}>
                  {overdue ? "vencido" : format(parseISO(item.deadline), "dd/MM/yyyy")}
                </dd>
              </div>
            )}
            {item.remainingHours != null && item.remainingHours > 0 && (
              <div>
                <dt className="inline">Restante: </dt>
                <dd className="inline text-foreground tabular-nums">{formatHours(item.remainingHours)}</dd>
              </div>
            )}
          </dl>
          {!r.feasible && r.suggestion && (
            <p className="text-xs text-destructive">
              Prazo inviável{Number.isFinite(budgetHours) && ` com ${formatHours(budgetHours)}/dia`}. Sugestão:{" "}
              {r.suggestion.minDeadline ? `prazo em ${format(r.suggestion.minDeadline, "dd/MM/yyyy")}` : "um prazo maior"}
              {Number.isFinite(r.suggestion.neededDailyHours) && ` ou ${formatDuration(r.suggestion.neededDailyHours)} por dia de estudo`}.
            </p>
          )}
          {underGoal && (
            <p className="text-xs text-destructive">Meta semanal abaixo do necessário para o prazo.</p>
          )}
          {r.unplacedHours > 0 && (
            <p className="text-xs text-destructive">Faltam {formatHours(r.unplacedHours)} no limite diário.</p>
          )}
        </>
      )}
    </article>
  );
}

/** Headline of an item card: minutes per study day and the expected end. */
function Recommendation({ row, item }: { row: PlanRow; item: PlannerItem }) {
  if (row.status === "done") return <p className="text-sm">Concluído.</p>;
  if (item.remainingHours == null) {
    return <p className="text-sm text-muted-foreground">Informe a carga horária para calcular o tempo por dia.</p>;
  }
  if (row.mode === "queue") {
    return (
      <p className="text-sm">
        {row.startDate
          ? <>Na fila · começa em <strong className="tabular-nums">{format(parseISO(row.startDate), "dd/MM")}</strong> com {formatDuration(row.dailyMinutes / 60)} por dia</>
          : <span className="text-muted-foreground">Na fila · sem tempo livre nos próximos 14 dias</span>}
        {row.eta && <span className="text-muted-foreground"> · termina em {format(row.eta, "dd/MM/yyyy")}</span>}
      </p>
    );
  }
  if (row.dailyMinutes <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {row.mode === "share" ? "Sem tempo livre no limite diário." : "Defina prazo ou horas por semana."}
      </p>
    );
  }
  return (
    <p className="text-sm">
      Estude <strong className="tabular-nums">{formatDuration(row.dailyMinutes / 60)}</strong> por dia
      {item.days?.length ? " de estudo" : ""}
      {row.eta && <span className="text-muted-foreground"> · termina em {format(row.eta, "dd/MM/yyyy")}</span>}
    </p>
  );
}

function SplitHint({ minutes, max }: { minutes: number; max: number }) {
  const { parts, breakMinutes } = splitBlock(minutes, max);
  return (
    <p className="text-xs text-muted-foreground">
      Sugestão: {parts.map((p) => `${p} min`).join(" + ")} com pausa de {breakMinutes} min entre as sessões.
    </p>
  );
}
