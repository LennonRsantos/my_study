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
import { ChevronRight, Plus, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { parseNotes, serializeNotes } from "@/lib/sessionNotes";
import { useCourseModules, CourseModule, moduleParts, partsMinutes } from "@/hooks/useCourseModules";
import { useLearningPaths, LearningPath } from "@/hooks/useLearningPaths";
import { buildTree, flattenNode, leafSteps, matchingStep } from "@/lib/learningPath";

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
  /** Submodules (lesson sections) studied; their lessons get marked completed. */
  sections: string[];
  studied: string;
  memo: string;
  pathId: string | null;
  /** Path step this block is linked to; completed on save when completeStep. */
  stepId: string | null;
  completeStep: boolean;
}

const blankAllocation = (): SubjectAllocation => ({
  subjectId: "",
  minutes: 0,
  courseId: null,
  categoryIds: [],
  moduleId: null,
  moduleSubjectIds: [],
  sections: [],
  studied: "",
  memo: "",
  pathId: null,
  stepId: null,
  completeStep: true,
});

export default function SessionsPage() {
  const { sessions, subjects, addSession, updateSession, deleteSession } = useStudy();
  const { user } = useAuth();
  const { modules, modulesFor, setModuleCompleted, setLessonsCompleted } = useCourseModules();
  const { paths, setStepsStatus } = useLearningPaths();
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
      sections: mod ? alloc.sections : [],
      studied: alloc.studied,
      memo: alloc.memo,
    });
  };

  // Marks the chosen submodules' lessons completed, or the whole module when none chosen.
  // One call per module: setLessonsCompleted reads module state from this render.
  // Returns what got newly completed, for the toast.
  const completeModules = async (allocations: SubjectAllocation[]): Promise<string[]> => {
    const sectionsByModule = new Map<string, Set<string>>();
    for (const a of allocations) {
      if (!a.moduleId) continue;
      const set = sectionsByModule.get(a.moduleId) ?? new Set<string>();
      a.sections.forEach((x) => set.add(x));
      sectionsByModule.set(a.moduleId, set);
    }
    const done: string[] = [];
    for (const [id, sections] of sectionsByModule) {
      const mod = modules.find((m) => m.id === id);
      if (!mod) continue;
      if (sections.size === 0) {
        if (mod.completed) continue;
        await setModuleCompleted(id, true);
        done.push(`módulo ${mod.name}`);
        continue;
      }
      const lessons = mod.lessons ?? [];
      const picked = moduleParts(mod).filter((p) => sections.has(p.name));
      const ids = picked.flatMap((p) => p.lessonIds);
      const fresh = picked.filter((p) => !p.done).map((p) => p.name);
      await setLessonsCompleted(id, ids, true);
      if (fresh.length > 0) done.push(fresh.join(", "));
      if (!mod.completed && lessons.every((l) => l.completed || ids.includes(l.id))) done.push(`módulo ${mod.name}`);
    }
    return done;
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
          stepId: alloc.stepId,
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
            stepId: alloc.stepId,
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
      const done = await completeModules(allocations);
      const stepsToComplete = paths.flatMap((p) => p.steps).filter(
        (st) => st.status !== "completed" && allocations.some((a) => a.completeStep && a.stepId === st.id),
      );
      if (stepsToComplete.length > 0) {
        await setStepsStatus(stepsToComplete.map((st) => st.id), "completed");
        done.push(...stepsToComplete.map((st) => `etapa ${st.name}`));
      }
      const base_msg = editing ? "Sessão atualizada" : allocations.length > 1 ? "Sessões registradas" : "Sessão registrada";
      toast.success(done.length > 0 ? `${base_msg} · concluído: ${done.join("; ")}` : base_msg);
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
              <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
                <DialogHeader className="border-b px-6 py-5">
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
                  paths={paths}
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
                      {(stepLabel || n.module || n.courseSessions.length > 0 || n.topics || n.memo) && (
                        <dl className="mt-2 space-y-1.5 text-xs">
                          {stepLabel && (
                            <div>
                              <dt className="inline font-medium text-foreground">Trilha: </dt>
                              <dd className="inline text-muted-foreground">{stepLabel}</dd>
                            </div>
                          )}
                          {n.module && (
                            <div>
                              <dt className="inline font-medium text-foreground">{n.sections.length > 0 ? "Módulo: " : "Módulo concluído: "}</dt>
                              <dd className="inline text-muted-foreground">{n.module.name || "—"}</dd>
                            </div>
                          )}
                          {n.sections.length > 0 && (
                            <div>
                              <dt className="inline font-medium text-foreground">Concluído no módulo: </dt>
                              <dd className="inline text-muted-foreground">{n.sections.join(", ")}</dd>
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
                          {n.memo && (
                            <div>
                              <dt className="inline font-medium text-foreground">Notas: </dt>
                              <dd className="inline whitespace-pre-line text-muted-foreground">{n.memo}</dd>
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
  paths,
  onSave,
  onCancel,
}: {
  subjects: Subject[];
  courses: CourseOption[];
  categories: { id: string; name: string; color: string }[];
  initialCategories: string[];
  initial: StudySession | null;
  modulesFor: (courseId: string) => CourseModule[];
  paths: LearningPath[];
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
        sections: n.sections,
        studied: n.topics,
        memo: n.memo,
        pathId: paths.find((p) => p.steps.some((st) => st.id === initial.stepId))?.id ?? null,
        stepId: initial.stepId ?? null,
        completeStep: !paths.some((p) => p.steps.some((st) => st.id === initial.stepId && st.status === "completed")),
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
  const computedEnd = startTime ? minutesToTime(timeToMinutes(startTime) + totalMinutes) : "";

  // Step of the chosen path matching the block's subject, module or studied submodules.
  const suggestStep = (a: SubjectAllocation): string | null => {
    const path = paths.find((p) => p.id === a.pathId);
    if (!path) return null;
    const mod = a.courseId ? modulesFor(a.courseId).find((m) => m.id === a.moduleId) : undefined;
    const subjectName = subjects.find((s) => s.id === a.subjectId)?.name ?? "";
    return matchingStep(path.steps, a.subjectId, [subjectName, mod?.name ?? "", ...a.sections])?.id ?? null;
  };
  const lessonMinutes = (a: SubjectAllocation) => {
    const mod = a.courseId ? modulesFor(a.courseId).find((m) => m.id === a.moduleId) : undefined;
    return mod ? partsMinutes(moduleParts(mod), a.sections) : 0;
  };
  const updateAllocation = (idx: number, patch: Partial<SubjectAllocation>) => {
    setAllocations((prev) => prev.map((a, i) => {
      if (i !== idx) return a;
      const next = { ...a, ...patch };
      // Suggest until a step is picked; never overrides a manual choice.
      if (next.pathId && !next.stepId) next.stepId = suggestStep(next);
      // Checked lessons post their time; typed minutes shift by the same amount. In end-time mode the times rule.
      const shift = lessonMinutes(next) - lessonMinutes(a);
      if (shift && !(useEndTime && prev.length === 1)) next.minutes = Math.max(0, next.minutes + shift);
      return next;
    }));
  };
  const selectablePaths = (a: SubjectAllocation) =>
    paths.filter((p) => p.id === a.pathId || leafSteps(p.steps).some((st) => st.status !== "completed"));
  // Pending leaf steps in tree order, plus the linked step when editing.
  const selectableSteps = (a: SubjectAllocation) => {
    const path = paths.find((p) => p.id === a.pathId);
    if (!path) return [];
    const leafIds = new Set(leafSteps(path.steps).map((st) => st.id));
    const byId = new Map(path.steps.map((st) => [st.id, st]));
    return buildTree(path.steps)
      .flatMap(flattenNode)
      .filter((st) => st.id === a.stepId || (leafIds.has(st.id) && st.status !== "completed"))
      .map((st) => {
        const parent = st.parentId ? byId.get(st.parentId) : undefined;
        return { id: st.id, label: parent ? `${parent.name} › ${st.name}` : st.name, done: st.status === "completed" };
      });
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
    ? "Selecione o módulo em cada curso."
    : allocations.some((a) => {
        const mod = selectableModules(a).find((m) => m.id === a.moduleId);
        return mod && moduleParts(mod).length > 0 && a.sections.length === 0;
      })
    ? "Marque o que foi estudado no módulo."
    : null;

  const canSave = !validationError && allocations.length > 0;

  return (
    <>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="col-span-2 space-y-2 sm:col-span-1">
              <Label htmlFor="session-date">Data</Label>
              <Input id="session-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-start">Início</Label>
              <Input id="session-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-end">Término</Label>
              <Input
                id="session-end"
                type="time"
                value={useEndTime ? endTime : computedEnd}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!useEndTime}
              />
            </div>
          </div>
          {allocations.length === 1 && (
            <div className="flex items-center gap-2">
              <Switch
                id="session-use-end"
                checked={useEndTime}
                onCheckedChange={(on) => {
                  // Start from the current total so the minutes stay put.
                  if (on && totalMinutes > 0) setEndTime(computedEnd);
                  setUseEndTime(on);
                }}
              />
              <Label htmlFor="session-use-end" className="font-normal text-muted-foreground">Informar horário de término</Label>
            </div>
          )}
        </div>

        {isEditing && (
          <p className="text-xs text-muted-foreground">
            Edição limita-se a uma matéria. Para múltiplas matérias, exclua e crie uma nova sessão.
          </p>
        )}

        <div className="space-y-4">
          {allocations.map((alloc, idx) => {
            const subject = subjects.find((s) => s.id === alloc.subjectId);
            const moduleOptions = selectableModules(alloc);
            const mod = moduleOptions.find((m) => m.id === alloc.moduleId);
            const modSubjects = mod ? subjects.filter((s) => mod.subject_ids.includes(s.id)) : [];
            const parts = mod ? moduleParts(mod) : [];
            const pathOptions = selectablePaths(alloc);
            const steps = selectableSteps(alloc);
            const step = steps.find((st) => st.id === alloc.stepId);
            return (
              <section key={idx} aria-label={`Matéria ${subject?.name ?? idx + 1}`} className="rounded-lg border bg-card">
                <div className="flex items-center gap-2 p-3 sm:p-4">
                  <Select value={alloc.subjectId} onValueChange={(v) => updateAllocation(idx, { subjectId: v })}>
                    <SelectTrigger aria-label="Matéria" className="min-w-0 flex-1 font-medium">
                      <SelectValue placeholder="Selecione a matéria" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id} disabled={usedSubjectIds.has(s.id) && alloc.subjectId !== s.id}>
                          <span className="flex items-center gap-2">
                            <ColorDot color={s.color} className="h-2 w-2" />
                            {s.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!(useEndTime && allocations.length === 1) && (
                    <div className="relative w-28 shrink-0">
                      <Input
                        inputMode="numeric"
                        autoComplete="off"
                        value={alloc.minutes || ""}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateAllocation(idx, { minutes: Number(e.target.value.replace(/\D/g, "").slice(0, 4)) })}
                        placeholder="0"
                        aria-label={`Minutos de ${subject?.name ?? "estudo"}`}
                        className="pr-11 text-right tabular-nums"
                      />
                      <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">min</span>
                    </div>
                  )}
                  {!isEditing && allocations.length > 1 && (
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeAllocation(idx)} aria-label="Remover esta matéria">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-4 border-t p-3 sm:p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Select
                      value={alloc.courseId || "__none__"}
                      onValueChange={(v) => updateAllocation(idx, { courseId: v === "__none__" ? null : v, moduleId: null, moduleSubjectIds: [], sections: [] })}
                    >
                      <SelectTrigger aria-label="Curso" className="h-9 text-xs">
                        <SelectValue placeholder="Curso (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem curso</SelectItem>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-2">
                              <ColorDot color={c.color} className="h-2 w-2" />
                              {c.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {moduleOptions.length > 0 && (
                      <Select
                        value={alloc.moduleId || ""}
                        onValueChange={(v) => updateAllocation(idx, { moduleId: v, moduleSubjectIds: [], sections: [] })}
                      >
                        <SelectTrigger aria-label="Módulo" className="h-9 text-xs">
                          <SelectValue placeholder="Módulo (obrigatório)" />
                        </SelectTrigger>
                        <SelectContent>
                          {moduleOptions.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.completed ? `${m.name} (já concluído)` : m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {parts.length > 0 && (
                    <div role="group" aria-labelledby={`session-lessons-${idx}`} className="rounded-md border bg-background/50">
                      <div className="flex items-baseline justify-between gap-3 px-3 pt-3">
                        <p id={`session-lessons-${idx}`} className="text-sm font-medium">Aulas estudadas</p>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {parts.filter((p) => alloc.sections.includes(p.name)).length} de {parts.length}
                        </span>
                      </div>
                      <p className="px-3 text-xs text-muted-foreground">
                        {useEndTime ? "Marcar conclui a aula." : "Marcar conclui a aula e soma a duração dela no tempo."}
                      </p>
                      <ul className="mt-2 max-h-72 space-y-0.5 overflow-y-auto px-1.5 pb-1.5">
                        {parts.map((p) => {
                          const checked = alloc.sections.includes(p.name);
                          return (
                            <li key={p.lessonIds[0]}>
                              <label
                                className={cn(
                                  "flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm transition-colors hover:bg-muted/60",
                                  checked && "bg-primary/10 hover:bg-primary/15",
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(c) =>
                                    updateAllocation(idx, {
                                      sections: c ? [...alloc.sections, p.name] : alloc.sections.filter((x) => x !== p.name),
                                    })
                                  }
                                />
                                <span className={cn("min-w-0 flex-1", p.done && !checked && "text-muted-foreground")}>{p.name}</span>
                                {p.lessonIds.length > 1 && (
                                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{p.lessonIds.length} aulas</span>
                                )}
                                {p.done && <span className="shrink-0 text-xs text-muted-foreground">concluído</span>}
                                {p.minutes > 0 && (
                                  <span className={cn("w-14 shrink-0 text-right text-xs tabular-nums", checked ? "font-medium text-primary" : "text-muted-foreground")}>
                                    {formatDuration(p.minutes / 60)}
                                  </span>
                                )}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {modSubjects.length > 0 && (
                    <div role="group" aria-labelledby={`session-module-subjects-${idx}`} className="space-y-2">
                      <p id={`session-module-subjects-${idx}`} className="text-xs text-muted-foreground">Matérias do módulo</p>
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
                    </div>
                  )}
                  <Collapsible defaultOpen={!!(alloc.pathId || alloc.studied || alloc.memo || alloc.categoryIds.length)}>
                    <CollapsibleTrigger className="group flex items-center gap-1.5 rounded text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" aria-hidden />
                      Mais detalhes
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-3">
                      {pathOptions.length > 0 && (
                        <div className="space-y-2">
                          <Select
                            value={alloc.pathId || "__none__"}
                            onValueChange={(v) => updateAllocation(idx, { pathId: v === "__none__" ? null : v, stepId: null, completeStep: true })}
                          >
                            <SelectTrigger className="h-9 text-xs" aria-label="Trilha (opcional)">
                              <SelectValue placeholder="Trilha (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Sem trilha</SelectItem>
                              {pathOptions.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {alloc.pathId && (
                            <>
                              <Select value={alloc.stepId || ""} onValueChange={(v) => updateAllocation(idx, { stepId: v })}>
                                <SelectTrigger className="h-9 text-xs" aria-label="Etapa da trilha">
                                  <SelectValue placeholder={steps.length > 0 ? "Etapa da trilha" : "Nenhuma etapa pendente"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {steps.map((st) => (
                                    <SelectItem key={st.id} value={st.id}>{st.done ? `${st.label} (já concluída)` : st.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {step && !step.done && (
                                <label className="flex cursor-pointer items-center gap-2 text-xs">
                                  <Checkbox
                                    checked={alloc.completeStep}
                                    onCheckedChange={(c) => updateAllocation(idx, { completeStep: c === true })}
                                  />
                                  Concluir etapa ao salvar
                                </label>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label htmlFor={`session-studied-${idx}`} className="text-xs text-muted-foreground">O que foi estudado</Label>
                        <Textarea
                          id={`session-studied-${idx}`}
                          value={alloc.studied}
                          onChange={(e) => updateAllocation(idx, { studied: e.target.value })}
                          rows={2}
                          placeholder="Ex: Listas ligadas, pilhas e exercícios do capítulo 3"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`session-memo-${idx}`} className="text-xs text-muted-foreground">Notas</Label>
                        <Textarea
                          id={`session-memo-${idx}`}
                          value={alloc.memo}
                          onChange={(e) => updateAllocation(idx, { memo: e.target.value })}
                          rows={2}
                          placeholder="Ex: Revisar generics com keyof; dúvida sobre decorators"
                        />
                      </div>
                      {categories.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Categorias</Label>
                          <CategoryPicker
                            categories={categories}
                            selected={alloc.categoryIds}
                            onChange={(ids) => updateAllocation(idx, { categoryIds: ids })}
                          />
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </section>
            );
          })}
        </div>

        {!isEditing && !useEndTime && (
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            onClick={addAllocation}
            disabled={subjects.length === 0 || allocations.length >= subjects.length}
          >
            <Plus className="w-4 h-4" />Adicionar matéria
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t px-6 py-4">
        <div className="min-w-0">
          <p className="flex items-baseline gap-2">
            <span className={cn("font-display text-2xl font-semibold tabular-nums", totalMinutes === 0 && "text-muted-foreground")}>
              {formatDuration(totalMinutes / 60)}
            </span>
            {totalMinutes > 0 && computedEnd && (
              <span className="text-sm tabular-nums text-muted-foreground">{startTime}–{computedEnd}</span>
            )}
          </p>
          <p aria-live="polite" className="text-xs text-destructive">{validationError}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button disabled={!canSave} onClick={() => onSave({ date, startTime }, allocations)}>
            {initial ? "Salvar" : "Registrar"}
          </Button>
        </div>
      </div>
    </>
  );
}
