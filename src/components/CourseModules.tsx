import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, ChevronRight, Clock, FileJson, Plus, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import RowActions from "@/components/page/RowActions";
import { ColorDot } from "@/components/page/bits";
import { toast } from "sonner";
import ImportModulesDialog from "@/components/ImportModulesDialog";
import { moduleLessonsDone, type CourseLesson, type CourseModule } from "@/hooks/useCourseModules";
import type { ImportedModule } from "@/lib/courseImport";

type ModuleFields = { name: string; description: string; lesson_count: number; duration_minutes: number | null; subject_ids: string[] };

interface SubjectLite { id: string; name: string; color: string }

/** Groups consecutive lessons of the same submodule; lessons without one stay loose. */
function lessonGroups(lessons: CourseLesson[]) {
  const groups: { key: string; section: string | null; lessons: CourseLesson[] }[] = [];
  for (const l of lessons) {
    const last = groups[groups.length - 1];
    if (last && last.section === (l.section ?? null)) last.lessons.push(l);
    else groups.push({ key: l.id, section: l.section ?? null, lessons: [l] });
  }
  return groups;
}

export function CourseModules({
  courseId,
  modules,
  subjects,
  onAdd,
  onUpdate,
  onToggleComplete,
  onSetLessons,
  onImport,
  onDelete,
}: {
  courseId: string;
  modules: CourseModule[];
  subjects: SubjectLite[];
  onAdd: (v: Omit<CourseModule, "id" | "position" | "completed" | "completed_at">) => Promise<void> | void;
  onUpdate: (id: string, patch: Partial<CourseModule>) => Promise<void> | void;
  onToggleComplete: (id: string) => Promise<void> | void;
  onSetLessons: (moduleId: string, lessonIds: string[], completed: boolean) => Promise<void> | void;
  onImport: (modules: ImportedModule[]) => Promise<boolean>;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [editing, setEditing] = useState<CourseModule | null>(null);

  const totalLessons = modules.reduce((a, m) => a + (m.lesson_count || 0), 0);
  const doneCount = modules.filter((m) => m.completed).length;
  const summary = [
    `Módulos (${modules.length})`,
    totalLessons > 0 ? `${totalLessons} aulas` : null,
    doneCount > 0 ? `${doneCount} ${doneCount === 1 ? "concluído" : "concluídos"}` : null,
  ].filter(Boolean).join(", ");

  const toggleModuleOpen = (id: string) =>
    setOpenModules((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const handleSave = async (v: ModuleFields) => {
    if (editing) {
      await onUpdate(editing.id, v);
      toast.success("Módulo salvo");
    } else {
      await onAdd({ course_id: courseId, ...v, description: v.description || null });
      toast.success("Módulo criado");
    }
    setDialogOpen(false);
    setEditing(null);
  };

  return (
    <div className="mt-5 border-t pt-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden />
          {summary}
        </button>
        <Button variant="ghost" size="sm" className="ml-auto h-8 px-2" onClick={() => setImportOpen(true)}>
          <FileJson className="h-3.5 w-3.5" />Importar JSON
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => { setEditing(null); setDialogOpen(true); setOpen(true); }}
        >
          <Plus className="h-3.5 w-3.5" />Novo módulo
        </Button>
      </div>

      {open && (
        <div className="mt-3">
          {modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum módulo ainda. Divida o curso em módulos para organizar as aulas.</p>
          ) : (
            <ol className="divide-y rounded-lg bg-muted/40">
              {modules.map((m, i) => {
                const mSubjects = subjects.filter((s) => (m.subject_ids || []).includes(s.id));
                const lessons = m.lessons ?? [];
                const lessonsOpen = openModules.includes(m.id);
                return (
                  <li key={m.id} className="flex items-start gap-3 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => onToggleComplete(m.id)}
                      aria-pressed={m.completed}
                      aria-label={m.completed ? `Desmarcar módulo ${m.name} como concluído` : `Marcar módulo ${m.name} como concluído`}
                      className={cn(
                        "mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                        m.completed
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40 hover:border-primary",
                      )}
                    >
                      {m.completed && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
                    </button>
                    <span className="w-5 shrink-0 pt-0.5 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className={cn("text-sm font-medium", m.completed && "text-muted-foreground")}>{m.name}</p>
                        {(m.duration_minutes ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                            <Clock className="h-3 w-3" aria-hidden />{formatDuration((m.duration_minutes ?? 0) / 60)}
                          </span>
                        )}
                        {lessons.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleModuleOpen(m.id)}
                            aria-expanded={lessonsOpen}
                            aria-label={`Aulas do módulo ${m.name}: ${moduleLessonsDone(m)} de ${lessons.length} concluídas`}
                            className="inline-flex items-center gap-1 rounded text-xs tabular-nums text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <ChevronRight className={`h-3 w-3 transition-transform ${lessonsOpen ? "rotate-90" : ""}`} aria-hidden />
                            {moduleLessonsDone(m)} de {lessons.length} aulas
                          </button>
                        ) : m.lesson_count > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <PlayCircle className="h-3 w-3" aria-hidden />{m.lesson_count} aulas
                          </span>
                        )}
                      </div>
                      {m.description && <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>}
                      {mSubjects.length > 0 && (
                        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          {mSubjects.map((s) => (
                            <li key={s.id} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <ColorDot color={s.color} className="h-2 w-2" />
                              {s.name}
                            </li>
                          ))}
                        </ul>
                      )}
                      {lessonsOpen && (
                        <ol className="mt-2 space-y-0.5">
                          {lessonGroups(lessons).map((g) => {
                            const lessonList = g.lessons.map((l) => (
                              <li key={l.id}>
                                <label className="flex cursor-pointer items-center gap-2 rounded py-1 text-sm">
                                  <Checkbox checked={l.completed} onCheckedChange={() => onSetLessons(m.id, [l.id], !l.completed)} />
                                  <span className={cn("min-w-0 flex-1", l.completed && "text-muted-foreground")}>{l.name}</span>
                                  {(l.duration_seconds ?? 0) > 0 && (
                                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                      {formatDuration((l.duration_seconds ?? 0) / 3600)}
                                    </span>
                                  )}
                                </label>
                              </li>
                            ));
                            if (g.section === null) return lessonList;
                            const done = g.lessons.filter((l) => l.completed).length;
                            const allDone = done === g.lessons.length;
                            return (
                              <li key={g.key}>
                                <label className="flex cursor-pointer items-center gap-2 rounded py-1 text-sm font-medium">
                                  <Checkbox
                                    checked={allDone ? true : done > 0 ? "indeterminate" : false}
                                    onCheckedChange={() => onSetLessons(m.id, g.lessons.map((l) => l.id), !allDone)}
                                    aria-label={`${allDone ? "Desmarcar" : "Marcar"} todas as aulas de ${g.section}`}
                                  />
                                  <span className={cn("min-w-0 flex-1", allDone && "text-muted-foreground")}>{g.section}</span>
                                  <span className="shrink-0 text-xs font-normal tabular-nums text-muted-foreground">{done} de {g.lessons.length}</span>
                                </label>
                                <ol className="ml-6 space-y-0.5">{lessonList}</ol>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>
                    <RowActions
                      itemLabel={`módulo ${m.name}`}
                      onEdit={() => { setEditing(m); setDialogOpen(true); }}
                      onDelete={() => onDelete(m.id)}
                    />
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      <ImportModulesDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={async (imported) => {
          const done = await onImport(imported);
          if (done) setOpen(true);
          return done;
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar módulo" : "Novo módulo"}</DialogTitle></DialogHeader>
          <ModuleForm
            key={editing?.id || "new"}
            initial={editing}
            subjects={subjects}
            onSave={handleSave}
            onCancel={() => { setDialogOpen(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ModuleForm({ initial, subjects, onSave, onCancel }: {
  initial: CourseModule | null;
  subjects: SubjectLite[];
  onSave: (v: ModuleFields) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [lessons, setLessons] = useState(initial?.lesson_count ? String(initial.lesson_count) : "");
  const [selected, setSelected] = useState<string[]>(initial?.subject_ids || []);
  const initialMinutes = initial?.duration_minutes ?? 0;
  const [durHours, setDurHours] = useState(initialMinutes >= 60 ? String(Math.floor(initialMinutes / 60)) : "");
  const [durMinutes, setDurMinutes] = useState(initialMinutes % 60 ? String(initialMinutes % 60) : "");
  const durationTotal = (parseInt(durHours) || 0) * 60 + (parseInt(durMinutes) || 0);

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="module-name">Nome do módulo</Label>
        <Input id="module-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Front-end" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="module-description">Descrição <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Textarea id="module-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div role="group" aria-labelledby="module-duration-label" className="space-y-2">
          <p id="module-duration-label" className="text-sm font-medium leading-none">
            Duração <span className="font-normal text-muted-foreground">(opcional)</span>
          </p>
          <div className="flex items-center gap-2">
            <Input
              id="module-hours"
              aria-label="Horas"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={durHours}
              onChange={(e) => setDurHours(e.target.value)}
              placeholder="0"
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">h</span>
            <Input
              id="module-minutes"
              aria-label="Minutos"
              type="number"
              inputMode="numeric"
              min="0"
              max="59"
              step="1"
              value={durMinutes}
              onChange={(e) => setDurMinutes(e.target.value)}
              placeholder="0"
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">min</span>
          </div>
          <p className="text-xs text-muted-foreground">Soma na carga horária do curso.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="module-lessons">Quantidade de aulas</Label>
          <Input id="module-lessons" type="number" inputMode="numeric" min="0" step="1" value={lessons} onChange={(e) => setLessons(e.target.value)} placeholder="Ex.: 12" />
        </div>
      </div>
      <div>
        <Label>Matérias estudadas neste módulo</Label>
        {subjects.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-1">Nenhuma matéria disponível.</p>
        ) : (
          <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
            {subjects.map((s) => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
                <ColorDot color={s.color} />
                <span className="text-sm">{s.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          disabled={!name.trim()}
          onClick={() => onSave({
            name: name.trim(),
            description,
            lesson_count: parseInt(lessons) || 0,
            duration_minutes: durationTotal > 0 ? durationTotal : null,
            subject_ids: selected,
          })}
        >
          {initial ? "Salvar" : "Criar"}
        </Button>
      </div>
    </div>
  );
}
