import { useState } from "react";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface PlannerLimitsDialogProps {
  dailyLimitHours: number | null;
  maxBlockMinutes: number;
  goalHours: number;
  onSave: (dailyLimitHours: number | null, maxBlockMinutes: number) => Promise<boolean>;
}

export default function PlannerLimitsDialog({ dailyLimitHours, maxBlockMinutes, goalHours, onSave }: PlannerLimitsDialogProps) {
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState("");
  const [block, setBlock] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = (o: boolean) => {
    if (o) {
      setLimit(dailyLimitHours == null ? "" : String(dailyLimitHours));
      setBlock(String(maxBlockMinutes));
    }
    setOpen(o);
  };

  const limitNum = Number(limit);
  const blockNum = Number(block);
  const limitInvalid = limit !== "" && (!Number.isFinite(limitNum) || limitNum <= 0 || limitNum > 24);
  const blockInvalid = !Number.isInteger(blockNum) || blockNum < 15 || blockNum > 600;

  const submit = async () => {
    setBusy(true);
    const ok = await onSave(limit === "" ? null : limitNum, blockNum);
    setBusy(false);
    if (ok) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button variant="outline"><Gauge className="w-4 h-4" />Limites diários</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Limites de estudo</DialogTitle>
          <DialogDescription>
            Recomendações para evitar dias pesados demais. Ajuste ao seu ritmo: não são regras médicas nem garantia de desempenho.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="limit-daily">Horas disponíveis por dia</Label>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy || limitInvalid || blockInvalid}>Salvar limites</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
