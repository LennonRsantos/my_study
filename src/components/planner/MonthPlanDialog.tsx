import { useState } from "react";
import { differenceInCalendarDays, differenceInCalendarMonths, endOfMonth, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ColorDot } from "@/components/page/bits";
import { formatDuration, formatHours } from "@/lib/format";
import { WEEKDAYS, buildPlan, dayAllowed, monthOptions, recommendMonths } from "@/lib/planner";
import type { MonthPlanInput, PlannerItem } from "@/hooks/usePlanner";

interface MonthPlanDialogProps {
  items: PlannerItem[];
  availableDays: number[] | null;
  budgetHours: number; // hours per day in use today: the planner limit, or the daily goal
  dailyLimitHours: number | null;
  frozen: Set<string>;
  onApply: (plan: MonthPlanInput) => Promise<boolean>;
}

const ALL_DAYS = WEEKDAYS.map((d) => d.iso);
const MAX_MONTHS = 12;
const LAST_STEP = 3;
const EPS = 1e-9;

/** Asks availability, courses and paths of the month, then says the hours per day they need and how to split what does not fit. */
export default function MonthPlanDialog({ items, availableDays, budgetHours, dailyLimitHours, frozen, onApply }: MonthPlanDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [hours, setHours] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [workload, setWorkload] = useState<Record<string, string>>({});
  // Months the user fixed per item; the others follow the recommendation.
  const [months, setMonths] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const today = new Date();
  const monthName = format(today, "MMMM", { locale: ptBR });
  // Languages keep their own weekly goal; the month plan is about courses and paths.
  const candidates = items.filter((i) => i.kind !== "language" && i.itemStatus !== "completed");

  const reset = (o: boolean) => {
    if (o) {
      const planned = candidates.filter((i) => i.deadline);
      setStep(0);
      setDays(availableDays?.length ? availableDays : ALL_DAYS);
      setHours(String(budgetHours));
      setPicked(new Set(planned.map((i) => i.key)));
      setWorkload({});
      // An item already planned keeps its month; an overdue one goes back to the recommendation.
      setMonths(Object.fromEntries(
        planned
          .map((i) => [i.key, differenceInCalendarMonths(parseISO(i.deadline!), today) + 1] as const)
          .filter(([, n]) => n >= 1 && n <= MAX_MONTHS),
      ));
    }
    setOpen(o);
  };

  const hoursNum = Number(hours);
  const hoursInvalid = !Number.isFinite(hoursNum) || hoursNum <= 0 || hoursNum > 24;
  const avail = days.length === 7 ? null : [...days].sort((a, b) => a - b);

  const typed = (i: PlannerItem) => Number(workload[i.key]);
  // Known remaining hours, or what the typed workload gives; null while the workload is missing.
  const remainingOf = (i: PlannerItem): number | null =>
    i.remainingHours ?? (typed(i) > 0 && i.remainingWith ? i.remainingWith(typed(i)) : null);
  const optionsOf = (i: PlannerItem) => monthOptions(remainingOf(i) ?? 0, today, dayAllowed(avail, i.days), frozen, MAX_MONTHS);

  const picks = candidates.filter((i) => picked.has(i.key)).map((item) => ({ item, key: item.key, options: optionsOf(item) }));
  const missingHours = (kind: PlannerItem["kind"]) => picks.some((p) => p.item.kind === kind && remainingOf(p.item) == null);

  // Time the picks cannot use: other items that keep a goal. Unchecked courses and paths lose their deadline on apply.
  const others = items
    .filter((i) => i.itemStatus !== "completed" && !picked.has(i.key))
    .map((i) => (i.kind === "language" ? i : { ...i, deadline: null }))
    .filter((i) => i.deadline || (i.weeklyHours ?? 0) > 0);
  const monthSlots = monthOptions(0, today, dayAllowed(avail, null), frozen, 1)[0].slots;
  const committed = hoursInvalid || monthSlots === 0 ? 0 : buildPlan({
    items: others, today, dailyBudgetHours: hoursNum, frozen, availableDays: avail,
    horizonDays: differenceInCalendarDays(endOfMonth(today), today) + 1,
  }).blocks.reduce((a, b) => a + b.minutes, 0) / 60 / monthSlots;
  const free = hoursInvalid ? 0 : Math.max(0, hoursNum - committed);

  const recommended = recommendMonths(
    picks.filter((p) => months[p.key] == null),
    free - picks.reduce((a, p) => a + (months[p.key] == null ? 0 : p.options[months[p.key] - 1].dailyHours), 0),
  );
  const rows = picks.map((p) => ({ ...p, option: p.options[(months[p.key] ?? recommended.get(p.key) ?? 1) - 1] }));
  const total = rows.reduce((a, r) => a + r.option.dailyHours, 0);
  const allThisMonth = picks.reduce((a, p) => a + p.options[0].dailyHours, 0);
  const reachable = Number.isFinite(total);
  const fits = total <= free + EPS;

  const toggle = (key: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  // How long the item takes alone, at the hours per day of step 1.
  const hint = (i: PlannerItem) => {
    if (remainingOf(i) == null || hoursInvalid) return null;
    const n = optionsOf(i).find((o) => o.dailyHours <= hoursNum + EPS)?.months;
    return n === 1 ? "cabe neste mês" : n ? `cerca de ${n} meses no seu ritmo` : "mais de 1 ano no seu ritmo";
  };

  const apply = async () => {
    setBusy(true);
    const ok = await onApply({
      availableDays: avail,
      // Unchanged hours keep "use the daily goal" (null) as it was.
      dailyLimitHours: hoursNum === budgetHours ? dailyLimitHours : hoursNum,
      picks: rows.map((r) => ({
        item: r.item,
        deadline: r.option.deadline,
        workloadHours: r.item.remainingHours == null ? typed(r.item) : undefined,
      })),
      dropped: candidates.filter((i) => i.deadline && !picked.has(i.key)),
    });
    setBusy(false);
    if (ok) {
      setOpen(false);
      toast.success("Plano do mês salvo. Use Gerar sugestão para montar a agenda.");
    }
  };

  const itemList = (kind: "course" | "path", empty: string) => {
    const list = candidates.filter((i) => i.kind === kind);
    if (list.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
    return (
      <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
        {list.map((i) => {
          const checked = picked.has(i.key);
          const rem = remainingOf(i);
          const tip = hint(i);
          const inputId = `month-load-${i.id}`;
          return (
            <li key={i.key} className="rounded-lg border p-3">
              <label className="flex cursor-pointer items-center gap-3">
                <Checkbox checked={checked} onCheckedChange={() => toggle(i.key)} />
                <ColorDot color={i.color} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{i.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {rem == null ? "sem carga horária" : `${formatHours(rem)} restantes`}
                </span>
              </label>
              {tip && <p className="mt-1 pl-7 text-xs text-muted-foreground">{tip}</p>}
              {checked && i.remainingHours == null && (
                <div className="mt-2 pl-7">
                  <Label htmlFor={inputId}>{kind === "path" ? "Total de horas da trilha inteira" : "Carga horária total (h)"}</Label>
                  <Input
                    id={inputId}
                    type="number"
                    min={0.5}
                    step={0.5}
                    inputMode="decimal"
                    placeholder="ex.: 30"
                    value={workload[i.key] ?? ""}
                    onChange={(e) => setWorkload((w) => ({ ...w, [i.key]: e.target.value }))}
                  />
                  {kind === "path" && typed(i) > 0 && !!i.stepCount && (
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      ≈ {formatDuration(typed(i) / i.stepCount)} por etapa ({i.stepCount} etapas)
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const STEPS = [
    {
      title: "Quando você pode estudar?",
      description: "O planejador usa só os dias e as horas que você marcar aqui.",
      canNext: !hoursInvalid && days.length > 0,
    },
    {
      title: `Quais cursos você quer priorizar em ${monthName}?`,
      description: "Escolha um ou mais. Um curso grande pode ser dividido em vários meses no último passo.",
      canNext: !missingHours("course"),
    },
    {
      title: `Quer fazer alguma trilha em ${monthName}?`,
      description: "Opcional. Escolha uma ou mais, ou siga sem trilha.",
      canNext: picks.length > 0 && !missingHours("path"),
    },
    {
      title: `Seu plano de ${monthName}`,
      description: "Ajuste até quando concluir cada item. O tempo por dia muda na hora.",
      canNext: true,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button><CalendarRange className="w-4 h-4" />Planejar o mês</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{STEPS[step].title}</DialogTitle>
          <DialogDescription>Passo {step + 1} de {STEPS.length}. {STEPS[step].description}</DialogDescription>
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Dias disponíveis para estudar</Label>
              <ToggleGroup type="multiple" value={days.map(String)} onValueChange={(v) => setDays(v.map(Number))} className="flex-wrap justify-start">
                {WEEKDAYS.map((d) => (
                  <ToggleGroupItem key={d.iso} value={String(d.iso)} aria-label={d.long} className="h-8 px-2.5 text-xs">
                    {d.short}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div>
              <Label htmlFor="month-hours">Horas por dia de estudo</Label>
              <Input
                id="month-hours"
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                inputMode="decimal"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                aria-invalid={hoursInvalid}
              />
            </div>
            {!hoursInvalid && (
              <p className="text-sm">
                Até o fim de {monthName}: <strong className="tabular-nums">{formatHours(monthSlots * hoursNum)}</strong>
                <span className="text-muted-foreground"> ({monthSlots} {monthSlots === 1 ? "dia" : "dias"} de estudo × {formatHours(hoursNum)})</span>
              </p>
            )}
          </div>
        )}

        {step === 1 && itemList("course", "Nenhum curso aberto. Siga para as trilhas.")}

        {step === 2 && (
          <div className="space-y-3">
            {itemList("path", "Nenhuma trilha aberta.")}
            {picks.length === 0 && <p className="text-sm text-muted-foreground">Escolha pelo menos um curso ou uma trilha para continuar.</p>}
          </div>
        )}

        {step === LAST_STEP && (
          <div className="space-y-4">
            {reachable ? (
              <p className="text-sm">
                Para concluir {rows.map((r) => r.item.name).join(" + ")} você precisa de{" "}
                <strong className="tabular-nums">{formatDuration(total)}</strong> por dia de estudo.
              </p>
            ) : (
              <p className="text-sm text-destructive">Um item não tem dia de estudo até o prazo escolhido. Escolha um mês mais adiante.</p>
            )}
            <p className="text-xs tabular-nums text-muted-foreground">
              Tempo livre: {formatDuration(free)} por dia
              {committed > 0.01 && ` (${formatDuration(hoursNum)} menos ${formatDuration(committed)} de outros itens com meta)`}
              {` · ${monthSlots} ${monthSlots === 1 ? "dia" : "dias"} de estudo até ${format(endOfMonth(today), "dd/MM")}`}
            </p>
            {allThisMonth > free + EPS && (
              <p className="text-sm">
                {Number.isFinite(allThisMonth)
                  ? <>Tudo em {monthName} exigiria <strong className="tabular-nums">{formatDuration(allThisMonth)}</strong> por dia. </>
                  : `Não restam dias de estudo em ${monthName}. `}
                Recomendação: dividir os itens maiores em mais meses.
              </p>
            )}

            <ul className="max-h-[40vh] space-y-2 overflow-y-auto">
              {rows.map((r) => (
                <li key={r.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-3">
                  <ColorDot color={r.item.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.item.name}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatHours(remainingOf(r.item) ?? 0)} restantes ·{" "}
                      {Number.isFinite(r.option.dailyHours) ? `${formatDuration(r.option.dailyHours)} por dia` : "sem dia de estudo"}
                      {r.option.months > 1 && ` · dividido em ${r.option.months} meses`}
                    </p>
                  </div>
                  <Select value={String(r.option.months)} onValueChange={(v) => setMonths((m) => ({ ...m, [r.key]: Number(v) }))}>
                    <SelectTrigger className="h-8 w-40 text-xs" aria-label={`Concluir ${r.item.name} até`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {r.options.map((o) => (
                        <SelectItem key={o.months} value={String(o.months)}>até {format(parseISO(o.deadline), "dd/MM/yyyy")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
            {Object.keys(months).length > 0 && (
              <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setMonths({})}>Usar recomendação</Button>
            )}

            {reachable && (
              <p role="status" className={fits ? "text-sm" : "text-sm text-destructive"}>
                {fits
                  ? "Cabe na sua disponibilidade."
                  : `Passa ${formatDuration(total - free)} do seu tempo livre. Estenda um prazo ou aumente para ${formatHours(Math.ceil((total + committed) * 2) / 2)} por dia.`}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Aplicar define o prazo destes itens e os coloca em andamento. Curso ou trilha desmarcado perde o prazo.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 0
            ? <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            : <Button variant="outline" onClick={() => setStep(step - 1)} disabled={busy}>Voltar</Button>}
          {step < LAST_STEP
            ? <Button onClick={() => setStep(step + 1)} disabled={!STEPS[step].canNext}>Avançar</Button>
            : <Button onClick={apply} disabled={busy || !reachable}>Aplicar plano</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
