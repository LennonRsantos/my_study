import AppLayout from "@/components/AppLayout";
import { BrandIcon } from "@/components/BrandIcon";
import { useStudy } from "@/contexts/StudyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/useCategories";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, X } from "lucide-react";
import { StudySession, Subject } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { CategoryManager } from "@/components/CategoryManager";
import { CategoryBadges } from "@/components/CategoryBadges";
import { CategoryPicker } from "@/components/CategoryPicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PracticeSessionsTab from "@/components/PracticeSessionsTab";
import { toast } from "sonner";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import RowActions from "@/components/page/RowActions";
import DayGroupedList from "@/components/page/DayGroupedList";
import { ColorDot } from "@/components/page/bits";
import { formatDuration, minutesToTime, timeToMinutes } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";
import { parseNotes, serializeNotes } from "@/lib/sessionNotes";
import { useCourseModules, CourseModule } from "@/hooks/useCourseModules";
import { useLearningPaths } from "@/hooks/useLearningPaths";

interface CourseOption {
  id: string;
  name: string;
  color: string;
}

interface SubjectAllocation {
  subjectId: string;
  minutes: number;
  courseId: string | null;
  categoryIds: string[];
  moduleId: string | null;
  moduleSubjectIds: string[];
  studied: string;
}

const blankAllocation = (): SubjectAllocation => ({
  subjectId: "",
  minutes: 30,
  courseId: null,
  categoryIds: [],
  moduleId: null,
  moduleSubjectIds: [],
  studied: "",
});

export default function SessionsPage() {
  const { sessions, subjects, addSession, updateSession, deleteSession } = useStudy();
  const { user } = useAuth();
  const { modules, modulesFor, setModuleCompleted } = useCourseModules();
  const { paths } = useLearningPaths();
  const { categories, getCategoriesForItem, setItemCategories, getItemsInCategory, getDescendantIds, addCategory, updateCategory, deleteCategory } = useCategories("session");
  const [editing, setEditing] = useState<StudySession | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("courses").select("id, name, color").eq("user_id", user.id).eq("completed", false).order("name");
    setCourses((data || []).map((c: any) => ({ id: c.id, name: c.name, color: c.color })));
  }, [user]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const stepLabels = useMemo(
    () => new Map(paths.flatMap((p) => p.steps.map((st) => [st.id, `${p.name} › ${st.name}`] as const))),
    [paths],
  );

  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

  const filtered = filterCategory
    ? (() => {
        // Include sessions from the selected category AND all of its subcategories
        const targetCatIds = getDescendantIds(filterCategory);
        const ids = new Set<string>();
        targetCatIds.forEach((cid) => getItemsInCategory(cid, "session").forEach((sid) => ids.add(sid)));
        return sorted.filter((s) => ids.has(s.id));
      })()
    : sorted;

  const notesFor = (alloc: SubjectAllocation): string => {
    const mod = alloc.moduleId ? modules.find((m) => m.id === alloc.moduleId) : undefined;
    return serializeNotes({
      module: mod ? { id: mod.id, name: mod.name, subjectIds: alloc.moduleSubjectIds } : null,
      studied: alloc.studied,
    });
  };

  // Marks each selected module completed. Returns names of modules newly completed.
  const completeModules = async (moduleIds: string[]): Promise<string[]> => {
    const names: string[] = [];
    for (const id of Array.from(new Set(moduleIds))) {
      const mod = modules.find((m) => m.id === id);
      if (!mod || mod.completed) continue;
      await setModuleCompleted(id, true);
      names.push(mod.name);
    }
    return names;
  };

  const handleSave = async (
    base: { date: string; startTime: string },
    allocations: SubjectAllocation[],
  ) => {
    try {
      if (editing) {
        const alloc = allocations[0];
        const startMin = timeToMinutes(base.startTime);
        const endTime = minutesToTime(startMin + alloc.minutes);
        await updateSession({
          id: editing.id,
          subjectId: alloc.subjectId,
          courseId: alloc.courseId,
          stepId: editing.stepId,
          date: base.date,
          startTime: base.startTime,
          endTime,
          hours: Math.round((alloc.minutes / 60) * 100) / 100,
          notes: notesFor(alloc),
        });
        await setItemCategories(editing.id, "session", alloc.categoryIds);
      } else {
        let cursor = timeToMinutes(base.startTime);
        for (const alloc of allocations) {
          const id = crypto.randomUUID();
          const segStart = minutesToTime(cursor);
          const segEnd = minutesToTime(cursor + alloc.minutes);
          cursor += alloc.minutes;
          await addSession({
            id,
            subjectId: alloc.subjectId,
            courseId: alloc.courseId,
            date: base.date,
            startTime: segStart,
            endTime: segEnd,
            hours: Math.round((alloc.minutes / 60) * 100) / 100,
            notes: notesFor(alloc),
          });
          if (alloc.categoryIds.length > 0) {
            await setItemCategories(id, "session", alloc.categoryIds);
          }
        }
      }
      const done = await completeModules(allocations.map((a) => a.moduleId).filter((id): id is string => !!id));
      const base_msg = editing ? "Sessão atualizada" : allocations.length > 1 ? "Sessões registradas" : "Sessão registrada";
      toast.success(done.length > 0 ? `${base_msg} · módulo ${done.join(", ")} concluído` : base_msg);
      setEditing(null);
      setDialogOpen(false);
    } catch (e: any) {
      console.error("Erro ao salvar sessão:", e);
      toast.error(e?.message || "Não foi possível salvar a sessão. Tente novamente.");
    }
  };


  return (
    <AppLayout>
      <PageHeader title="Sessões" description="Tudo o que você estudou, dia a dia." />

      <Tabs defaultValue="study" className="space-y-6">
        <TabsList>
          <TabsTrigger value="study">Estudo</TabsTrigger>
          <TabsTrigger value="practice">Prática</TabsTrigger>
        </TabsList>

        <TabsContent value="study" className="mt-0 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Sessões de estudo ligadas a uma matéria.</p>
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="self-start sm:self-auto"><Plus className="w-4 h-4" />Nova sessão</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editing ? "Editar sessão" : "Nova sessão"}</DialogTitle>
                  <DialogDescription>
                    {editing
                      ? "Altere os detalhes desta sessão de estudo."
                      : "Adicione uma ou mais matérias e quantos minutos dedicou a cada uma."}
                  </DialogDescription>
                </DialogHeader>
                <SessionForm
                  subjects={subjects}
                  courses={courses}
                  categories={categories}
                  initialCategories={editing ? getCategoriesForItem(editing.id, "session").map((c) => c.id) : []}
                  initial={editing}
                  modulesFor={modulesFor}
                  onSave={handleSave}
                  onCancel={() => { setDialogOpen(false); setEditing(null); }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <CategoryManager categories={categories} selectedFilter={filterCategory} onSelectFilter={setFilterCategory} onAdd={addCategory} onUpdate={updateCategory} onDelete={deleteCategory} />

          {filtered.length === 0 ? (
            <EmptyState
              framed
              title={filterCategory ? "Nada nesta categoria" : "Nenhuma sessão ainda"}
              text={filterCategory ? "Nenhuma sessão foi marcada com esta categoria." : "Registre o que estudou hoje para começar a preencher seu mapa de estudo."}
              action={!filterCategory && <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" />Nova sessão</Button>}
            />
          ) : (
            <DayGroupedList
              items={filtered}
              getDay={(s) => s.date}
              getHours={(s) => s.hours}
              getKey={(s) => s.id}
              renderRow={(s) => {
                const sub = subjects.find((x) => x.id === s.subjectId);
                const course = courses.find((c) => c.id === s.courseId);
                const cats = getCategoriesForItem(s.id, "session");
                const n = parseNotes(s.notes);
                const stepLabel = s.stepId ? stepLabels.get(s.stepId) : undefined;
                const label = `sessão de ${sub?.name || "matéria removida"} às ${s.startTime}`;
                return (
                  <div className="flex items-start gap-4 px-4 py-3.5 sm:px-5">
                    <SubjectMark subject={sub} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-sm font-medium">{sub?.name || "Matéria removida"}</p>
                        {course && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ColorDot color={course.color} className="h-2 w-2" />
                            {course.name}
                          </span>
                        )}
                        <CategoryBadges categories={cats} />
                      </div>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        {s.startTime}–{s.endTime}
                      </p>
                      {(stepLabel || n.module || n.courseSessions.length > 0 || n.topics) && (
                        <dl className="mt-2 space-y-1.5 text-xs">
                          {stepLabel && (
                            <div>
                              <dt className="inline font-medium text-foreground">Trilha: </dt>
                              <dd className="inline text-muted-foreground">{stepLabel}</dd>
                            </div>
                          )}
                          {n.module && (
                            <div>
                              <dt className="inline font-medium text-foreground">Módulo concluído: </dt>
                              <dd className="inline text-muted-foreground">{n.module.name || "—"}</dd>
                            </div>
                          )}
                          {n.module && n.module.subjectIds.length > 0 && (
                            <div>
                              <dt className="inline font-medium text-foreground">Matérias: </dt>
                              <dd className="inline text-muted-foreground">
                                {subjects.filter((x) => n.module!.subjectIds.includes(x.id)).map((x) => x.name).join(", ")}
                              </dd>
                            </div>
                          )}
                          {n.courseSessions.map((cs, i) => (
                            <div key={i}>
                              <dt className="inline font-medium text-foreground">Sessão {cs.number ?? i + 1}: </dt>
                              <dd className="inline text-muted-foreground">{cs.title || "—"}</dd>
                              {cs.progress && (
                                <p className="text-muted-foreground">
                                  <span className="font-medium text-foreground">Estudado: </span>
                                  {cs.progress}
                                </p>
                              )}
                            </div>
                          ))}
                          {n.topics && (
                            <div>
                              <dt className="inline font-medium text-foreground">Estudado: </dt>
                              <dd className="inline text-muted-foreground">{n.topics}</dd>
                            </div>
                          )}
                        </dl>
                      )}
                    </div>
                    <span className="shrink-0 pt-0.5 text-sm font-medium tabular-nums">{formatDuration(s.hours)}</span>
                    <RowActions
                      itemLabel={label}
                      onEdit={() => { setEditing(s); setDialogOpen(true); }}
                      onDelete={async () => { await deleteSession(s.id); toast.success("Sessão excluída"); }}
                    />
                  </div>
                );
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="practice" className="mt-0">
          <PracticeSessionsTab />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

/** Subject's icon or emoji (or initial). */
function SubjectMark({ subject }: { subject?: Subject }) {
  return (
    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center">
      {subject?.icon ? (
        <BrandIcon icon={subject.icon} size={26} />
      ) : (
        <span className="font-display text-xl font-semibold text-muted-foreground">{subject?.name?.charAt(0) || "?"}</span>
      )}
    </span>
  );
}

function SessionForm({
  subjects,
  courses,
  categories,
  initialCategories,
  initial,
  modulesFor,
  onSave,
  onCancel,
}: {
  subjects: Subject[];
  courses: CourseOption[];
  categories: { id: string; name: string; color: string }[];
  initialCategories: string[];
  initial: StudySession | null;
  modulesFor: (courseId: string) => CourseModule[];
  onSave: (
    base: { date: string; startTime: string },
    allocations: SubjectAllocation[],
  ) => void;
  onCancel: () => void;
}) {
  const isEditing = !!initial;
  const [date, setDate] = useState(initial?.date || format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(initial?.startTime || "08:00");
  const [endTime, setEndTime] = useState(initial?.endTime || "");
  const [useEndTime, setUseEndTime] = useState(false);

  const [allocations, setAllocations] = useState<SubjectAllocation[]>(() => {
    if (initial) {
      const n = parseNotes(initial.notes);
      return [{
        subjectId: initial.subjectId,
        minutes: Math.round(initial.hours * 60),
        courseId: initial.courseId ?? null,
        categoryIds: initialCategories,
        moduleId: n.module?.id ?? null,
        moduleSubjectIds: n.module?.subjectIds ?? [],
        studied: n.topics,
      }];
    }
    return [blankAllocation()];
  });

  // When using end time mode with a single allocation, sync minutes from start/end
  useEffect(() => {
    if (useEndTime && startTime && endTime && allocations.length === 1) {
      let diff = timeToMinutes(endTime) - timeToMinutes(startTime);
      if (diff <= 0) diff += 24 * 60; // crosses midnight
      if (diff > 0 && diff !== allocations[0].minutes) {
        setAllocations((prev) => [{ ...prev[0], minutes: diff }]);
      }
    }
  }, [useEndTime, startTime, endTime]);

  const totalMinutes = useMemo(
    () => allocations.reduce((acc, a) => acc + (Number(a.minutes) || 0), 0),
    [allocations],
  );

  const updateAllocation = (idx: number, patch: Partial<SubjectAllocation>) => {
    setAllocations((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };
  const addAllocation = () => {
    // Switch off end-time mode when multiple allocations
    setUseEndTime(false);
    setAllocations((prev) => [...prev, blankAllocation()]);
  };
  // Pending modules of the block's course, plus its current module when editing a completed one.
  const selectableModules = (alloc: SubjectAllocation): CourseModule[] =>
    alloc.courseId
      ? modulesFor(alloc.courseId).filter((m) => !m.completed || m.id === alloc.moduleId)
      : [];
  const removeAllocation = (idx: number) => {
    setAllocations((prev) => prev.filter((_, i) => i !== idx));
  };

  const usedSubjectIds = new Set(allocations.map((a) => a.subjectId).filter(Boolean));
  const allHaveSubject = allocations.every((a) => a.subjectId);
  const allHavePositiveMinutes = allocations.every((a) => Number(a.minutes) > 0);
  const noDuplicates = usedSubjectIds.size === allocations.length;

  const validationError = !date
    ? "Informe a data."
    : !startTime
    ? "Informe o horário de início."
    : subjects.length === 0
    ? "Crie uma matéria antes de registrar a sessão."
    : !allHaveSubject
    ? "Selecione a matéria de cada bloco."
    : !allHavePositiveMinutes
    ? useEndTime
      ? "Informe um horário de término válido."
      : "Informe os minutos estudados (maior que zero)."
    : !noDuplicates
    ? "Há matérias repetidas — cada bloco deve ter uma matéria diferente."
    : allocations.some((a) => selectableModules(a).length > 0 && !a.moduleId)
    ? "Selecione o módulo concluído em cada curso."
    : null;

  const canSave = !validationError && allocations.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="session-date">Data</Label>
          <Input id="session-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="session-start">Início</Label>
          <Input id="session-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
      </div>

      {/* Toggle: end time mode */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-pressed={useEndTime}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${useEndTime ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:bg-accent"}`}
          onClick={() => setUseEndTime(!useEndTime)}
        >
          {useEndTime ? "Usando horário de término" : "Informar horário de término"}
        </button>
      </div>

      {useEndTime && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="session-end">Término</Label>
            <Input id="session-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div className="flex items-end">
            <p className="text-sm text-muted-foreground pb-2">
              Duração: <strong className="tabular-nums">{totalMinutes > 0 ? formatDuration(totalMinutes / 60) : "—"}</strong>
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{useEndTime && allocations.length === 1 ? "Matéria" : "Matérias e tempo (em minutos)"}</Label>
          {!(useEndTime && allocations.length === 1) && (
            <span className="text-xs text-muted-foreground">
              Total: <strong>{totalMinutes} min</strong>
            </span>
          )}
        </div>

        {isEditing && (
          <p className="text-xs text-muted-foreground">
            Edição limita-se a uma matéria. Para múltiplas matérias, exclua e crie uma nova sessão.
          </p>
        )}

        <div className="space-y-3">
          {allocations.map((alloc, idx) => (
            <div key={idx} className="border rounded-md p-3 space-y-2 bg-muted/30">
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <Select
                    value={alloc.subjectId}
                    onValueChange={(v) => updateAllocation(idx, { subjectId: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione a matéria" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem
                          key={s.id}
                          value={s.id}
                          disabled={usedSubjectIds.has(s.id) && alloc.subjectId !== s.id}
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!(useEndTime && allocations.length === 1) && (
                  <div className="w-28 flex items-center gap-1">
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      value={alloc.minutes}
                      onChange={(e) => updateAllocation(idx, { minutes: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                      placeholder="min"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                )}
                {!isEditing && allocations.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeAllocation(idx)} aria-label="Remover esta matéria">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div>
                <Select
                  value={alloc.courseId || "__none__"}
                  onValueChange={(v) => updateAllocation(idx, { courseId: v === "__none__" ? null : v, moduleId: null, moduleSubjectIds: [] })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Curso (opcional)" />
                  </SelectTrigger>
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
              {selectableModules(alloc).length > 0 && (() => {
                const mod = selectableModules(alloc).find((m) => m.id === alloc.moduleId);
                const modSubjects = mod ? subjects.filter((s) => mod.subject_ids.includes(s.id)) : [];
                return (
                  <div className="space-y-2">
                    <Select
                      value={alloc.moduleId || ""}
                      onValueChange={(v) => updateAllocation(idx, { moduleId: v, moduleSubjectIds: [] })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Módulo concluído (obrigatório)" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableModules(alloc).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.completed ? `${m.name} (já concluído)` : m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {modSubjects.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {modSubjects.map((s) => (
                          <label key={s.id} className="flex items-center gap-1.5 text-xs">
                            <Checkbox
                              checked={alloc.moduleSubjectIds.includes(s.id)}
                              onCheckedChange={(c) =>
                                updateAllocation(idx, {
                                  moduleSubjectIds: c
                                    ? [...alloc.moduleSubjectIds, s.id]
                                    : alloc.moduleSubjectIds.filter((x) => x !== s.id),
                                })
                              }
                            />
                            {s.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div>
                <Label className="text-xs text-muted-foreground">O que foi estudado (opcional)</Label>
                <Textarea
                  value={alloc.studied}
                  onChange={(e) => updateAllocation(idx, { studied: e.target.value })}
                  rows={2}
                  placeholder="Ex: Listas ligadas, pilhas e exercícios do capítulo 3"
                />
              </div>
              {categories.length > 0 && (
                <div className="pt-1">
                  <Label className="text-xs text-muted-foreground">Categorias (opcional)</Label>
                  <CategoryPicker
                    categories={categories}
                    selected={alloc.categoryIds}
                    onChange={(ids) => updateAllocation(idx, { categoryIds: ids })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {!isEditing && !useEndTime && (
          <Button type="button" variant="outline" size="sm" onClick={addAllocation} disabled={subjects.length === 0 || allocations.length >= subjects.length}>
            <Plus className="w-3 h-3 mr-1" /> Adicionar matéria
          </Button>
        )}

        {subjects.length === 0 && <p className="text-xs text-destructive">Crie uma matéria primeiro!</p>}
      </div>

      {validationError && (
        <p className="text-xs text-destructive">{validationError}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          disabled={!canSave}
          onClick={() => onSave({ date, startTime }, allocations)}
        >
          {initial ? "Salvar" : "Registrar"}
        </Button>
      </div>
    </div>
  );
}
