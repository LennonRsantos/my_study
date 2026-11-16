import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { useLearningPaths, LearningPath } from "@/hooks/useLearningPaths";
import { useCourses, Course } from "@/hooks/useCourses";
import { useCourseModules, CourseModule } from "@/hooks/useCourseModules";
import { useStudy } from "@/contexts/StudyContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/format";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import RowActions from "@/components/page/RowActions";
import StatRow from "@/components/page/StatRow";
import { ColorDot, LoadingState } from "@/components/page/bits";
import { Subject } from "@/lib/types";
import { BrandIcon } from "@/components/BrandIcon";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import SearchableIconPicker from "@/components/SearchableIconPicker";
import CourseSelect from "@/components/paths/CourseSelect";
import ImportRoadmapDialog from "@/components/paths/ImportRoadmapDialog";
import RoadmapView from "@/components/paths/RoadmapView";
import StepPanel from "@/components/paths/StepPanel";
import { Roadmap, StepNode, buildTree, effectiveStatus, flattenNode, leafSteps, serializeStudyLog } from "@/lib/learningPath";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- Step Form (shared between Add and Edit) ---
interface StepFormProps {
  name: string;
  setName: (v: string) => void;
  icon: string;
  setIcon: (v: string) => void;
  hours: string;
  setHours: (v: string) => void;
  subjectId: string;
  setSubjectId: (v: string) => void;
  subjects: Subject[];
  moduleId: string;
  setModuleId: (v: string) => void;
  modules: CourseModule[];
}

function StepForm({ name, setName, icon, setIcon, hours, setHours, subjectId, setSubjectId, subjects, moduleId, setModuleId, modules }: StepFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="step-name">Nome da etapa</Label>
        <Input id="step-name" placeholder="Ex.: HTML, CSS, React" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Ícone</Label>
        <SearchableIconPicker value={icon} onValueChange={setIcon} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="step-hours">Horas estimadas</Label>
        <Input id="step-hours" type="number" inputMode="decimal" placeholder="0" value={hours} onChange={e => setHours(e.target.value)} min="0" step="0.5" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="step-subject">Matéria ligada <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger id="step-subject"><SelectValue placeholder="Nenhuma matéria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            {subjects.map(s => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  {s.icon ? <BrandIcon icon={s.icon} size={16} /> : <ColorDot color={s.color} />}
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          As horas das sessões desta matéria passam a contar para a etapa.
        </p>
      </div>
      {modules.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="step-module">Módulo do curso <span className="font-normal text-muted-foreground">(opcional)</span></Label>
          <Select value={moduleId} onValueChange={setModuleId}>
            <SelectTrigger id="step-module"><SelectValue placeholder="Nenhum módulo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Concluir o módulo conclui esta etapa.</p>
        </div>
      )}
    </div>
  );
}

const pickedId = (value: string) => (value && value !== "none" ? value : null);

export default function LearningPathsPage() {
  const {
    paths, loading, createPath, importPath, updatePath, deletePath,
    addStep, updateStep, setStepsStatus, deleteStep, reorderSteps,
  } = useLearningPaths();
  const { courses } = useCourses();
  const { modulesFor } = useCourseModules();
  const { subjects, refresh: refreshStudy } = useStudy();
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [showCreatePath, setShowCreatePath] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);
  const [addParent, setAddParent] = useState<StepNode | null>(null);
  const [editingPath, setEditingPath] = useState<LearningPath | null>(null);
  const [editingStep, setEditingStep] = useState<StepNode | null>(null);
  const [panelStepId, setPanelStepId] = useState<string | null>(null);
  const [pendingToggle, setPendingToggle] = useState<{ node: StepNode; completed: boolean } | null>(null);

  // Form state
  const [pathName, setPathName] = useState("");
  const [pathDesc, setPathDesc] = useState("");
  const [pathCourseId, setPathCourseId] = useState<string | null>(null);
  const [stepName, setStepName] = useState("");
  const [stepIcon, setStepIcon] = useState<string>("");
  const [stepHours, setStepHours] = useState("");
  const [stepSubjectId, setStepSubjectId] = useState<string>("");
  const [stepModuleId, setStepModuleId] = useState<string>("");

  const selectedPath = paths.find(p => p.id === selectedPathId);
  const tree = useMemo(() => buildTree(selectedPath?.steps ?? []), [selectedPath]);
  const panelNode = tree.flatMap(flattenNode).find(n => n.id === panelStepId);

  const resetPathForm = () => {
    setPathName(""); setPathDesc(""); setPathCourseId(null);
  };

  const resetStepForm = () => {
    setStepName(""); setStepIcon(""); setStepHours(""); setStepSubjectId(""); setStepModuleId("");
  };

  const handleCreatePath = async () => {
    if (!pathName.trim()) return;
    await createPath(pathName.trim(), pathDesc.trim(), pathCourseId);
    resetPathForm(); setShowCreatePath(false);
    toast({ title: "Trilha criada" });
  };

  const handleEditPath = async () => {
    if (!editingPath || !pathName.trim()) return;
    await updatePath(editingPath.id, pathName.trim(), pathDesc.trim(), pathCourseId);
    setEditingPath(null); resetPathForm();
    toast({ title: "Trilha salva" });
  };

  const handleImport = async (roadmap: Roadmap, courseId: string | null) => {
    const id = await importPath(roadmap, courseId);
    if (id) { setSelectedPathId(id); toast({ title: "Trilha criada" }); }
    return id;
  };

  const handleAddStep = async () => {
    if (!selectedPathId || !stepName.trim()) return;
    const hours = parseFloat(stepHours) || 0;
    await addStep(selectedPathId, stepName.trim(), stepIcon || null, hours, pickedId(stepSubjectId), addParent?.id ?? null, pickedId(stepModuleId));
    resetStepForm(); setShowAddStep(false); setAddParent(null);
    toast({ title: "Etapa adicionada" });
  };

  const handleEditStep = async () => {
    if (!editingStep || !stepName.trim()) return;
    const hours = parseFloat(stepHours) || 0;
    await updateStep(editingStep.id, {
      name: stepName.trim(),
      icon: stepIcon || null,
      estimatedHours: hours,
      subjectId: pickedId(stepSubjectId),
      moduleId: pickedId(stepModuleId),
    });
    setEditingStep(null); resetStepForm();
    toast({ title: "Etapa salva" });
  };

  const openEditStep = (step: StepNode) => {
    setStepName(step.name);
    setStepIcon(step.icon || "");
    setStepHours(step.estimatedHours > 0 ? String(step.estimatedHours) : "");
    setStepSubjectId(step.subjectId || "");
    setStepModuleId(step.moduleId || "");
    setPanelStepId(null);
    setEditingStep(step);
  };

  /** Checks or unchecks the node and everything under it, except steps hours or a module keep completed. */
  const setNodeCompleted = async (node: StepNode, completed: boolean) => {
    const ids = flattenNode(node).filter(n => !n.autoDone).map(n => n.id);
    if (ids.length > 0) await setStepsStatus(ids, completed ? "completed" : "not_started");
  };

  /** A step with topics asks first, since checking it also checks every topic. */
  const requestNodeCompleted = (node: StepNode, completed: boolean) => {
    if (node.children.length > 0) setPendingToggle({ node, completed });
    else void setNodeCompleted(node, completed);
  };

  const handleDeleteStep = async (node: StepNode) => {
    setPanelStepId(null);
    await deleteStep(node.id);
    refreshStudy(); // the database cleared step_id on the sessions of the deleted steps
  };

  const getPathProgress = (path: LearningPath) => {
    const leaves = leafSteps(path.steps);
    if (leaves.length === 0) return 0;
    return Math.round((leaves.filter(s => s.status === "completed").length / leaves.length) * 100);
  };

  // Root steps already include their topics' hours
  const getActualHours = (path: LearningPath) => {
    return path.steps.filter(s => !s.parentId).reduce((sum, s) => sum + s.actualHours, 0);
  };

  const getTotalHours = (path: LearningPath) => {
    return leafSteps(path.steps).reduce((sum, s) => sum + s.estimatedHours, 0);
  };

  const siblingsOf = (node: StepNode) => selectedPath?.steps
    .filter(s => s.parentId === node.parentId)
    .sort((a, b) => a.position - b.position) ?? [];

  const moveStepUp = async (node: StepNode) => {
    const ids = siblingsOf(node).map(s => s.id);
    const idx = ids.indexOf(node.id);
    if (idx <= 0) return;
    [ids[idx], ids[idx - 1]] = [ids[idx - 1], ids[idx]];
    await reorderSteps(node.pathId, ids);
  };

  const courseOf = (path: LearningPath) => courses.find(c => c.id === path.courseId);

  if (loading) return <AppLayout><LoadingState /></AppLayout>;

  // Detail view
  if (selectedPath) {
    const progress = getPathProgress(selectedPath);
    const actualH = getActualHours(selectedPath);
    const totalH = getTotalHours(selectedPath);
    const leaves = leafSteps(selectedPath.steps);
    const count = (st: LearningPath["steps"][number]["status"]) => leaves.filter(s => s.status === st).length;
    const course = courseOf(selectedPath);
    const modules = selectedPath.courseId ? modulesFor(selectedPath.courseId) : [];
    const stepFormProps = {
      name: stepName, setName: setStepName,
      icon: stepIcon, setIcon: setStepIcon,
      hours: stepHours, setHours: setStepHours,
      subjectId: stepSubjectId, setSubjectId: setStepSubjectId,
      subjects,
      moduleId: stepModuleId, setModuleId: setStepModuleId,
      modules,
    };
    const closeAddStep = () => { setShowAddStep(false); setAddParent(null); resetStepForm(); };

    return (
      <AppLayout>
        <PageHeader
          back={{ onClick: () => setSelectedPathId(null), label: "Trilhas" }}
          title={selectedPath.name}
          description={selectedPath.description || undefined}
          actions={<Button size="sm" onClick={() => setShowAddStep(true)}><Plus className="w-4 h-4" />Nova etapa</Button>}
        />

        <div className="space-y-6">
          {course && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ColorDot color={course.color} />
              Curso: {course.name}
            </p>
          )}

          <StatRow
            stats={[
              { label: "Concluído", value: `${progress}%`, sub: `${count("completed")} de ${leaves.length} etapas` },
              { label: "Em andamento", value: String(count("in_progress")) },
              { label: "Horas estudadas", value: formatHours(actualH), sub: totalH > 0 ? `de ${formatHours(totalH)} estimadas` : undefined },
              { label: "Pendentes", value: String(count("not_started")) },
            ]}
          />

          {/* Add step dialog */}
          <Dialog open={showAddStep} onOpenChange={(o) => { if (!o) closeAddStep(); }}>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{addParent ? `Novo subtópico em ${addParent.name}` : "Nova etapa"}</DialogTitle>
              </DialogHeader>
              <StepForm {...stepFormProps} />
              <DialogFooter>
                <Button onClick={handleAddStep} disabled={!stepName.trim()}>Adicionar etapa</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit step dialog */}
          <Dialog open={!!editingStep} onOpenChange={(o) => { if (!o) { setEditingStep(null); resetStepForm(); } }}>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Editar etapa</DialogTitle></DialogHeader>
              <StepForm {...stepFormProps} />
              <DialogFooter>
                <Button onClick={handleEditStep} disabled={!stepName.trim()}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {tree.length === 0 ? (
            <EmptyState
              framed
              title="Nenhuma etapa ainda"
              text="Monte a trilha em etapas, na ordem em que quer estudar. Cada etapa pode ter subtópicos."
              action={<Button size="sm" onClick={() => setShowAddStep(true)}><Plus className="w-4 h-4" />Nova etapa</Button>}
            />
          ) : (
            <RoadmapView tree={tree} onOpen={(n) => setPanelStepId(n.id)} onToggle={requestNodeCompleted} />
          )}

          {panelNode && (
            <StepPanel
              key={panelNode.id}
              node={panelNode}
              moduleName={modules.find(m => m.id === panelNode.moduleId)?.name ?? null}
              canMoveUp={siblingsOf(panelNode)[0]?.id !== panelNode.id}
              onClose={() => setPanelStepId(null)}
              onStart={() => updateStep(panelNode.id, { status: "in_progress" })}
              onSetCompleted={(completed) => requestNodeCompleted(panelNode, completed)}
              onMoveUp={() => moveStepUp(panelNode)}
              onAddTopic={() => { setAddParent(panelNode); setPanelStepId(null); setShowAddStep(true); }}
              onEdit={() => openEditStep(panelNode)}
              onDelete={() => handleDeleteStep(panelNode)}
              onSaveLog={async (entries, added) => {
                const ok = await updateStep(panelNode.id, {
                  studyNote: serializeStudyLog(entries),
                  // Logging study starts the step
                  ...(added && panelNode.status === "not_started" ? { status: "in_progress" as const } : {}),
                });
                if (ok) toast({ title: added ? "Registro salvo" : "Registro excluído" });
                return ok;
              }}
            />
          )}

          <AlertDialog open={!!pendingToggle} onOpenChange={(o) => { if (!o) setPendingToggle(null); }}>
            <AlertDialogContent className="max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {pendingToggle?.completed ? "Concluir" : "Reabrir"} {pendingToggle?.node.name}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {pendingToggle && (() => {
                    const n = flattenNode(pendingToggle.node).length - 1;
                    const what = n === 1 ? "O subtópico também será marcado" : `Os ${n} subtópicos também serão marcados`;
                    return `${what} como ${pendingToggle.completed ? "concluído" : "não iniciado"}${n === 1 ? "" : "s"}.`;
                  })()}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => { if (pendingToggle) void setNodeCompleted(pendingToggle.node, pendingToggle.completed); }}
                >
                  {pendingToggle?.completed ? "Concluir" : "Reabrir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </AppLayout>
    );
  }

  // List view
  return (
    <AppLayout>
      <PageHeader
        title="Trilhas"
        description="Roteiros de estudo em etapas, na ordem em que você quer aprender."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowImport(true)}><Upload className="w-4 h-4" />Importar</Button>
            <Button size="sm" onClick={() => setShowCreatePath(true)}><Plus className="w-4 h-4" />Nova trilha</Button>
          </div>
        }
      />

      <ImportRoadmapDialog open={showImport} onOpenChange={setShowImport} courses={courses} onImport={handleImport} />

      <Dialog open={showCreatePath} onOpenChange={(o) => { setShowCreatePath(o); if (!o) resetPathForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova trilha</DialogTitle></DialogHeader>
          <PathFields name={pathName} setName={setPathName} desc={pathDesc} setDesc={setPathDesc} courses={courses} courseId={pathCourseId} setCourseId={setPathCourseId} />
          <DialogFooter>
            <Button onClick={handleCreatePath} disabled={!pathName.trim()}>Criar trilha</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit path dialog */}
      <Dialog open={!!editingPath} onOpenChange={(o) => { if (!o) { setEditingPath(null); resetPathForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar trilha</DialogTitle></DialogHeader>
          <PathFields name={pathName} setName={setPathName} desc={pathDesc} setDesc={setPathDesc} courses={courses} courseId={pathCourseId} setCourseId={setPathCourseId} />
          <DialogFooter>
            <Button onClick={handleEditPath} disabled={!pathName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {paths.length === 0 ? (
        <EmptyState
          framed
          title="Nenhuma trilha ainda"
          text="Crie um roteiro, como Front-end ou Inglês do zero, e divida em etapas para acompanhar o avanço."
          action={<Button size="sm" onClick={() => setShowCreatePath(true)}><Plus className="w-4 h-4" />Nova trilha</Button>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {paths.map(path => {
            const progress = getPathProgress(path);
            const totalH = getTotalHours(path);
            const actualH = getActualHours(path);
            const leafCount = leafSteps(path.steps).length;
            const roots = buildTree(path.steps);
            const course = courseOf(path);

            return (
              <li
                key={path.id}
                className="relative flex flex-col rounded-xl border bg-card p-5 transition-colors hover:border-foreground/20 focus-within:ring-2 focus-within:ring-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelectedPathId(path.id)}
                      className="text-left font-display text-lg font-semibold outline-none after:absolute after:inset-0 after:rounded-xl"
                    >
                      {path.name}
                    </button>
                    {path.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{path.description}</p>}
                    {course && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ColorDot color={course.color} className="h-2 w-2" />
                        {course.name}
                      </p>
                    )}
                  </div>
                  <div className="relative z-10">
                    <RowActions
                      itemLabel={`trilha ${path.name}`}
                      deleteWarning="Todas as etapas serão excluídas junto."
                      onEdit={() => { setEditingPath(path); setPathName(path.name); setPathDesc(path.description); setPathCourseId(path.courseId); }}
                      onDelete={() => deletePath(path.id)}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium tabular-nums">{progress}%</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {leafCount} {leafCount === 1 ? "etapa" : "etapas"}
                      {totalH > 0 && `, ${formatHours(actualH)} de ${formatHours(totalH)}`}
                    </span>
                  </div>
                  {/* One segment per main step, colored by status */}
                  <div className="mt-2 flex gap-1" aria-hidden>
                    {roots.length === 0 ? (
                      <span className="h-2 flex-1 rounded-full bg-muted" />
                    ) : (
                      roots.map(root => {
                        const status = effectiveStatus(root);
                        return (
                          <span
                            key={root.id}
                            className={cn(
                              "h-2 flex-1 rounded-full",
                              status === "completed" ? "bg-success" : status === "in_progress" ? "bg-primary" : "bg-muted",
                            )}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppLayout>
  );
}

function PathFields({ name, setName, desc, setDesc, courses, courseId, setCourseId }: {
  name: string;
  setName: (v: string) => void;
  desc: string;
  setDesc: (v: string) => void;
  courses: Course[];
  courseId: string | null;
  setCourseId: (v: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="path-name">Nome</Label>
        <Input id="path-name" placeholder="Ex.: Front-end" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="path-desc">Descrição <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Textarea id="path-desc" value={desc} onChange={e => setDesc(e.target.value)} />
      </div>
      <CourseSelect id="path-course" courses={courses} value={courseId} onChange={setCourseId} />
    </div>
  );
}
