import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Settings2 } from "lucide-react";
import type { PlanPriority, PlanSettings } from "@/lib/planner";

const WEEKDAYS: { iso: number; short: string; long: string }[] = [
  { iso: 1, short: "Seg", long: "segunda" },
  { iso: 2, short: "Ter", long: "terça" },
  { iso: 3, short: "Qua", long: "quarta" },
  { iso: 4, short: "Qui", long: "quinta" },
  { iso: 5, short: "Sex", long: "sexta" },
  { iso: 6, short: "Sáb", long: "sábado" },
  { iso: 7, short: "Dom", long: "domingo" },
];

const PRIORITY_LABEL: Record<PlanPriority, string> = { 2: "Alta", 1: "Normal", 0: "Baixa" };

interface PlanSettingsDialogProps {
  name: string;
  initial: PlanSettings;
  /** Course workload in hours; undefined hides the field (total comes from modules). */
  workloadHours?: number;
  onSave: (s: PlanSettings, workloadHours?: number) => Promise<boolean>;
}

export default function PlanSettingsDialog({ name, initial, workloadHours, onSave }: PlanSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [deadline, setDeadline] = useState(initial.deadline ?? "");
  const [weekly, setWeekly] = useState(initial.weeklyHours ? String(initial.weeklyHours) : "");
  const [days, setDays] = useState<number[]>(initial.days ?? []);
  const [priority, setPriority] = useState<PlanPriority>(initial.priority);
  const [workload, setWorkload] = useState(workloadHours ? String(workloadHours) : "");
  const [busy, setBusy] = useState(false);

  const reset = (o: boolean) => {
    if (o) {
      setDeadline(initial.deadline ?? "");
      setWeekly(initial.weeklyHours ? String(initial.weeklyHours) : "");
      setDays(initial.days ?? []);
      setPriority(initial.priority);
      setWorkload(workloadHours ? String(workloadHours) : "");
    }
    setOpen(o);
  };

  const weeklyNum = Number(weekly);
  const weeklyInvalid = weekly !== "" && (!Number.isFinite(weeklyNum) || weeklyNum < 0);
  const workloadNum = Number(workload);
  const workloadInvalid = workload !== "" && (!Number.isFinite(workloadNum) || workloadNum < 0);

  const submit = async () => {
    setBusy(true);
    const ok = await onSave({
      deadline: deadline || null,
      weeklyHours: weekly !== "" && weeklyNum > 0 ? weeklyNum : null,
      days: days.length > 0 ? [...days].sort((a, b) => a - b) : null,
      priority,
    }, workloadHours === undefined ? undefined : workload === "" ? 0 : workloadNum);
    setBusy(false);
    if (ok) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Editar plano de ${name}`}>
          <Settings2 className="w-4 h-4" />Editar plano
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plano de {name}</DialogTitle>
          <DialogDescription>Defina prazo ou meta semanal. A meta semanal, se informada, tem prioridade sobre o prazo. Sem nenhum dos dois, o curso divide o tempo livre do dia com os outros.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {workloadHours !== undefined && (
            <div>
              <Label htmlFor="plan-workload">Carga horária total (h)</Label>
              <Input
                id="plan-workload"
                type="number"
                min={0}
                step={0.5}
                inputMode="decimal"
                placeholder="ex.: 40"
                value={workload}
                onChange={(e) => setWorkload(e.target.value)}
                aria-invalid={workloadInvalid}
              />
              <p className="mt-1 text-xs text-muted-foreground">O restante desconta o tempo já estudado.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plan-deadline">Prazo (data final)</Label>
              <Input id="plan-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="plan-weekly">Horas por semana</Label>
              <Input
                id="plan-weekly"
                type="number"
                min={0}
                step={0.5}
                inputMode="decimal"
                placeholder="calcular pelo prazo"
                value={weekly}
                onChange={(e) => setWeekly(e.target.value)}
                aria-invalid={weeklyInvalid}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dias preferidos (vazio = todos)</Label>
            <ToggleGroup type="multiple" value={days.map(String)} onValueChange={(v) => setDays(v.map(Number))} className="flex-wrap justify-start">
              {WEEKDAYS.map((d) => (
                <ToggleGroupItem key={d.iso} value={String(d.iso)} aria-label={d.long} className="h-8 px-2.5 text-xs">
                  {d.short}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div>
            <Label>Prioridade</Label>
            <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v) as PlanPriority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {([2, 1, 0] as PlanPriority[]).map((p) => (
                  <SelectItem key={p} value={String(p)}>{PRIORITY_LABEL[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">Prioridade alta ocupa o tempo diário antes e recebe parte maior na divisão.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy || weeklyInvalid || workloadInvalid}>Salvar plano</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
