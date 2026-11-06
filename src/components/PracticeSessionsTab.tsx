import { useStudy } from "@/contexts/StudyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, Wrench } from "lucide-react";
import EmptyState from "@/components/page/EmptyState";
import RowActions from "@/components/page/RowActions";
import DayGroupedList from "@/components/page/DayGroupedList";
import { ColorDot } from "@/components/page/bits";
import { formatDuration } from "@/lib/format";
import { PracticeSession, PRACTICE_TYPE_LABELS, PracticeType } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface CourseOption { id: string; name: string; color: string; }

function minutesToTime(totalMinutes: number): string {
  const m = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function PracticeSessionsTab() {
  const { practiceSessions, subjects, addPracticeSession, updatePracticeSession, deletePracticeSession } = useStudy();
  const { user } = useAuth();
  const [editing, setEditing] = useState<PracticeSession | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);

  const fetchCourses = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("courses").select("id, name, color").eq("user_id", user.id).eq("completed", false).order("name");
    setCourses((data || []).map((c: any) => ({ id: c.id, name: c.name, color: c.color })));
  }, [user]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const sorted = [...practiceSessions].sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

  const handleSave = async (
    data: { practiceType: PracticeType; subjectId: string | null; courseId: string | null; date: string; startTime: string; minutes: number; notes: string }
  ) => {
    const startMin = timeToMinutes(data.startTime);
    const endTime = minutesToTime(startMin + data.minutes);
    const hours = Math.round((data.minutes / 60) * 100) / 100;
    if (editing) {
      updatePracticeSession({
        id: editing.id,
        practiceType: data.practiceType,
        subjectId: data.subjectId,
        courseId: data.courseId,
        date: data.date,
        startTime: data.startTime,
        endTime,
        hours,
        notes: data.notes,
      });
    } else {
      addPracticeSession({
        id: crypto.randomUUID(),
        practiceType: data.practiceType,
        subjectId: data.subjectId,
        courseId: data.courseId,
        date: data.date,
        startTime: data.startTime,
        endTime,
        hours,
        notes: data.notes,
      });
    }
    setEditing(null);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Exercícios, projetos e desafios. Curso e matéria são opcionais.
        </p>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="self-start sm:self-auto"><Plus className="w-4 h-4" />Nova prática</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar prática" : "Nova prática"}</DialogTitle>
              <DialogDescription>
                Registre uma atividade prática. Curso e matéria são opcionais.
              </DialogDescription>
            </DialogHeader>
            <PracticeForm
              subjects={subjects}
              courses={courses}
              initial={editing}
              onSave={handleSave}
              onCancel={() => { setDialogOpen(false); setEditing(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          framed
          title="Nenhuma prática ainda"
          text="Registre exercícios, projetos e desafios para acompanhar o tempo de prática."
          action={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" />Nova prática</Button>}
        />
      ) : (
        <DayGroupedList
          items={sorted}
          getDay={(p) => p.date}
          getHours={(p) => p.hours}
          getKey={(p) => p.id}
          renderRow={(p) => {
            const sub = p.subjectId ? subjects.find((x) => x.id === p.subjectId) : null;
            const course = p.courseId ? courses.find((c) => c.id === p.courseId) : null;
            const typeLabel = PRACTICE_TYPE_LABELS[p.practiceType];
            return (
              <div className="flex items-start gap-4 px-4 py-3.5 sm:px-5">
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Wrench className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-sm font-medium">{typeLabel}</p>
                    {sub && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ColorDot color={sub.color} className="h-2 w-2" />
                        {sub.name}
                      </span>
                    )}
                    {course && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ColorDot color={course.color} className="h-2 w-2" />
                        {course.name}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{p.startTime}–{p.endTime}</p>
                  {p.notes && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.notes}</p>}
                </div>
                <span className="shrink-0 pt-0.5 text-sm font-medium tabular-nums">{formatDuration(p.hours)}</span>
                <RowActions
                  itemLabel={`prática de ${typeLabel.toLowerCase()} às ${p.startTime}`}
                  onEdit={() => { setEditing(p); setDialogOpen(true); }}
                  onDelete={() => deletePracticeSession(p.id)}
                />
              </div>
            );
          }}
        />
      )}
    </div>
  );
}

function PracticeForm({
  subjects, courses, initial, onSave, onCancel,
}: {
  subjects: { id: string; name: string; color: string }[];
  courses: CourseOption[];
  initial: PracticeSession | null;
  onSave: (data: { practiceType: PracticeType; subjectId: string | null; courseId: string | null; date: string; startTime: string; minutes: number; notes: string }) => void;
  onCancel: () => void;
}) {
  const [practiceType, setPracticeType] = useState<PracticeType>(initial?.practiceType || "exercise");
  const [subjectId, setSubjectId] = useState<string | null>(initial?.subjectId ?? null);
  const [courseId, setCourseId] = useState<string | null>(initial?.courseId ?? null);
  const [date, setDate] = useState(initial?.date || format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(initial?.startTime || "08:00");
  const [minutes, setMinutes] = useState<number>(initial ? Math.round(initial.hours * 60) : 30);
  const [notes, setNotes] = useState(initial?.notes || "");

  const canSave = !!date && !!startTime && minutes > 0 && !!practiceType;

  return (
    <div className="space-y-4">
      <div>
        <Label>Tipo de prática</Label>
        <Select value={practiceType} onValueChange={(v) => setPracticeType(v as PracticeType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PRACTICE_TYPE_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Data</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>Início</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Duração (minutos)</Label>
        <Input
          type="number"
          min="1"
          step="1"
          value={minutes}
          onChange={(e) => setMinutes(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
        />
      </div>

      <div>
        <Label>Matéria (opcional)</Label>
        <Select value={subjectId || "__none__"} onValueChange={(v) => setSubjectId(v === "__none__" ? null : v)}>
          <SelectTrigger><SelectValue placeholder="Sem matéria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sem matéria</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Curso (opcional)</Label>
        <Select value={courseId || "__none__"} onValueChange={(v) => setCourseId(v === "__none__" ? null : v)}>
          <SelectTrigger><SelectValue placeholder="Sem curso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sem curso</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c.color }} />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Notas / Resultado (opcional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="O que foi feito, link do projeto, exercício resolvido…"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button disabled={!canSave} onClick={() => onSave({ practiceType, subjectId, courseId, date, startTime, minutes, notes })}>
          {initial ? "Salvar" : "Registrar"}
        </Button>
      </div>
    </div>
  );
}
