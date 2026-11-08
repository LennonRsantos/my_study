import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, CalendarClock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ListCard } from "@/components/page/bits";
import { formatDuration } from "@/lib/format";
import type { BlockStatus, StoredBlock } from "@/hooks/usePlanner";

interface ReviewListProps {
  reviews: StoredBlock[]; // pending reviews, any date
  todayKey: string;
  onSetStatus: (blockId: string, status: BlockStatus) => Promise<boolean>;
  onReschedule: (blockId: string, date: string) => Promise<boolean>;
}

export default function ReviewList({ reviews, todayKey, onSetStatus, onReschedule }: ReviewListProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (id: string, fn: () => Promise<boolean>) => {
    setBusy(id);
    await fn();
    setBusy(null);
  };

  return (
    <section aria-labelledby="planner-reviews" className="space-y-3">
      <div>
        <h2 id="planner-reviews" className="font-display text-lg font-semibold tracking-tight">Revisões espaçadas</h2>
        <p className="text-sm text-muted-foreground">Criadas ao concluir um módulo ou curso: 3, 7 e 21 dias depois.</p>
      </div>
      <ListCard>
        <ul className="divide-y">
          {reviews.map((r) => {
            const overdue = r.date < todayKey;
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <RotateCcw className="h-4 w-4 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.label ?? "Revisão"}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {r.date === todayKey ? "hoje" : format(parseISO(r.date), "EEEE, d 'de' MMM", { locale: ptBR })}
                    {" · "}{formatDuration(r.minutes / 60)}
                  </p>
                </div>
                {overdue && <Badge variant="destructive">Atrasada</Badge>}
                <Reschedule
                  initial={overdue ? todayKey : r.date}
                  min={todayKey}
                  disabled={busy === r.id}
                  onSave={(date) => run(r.id, () => onReschedule(r.id, date))}
                />
                <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => run(r.id, () => onSetStatus(r.id, "done"))}>
                  <Check className="w-4 h-4" />Concluir
                </Button>
              </li>
            );
          })}
        </ul>
      </ListCard>
    </section>
  );
}

function Reschedule({ initial, min, disabled, onSave }: { initial: string; min: string; disabled: boolean; onSave: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initial);
  return (
    <Popover open={open} onOpenChange={(o) => { if (o) setDate(initial); setOpen(o); }}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" disabled={disabled}><CalendarClock className="w-4 h-4" />Reagendar</Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 space-y-2">
        <Input type="date" min={min} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Nova data da revisão" />
        <Button size="sm" className="w-full" disabled={!date || date < min} onClick={() => { onSave(date); setOpen(false); }}>
          Salvar data
        </Button>
      </PopoverContent>
    </Popover>
  );
}
