import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ArrowUp, Plus, Unlink } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RowActions from "@/components/page/RowActions";
import { useStudy } from "@/contexts/StudyContext";
import { toast } from "@/hooks/use-toast";
import { formatDuration, formatHours, minutesToTime, timeToMinutes } from "@/lib/format";
import { STEP_STATUS_LABELS, StepNode, effectiveStatus, flattenNode, isLocked } from "@/lib/learningPath";
import { parseNotes, serializeNotes } from "@/lib/sessionNotes";
import type { StudySession } from "@/lib/types";

const LINKABLE_SESSIONS = 30;

interface StepPanelProps {
  node: StepNode;
  courseId: string | null;
  /** Subjects of the path's course, used as the default for a new session. */
  courseSubjectIds: string[];
  moduleName: string | null;
  canMoveUp: boolean;
  onClose: () => void;
  onStart: () => void;
  onSetCompleted: (completed: boolean) => void;
  onMoveUp: () => void;
  onAddTopic: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveNote: (note: string) => Promise<void>;
  /** A session was added or linked. Hours must be read again. */
  onSessionsChanged: (added: boolean) => Promise<void>;
}

const sessionLabel = (s: StudySession, subjectName?: string) =>
  `${format(parseISO(s.date), "dd/MM/yyyy")} · ${subjectName || "Matéria removida"} · ${formatDuration(s.hours)}`;

function RegisterStudy({ node, courseId, courseSubjectIds, onDone }: {
  node: StepNode;
  courseId: string | null;
  courseSubjectIds: string[];
  onDone: () => Promise<void>;
}) {
  const { subjects, addSession } = useStudy();
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(() => format(new Date(), "HH:mm"));
  const [minutes, setMinutes] = useState("30");
  const [subjectId, setSubjectId] = useState(
    node.subjectId ?? subjects.find((s) => courseSubjectIds.includes(s.id))?.id ?? "",
  );
  const [studied, setStudied] = useState("");
  const [saving, setSaving] = useState(false);

  const total = Math.floor(Number(minutes) || 0);
  const canSave = !!date && !!startTime && !!subjectId && total > 0 && !saving;

  const save = async () => {
    setSaving(true);
    try {
      await addSession({
        id: crypto.randomUUID(),
        subjectId,
        courseId,
        stepId: node.id,
        date,
        startTime,
        endTime: minutesToTime(timeToMinutes(startTime) + total),
        hours: Math.round((total / 60) * 100) / 100,
        notes: serializeNotes({ module: null, studied }),
      });
      setStudied("");
      await onDone();
      toast({ title: "Sessão registrada" });
    } catch (e) {
      console.error("Erro ao registrar sessão:", e);
      toast({ title: "Não foi possível registrar a sessão", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (subjects.length === 0) {
    return <p className="text-sm text-muted-foreground">Crie uma matéria para registrar sessões.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3 space-y-1 sm:col-span-1">
          <Label htmlFor="step-session-date">Data</Label>
          <Input id="step-session-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1 sm:col-span-1">
          <Label htmlFor="step-session-start">Início</Label>
          <Input id="step-session-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="step-session-minutes">Minutos</Label>
          <Input id="step-session-minutes" type="number" min="1" step="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="step-session-subject">Matéria</Label>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger id="step-session-subject"><SelectValue placeholder="Selecione a matéria" /></SelectTrigger>
          <SelectContent>
            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="step-session-studied">O que foi estudado <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Textarea id="step-session-studied" rows={2} value={studied} onChange={(e) => setStudied(e.target.value)} />
      </div>
      <Button size="sm" onClick={save} disabled={!canSave}><Plus className="w-4 h-4" />Registrar sessão</Button>
    </div>
  );
}

/** Details of one roadmap box: status, note, sessions, and where to log new study. */
export default function StepPanel(props: StepPanelProps) {
  const { node, courseId, courseSubjectIds, moduleName, canMoveUp, onClose, onSaveNote, onSessionsChanged } = props;
  const { sessions, subjects, updateSession } = useStudy();
  const [note, setNote] = useState(node.studyNote);

  const status = effectiveStatus(node);
  const locked = isLocked(node);
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name;

  const nodeIds = new Set(flattenNode(node).map((n) => n.id));
  const linked = sessions
    .filter((s) => s.stepId && nodeIds.has(s.stepId))
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
  const linkable = sessions
    .filter((s) => !s.stepId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
    .slice(0, LINKABLE_SESSIONS);

  const setLink = async (session: StudySession, stepId: string | null) => {
    try {
      await updateSession({ ...session, stepId });
      await onSessionsChanged(false);
    } catch (e) {
      console.error("Erro ao vincular sessão:", e);
      toast({ title: "Não foi possível atualizar a sessão", variant: "destructive" });
    }
  };

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full space-y-6 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="pr-6">{node.name}</SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
              <Badge variant="secondary" className="font-normal">{STEP_STATUS_LABELS[status]}</Badge>
              {node.estimatedHours > 0 && <span>{formatHours(node.estimatedHours)} estimadas</span>}
              <span>{formatHours(node.actualHours)} estudadas</span>
              {moduleName && <span>Módulo: {moduleName}</span>}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap items-center gap-1">
          {status === "not_started" && <Button size="sm" variant="outline" onClick={props.onStart}>Iniciar</Button>}
          {status !== "completed" && <Button size="sm" onClick={() => props.onSetCompleted(true)}>Concluir</Button>}
          {status === "completed" && !locked && (
            <Button size="sm" variant="ghost" onClick={() => props.onSetCompleted(false)}>Reabrir</Button>
          )}
          <Button size="sm" variant="outline" onClick={props.onAddTopic}><Plus className="w-4 h-4" />Subtópico</Button>
          {canMoveUp && (
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={props.onMoveUp} aria-label={`Mover ${node.name} para cima`}>
              <ArrowUp className="w-4 h-4" />
            </Button>
          )}
          <RowActions
            itemLabel={`etapa ${node.name}`}
            deleteWarning={node.children.length > 0 ? "Os subtópicos serão excluídos junto." : undefined}
            onEdit={props.onEdit}
            onDelete={props.onDelete}
          />
        </div>
        {status === "completed" && locked && (
          <p className="text-xs text-muted-foreground">Concluído pelas horas estimadas ou pelo módulo do curso.</p>
        )}

        <section className="space-y-2">
          <Label htmlFor="step-note" className="font-sans text-sm font-semibold">Anotação</Label>
          <Textarea
            id="step-note"
            rows={3}
            placeholder="O que estudou e onde: link, livro, caderno"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button size="sm" variant="outline" disabled={note === node.studyNote} onClick={() => void onSaveNote(note)}>
            Salvar anotação
          </Button>
        </section>

        <section className="space-y-2">
          <h3 className="font-sans text-sm font-semibold">Sessões ligadas</h3>
          {linked.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sessão ligada.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {linked.map((s) => {
                const studied = parseNotes(s.notes).topics;
                return (
                  <li key={s.id} className="flex items-start gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="tabular-nums">{sessionLabel(s, subjectName(s.subjectId))}</p>
                      {studied && <p className="mt-0.5 break-words text-xs text-muted-foreground">{studied}</p>}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => void setLink(s, null)}
                      aria-label={`Desvincular sessão de ${s.date}`}
                    >
                      <Unlink className="w-4 h-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          {linkable.length > 0 && (
            <div className="space-y-1 pt-1">
              <Label htmlFor="step-link-session">Vincular sessão existente</Label>
              <Select
                value=""
                onValueChange={(id) => {
                  const session = linkable.find((s) => s.id === id);
                  if (session) void setLink(session, node.id);
                }}
              >
                <SelectTrigger id="step-link-session"><SelectValue placeholder="Selecione a sessão" /></SelectTrigger>
                <SelectContent>
                  {linkable.map((s) => <SelectItem key={s.id} value={s.id}>{sessionLabel(s, subjectName(s.subjectId))}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-sans text-sm font-semibold">Registrar estudo</h3>
          <RegisterStudy
            node={node}
            courseId={courseId}
            courseSubjectIds={courseSubjectIds}
            onDone={() => onSessionsChanged(true)}
          />
        </section>
      </SheetContent>
    </Sheet>
  );
}
