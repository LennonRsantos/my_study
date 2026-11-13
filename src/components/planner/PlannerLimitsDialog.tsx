import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatHours } from "@/lib/format";
import { WEEKDAYS } from "@/lib/planner";

interface PlannerLimitsDialogProps {
  availableDays: number[] | null;
  dailyLimitHours: number | null;
  maxBlockMinutes: number;
  goalHours: number;
  onSave: (availableDays: number[] | null, dailyLimitHours: number | null, maxBlockMinutes: number) => Promise<boolean>;
}

const ALL_DAYS = WEEKDAYS.map((d) => d.iso);

/** The user's study availability: which weekdays and how many hours on each of them. */
export default function PlannerLimitsDialog({ availableDays, dailyLimitHours, maxBlockMinutes, goalHours, onSave }: PlannerLimitsDialogProps) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [limit, setLimit] = useState("");
  const [block, setBlock] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = (o: boolean) => {
    if (o) {
      setDays(availableDays?.length ? availableDays : ALL_DAYS);
      setLimit(dailyLimitHours == null ? "" : String(dailyLimitHours));
      setBlock(String(maxBlockMinutes));
    }
    setOpen(o);
  };

  const limitNum = Number(limit);
  const blockNum = Number(block);
  const limitInvalid = limit !== "" && (!Number.isFinite(limitNum) || limitNum <= 0 || limitNum > 24);
  const blockInvalid = !Number.isInteger(blockNum) || blockNum < 15 || blockNum > 600;
  const hoursPerDay = limit === "" || limitInvalid ? goalHours : limitNum;

  const submit = async () => {
    setBusy(true);
    const sorted = [...days].sort((a, b) => a - b);
    // Every day selected is stored as null: "no restriction".
    const ok = await onSave(sorted.length === 7 ? null : sorted, limit === "" ? null : limitNum, blockNum);
    setBusy(false);
    if (ok) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button variant="outline"><CalendarClock className="w-4 h-4" />Disponibilidade</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sua disponibilidade</DialogTitle>
          <DialogDescription>
            O planejador distribui cursos, trilhas e idiomas só nos dias e horas que você marcar aqui.
          </DialogDescription>
        </DialogHeader>

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="limit-daily">Horas por dia</Label>
              <Input
                id="limit-daily"
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                inputMode="decimal"
                placeholder={`meta diária (${goalHours} h)`}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                aria-invalid={limitInvalid}
              />
              <p className="mt-1 text-xs text-muted-foreground">Vazio usa a meta diária.</p>
            </div>
            <div>
              <Label htmlFor="limit-block">Sessão contínua máxima (min)</Label>
              <Input
                id="limit-block"
                type="number"
                min={15}
                max={600}
                step={15}
                inputMode="numeric"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                aria-invalid={blockInvalid}
              />
              <p className="mt-1 text-xs text-muted-foreground">Acima disso, sugerimos dividir com pausa.</p>
            </div>
          </div>

          <p className="text-sm">
            Compromisso semanal: <strong className="tabular-nums">{formatHours(days.length * hoursPerDay)}</strong>
            <span className="text-muted-foreground"> ({days.length} {days.length === 1 ? "dia" : "dias"} × {formatHours(hoursPerDay)})</span>
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy || limitInvalid || blockInvalid || days.length === 0}>Salvar disponibilidade</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
