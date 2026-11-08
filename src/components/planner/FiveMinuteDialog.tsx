import { useState } from "react";
import { format } from "date-fns";
import { Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStudy } from "@/contexts/StudyContext";
import { minutesToTime, timeToMinutes } from "@/lib/format";
import { serializeNotes } from "@/lib/sessionNotes";
import { microTasks, type MicroTask } from "@/lib/microTasks";
import type { CourseInsight } from "@/hooks/useCourseInsights";

export default function FiveMinuteDialog({ courses }: { courses: CourseInsight[] }) {
  const { subjects, addSession } = useStudy();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<MicroTask[]>([]);
  const [index, setIndex] = useState(0);
  const [minutes, setMinutes] = useState("5");
  const [subjectId, setSubjectId] = useState("");
  const [saving, setSaving] = useState(false);

  const task = tasks[index] ?? null;
  const pickSubject = (t: MicroTask | null) =>
    setSubjectId(subjects.find((s) => t?.subjectIds.includes(s.id))?.id ?? subjects[0]?.id ?? "");

  const onOpenChange = (o: boolean) => {
    if (o) {
      const list = microTasks(courses);
      setTasks(list);
      setIndex(0);
      setMinutes("5");
      pickSubject(list[0] ?? null);
    }
    setOpen(o);
  };

  const next = () => {
    const i = (index + 1) % tasks.length;
    setIndex(i);
    pickSubject(tasks[i]);
  };

  const total = Math.floor(Number(minutes) || 0);
  const canSave = !!task && !!subjectId && total > 0 && total <= 240 && !saving;

  // Logs a real session so the heatmap and streak count it; planned blocks stay untouched.
  const save = async () => {
    if (!task) return;
    setSaving(true);
    const now = new Date();
    const end = timeToMinutes(format(now, "HH:mm"));
    try {
      await addSession({
        id: crypto.randomUUID(),
        subjectId,
        courseId: task.courseId,
        date: format(now, "yyyy-MM-dd"),
        startTime: minutesToTime(Math.max(0, end - total)),
        endTime: minutesToTime(end),
        hours: Math.round((total / 60) * 100) / 100,
        notes: serializeNotes({ module: task.module, studied: `Modo 5 Minutos: ${task.text}` }),
      });
      toast.success("Boa! Cada minuto conta para a sua sequência.");
      setOpen(false);
    } catch {
      toast.error("Não foi possível registrar a atividade.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline"><Timer className="w-4 h-4" />Modo 5 Minutos</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modo 5 Minutos</DialogTitle>
          <DialogDescription>
            Sem tempo ou sem ânimo? Faça só uma coisa pequena. Começar já mantém o hábito vivo.
          </DialogDescription>
        </DialogHeader>

        {!task ? (
          <p className="text-sm text-muted-foreground">Nenhum curso em andamento. Cadastre um curso para receber sugestões.</p>
        ) : subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Crie uma matéria para registrar sessões.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4" aria-live="polite">
              <p className="text-xs text-muted-foreground">{task.courseName}</p>
              <p className="mt-1 font-medium">{task.text}</p>
              {tasks.length > 1 && (
                <Button variant="link" className="mt-1 h-auto p-0 text-xs" onClick={next}>Outra sugestão</Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="micro-minutes">Minutos estudados</Label>
                <Input
                  id="micro-minutes"
                  type="number"
                  min={1}
                  max={240}
                  inputMode="numeric"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
              </div>
              <div>
                <Label>Matéria</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Registra uma sessão real. O bloco planejado de hoje não é marcado como concluído.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Agora não</Button>
          <Button onClick={save} disabled={!canSave}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
