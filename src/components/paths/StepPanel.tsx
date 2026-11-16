import { useState } from "react";
import { format, parseISO } from "date-fns";
import hljs from "highlight.js/lib/common";
import { ArrowUp, Plus, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import RowActions from "@/components/page/RowActions";
import { formatHours } from "@/lib/format";
import { STEP_STATUS_LABELS, StepNode, StudyLogEntry, effectiveStatus, isLocked, parseStudyLog } from "@/lib/learningPath";

interface StepPanelProps {
  node: StepNode;
  moduleName: string | null;
  canMoveUp: boolean;
  onClose: () => void;
  onStart: () => void;
  onSetCompleted: (completed: boolean) => void;
  onMoveUp: () => void;
  onAddTopic: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Saves the whole log. added is true when an entry was added, false when one was removed. */
  onSaveLog: (entries: StudyLogEntry[], added: boolean) => Promise<boolean>;
}

/** Details of one roadmap box: status, actions and a dated log of what was studied. */
export default function StepPanel(props: StepPanelProps) {
  const { node, moduleName, canMoveUp, onClose, onSaveLog } = props;
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [text, setText] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  const status = effectiveStatus(node);
  const locked = isLocked(node);
  const entries = parseStudyLog(node.studyNote);
  // Newest first; undated legacy note last
  const shown = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => (b.entry.date ?? "").localeCompare(a.entry.date ?? ""));

  const save = async (next: StudyLogEntry[], added: boolean) => {
    setSaving(true);
    try {
      // Keep the typed text when the save failed
      if ((await onSaveLog(next, added)) && added) {
        setText("");
        setCode("");
      }
    } finally {
      setSaving(false);
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
              {node.actualHours > 0 && <span>{formatHours(node.actualHours)} estudadas</span>}
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

        <section className="space-y-3">
          <h3 className="font-sans text-sm font-semibold">Registro de estudo</h3>
          <div className="space-y-1">
            <Label htmlFor="step-log-date">Data</Label>
            <Input id="step-log-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="step-log-text">O que estudou</Label>
            <Textarea
              id="step-log-text"
              rows={3}
              placeholder="Resumo e onde: link, livro, caderno"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="step-log-code">Exemplo de código (opcional)</Label>
            <Textarea
              id="step-log-code"
              rows={4}
              spellCheck={false}
              className="font-mono text-xs"
              placeholder="<p>Olá</p>"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            disabled={!date || (!text.trim() && !code.trim()) || saving}
            onClick={() => void save([...entries, { date, text: text.trim(), ...(code.trim() ? { code } : {}) }], true)}
          >
            <Plus className="w-4 h-4" />Registrar
          </Button>

          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada registrado ainda.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {shown.map(({ entry, index }) => (
                <li key={index} className="flex items-start gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    {entry.date && (
                      <p className="text-xs tabular-nums text-muted-foreground">{format(parseISO(entry.date), "dd/MM/yyyy")}</p>
                    )}
                    {entry.text && <p className="whitespace-pre-wrap break-words">{entry.text}</p>}
                    {entry.code && (
                      <pre className="mt-1 max-h-64 overflow-auto rounded bg-muted p-2 font-mono text-xs">
                        {/* highlightAuto escapes the code; output is only hljs spans */}
                        <code dangerouslySetInnerHTML={{ __html: hljs.highlightAuto(entry.code).value }} />
                      </pre>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={saving}
                    onClick={() => void save(entries.filter((_, i) => i !== index), false)}
                    aria-label={entry.date ? `Excluir registro de ${entry.date}` : "Excluir registro"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </SheetContent>
    </Sheet>
  );
}
