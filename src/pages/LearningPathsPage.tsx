import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useLearningPaths, LearningPath, LearningPathStep, StepStatus } from "@/hooks/useLearningPaths";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/format";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import RowActions from "@/components/page/RowActions";
import StatRow from "@/components/page/StatRow";
import { ColorDot, LoadingState } from "@/components/page/bits";
import { getDeviconUrl, getDeviconUrlFallback, Subject } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import SearchableIconPicker from "@/components/SearchableIconPicker";
import { supabase } from "@/integrations/supabase/client";
import { getSubjects } from "@/lib/store";

const STATUS_LABELS: Record<StepStatus, string> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  completed: "Concluído",
};

const STATUS_BADGE: Record<StepStatus, string> = {
  not_started: "bg-muted text-muted-foreground hover:bg-muted",
  in_progress: "bg-primary/15 text-foreground hover:bg-primary/15",
  completed: "bg-success/15 text-foreground hover:bg-success/15",
};

/** Timeline marker: the step's devicon, or its number, ringed by status. */
function StepMarker({ icon, status, index }: { icon: string | null; status: StepStatus; index: number }) {
  const [useFallback, setUseFallback] = useState(false);
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 bg-card font-display text-sm font-semibold tabular-nums",
        status === "completed" && "border-success",
        status === "in_progress" && "border-primary",
        status === "not_started" && "border-border text-muted-foreground",
      )}
    >
      {icon ? (
        <img
          src={useFallback ? getDeviconUrlFallback(icon) : getDeviconUrl(icon)}
          alt=""
          width={22}
          height={22}
          className="h-[22px] w-[22px]"
          onError={() => { if (!useFallback) setUseFallback(true); }}
        />
      ) : status === "completed" ? (
        <Check className="h-5 w-5 text-success" />
      ) : (
        index + 1
      )}
    </span>
  );
}

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
}

function StepForm({ name, setName, icon, setIcon, hours, setHours, subjectId, setSubjectId, subjects }: StepFormProps) {
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
                  {s.icon ? <img src={getDeviconUrl(s.icon)} alt="" width={16} height={16} className="w-4 h-4" /> : <ColorDot color={s.color} />}
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
    </div>
  );
}

export default function LearningPathsPage() {
  const { paths, loading, createPath, updatePath, deletePath, addStep, updateStep, deleteStep, reorderSteps } = useLearningPaths();
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [showCreatePath, setShowCreatePath] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);
  const [editingPath, setEditingPath] = useState<LearningPath | null>(null);
  const [editingStep, setEditingStep] = useState<LearningPathStep | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Form state
  const [pathName, setPathName] = useState("");
  const [pathDesc, setPathDesc] = useState("");
  const [stepName, setStepName] = useState("");
  const [stepIcon, setStepIcon] = useState<string>("");
  const [stepHours, setStepHours] = useState("");
  const [stepSubjectId, setStepSubjectId] = useState<string>("");

  const selectedPath = paths.find(p => p.id === selectedPathId);

  // Load subjects
  useEffect(() => {
    getSubjects().then(setSubjects).catch(() => {});
  }, []);

  const resetStepForm = () => {
    setStepName(""); setStepIcon(""); setStepHours(""); setStepSubjectId("");
  };

  const handleCreatePath = async () => {
    if (!pathName.trim()) return;
    await createPath(pathName.trim(), pathDesc.trim());
    setPathName(""); setPathDesc(""); setShowCreatePath(false);
    toast({ title: "Trilha criada" });
  };

  const handleEditPath = async () => {
    if (!editingPath || !pathName.trim()) return;
    await updatePath(editingPath.id, pathName.trim(), pathDesc.trim());
    setEditingPath(null); setPathName(""); setPathDesc("");
    toast({ title: "Trilha salva" });
  };

  const handleAddStep = async () => {
    if (!selectedPathId || !stepName.trim()) return;
    const hours = parseFloat(stepHours) || 0;
    const subId = stepSubjectId && stepSubjectId !== "none" ? stepSubjectId : null;
    await addStep(selectedPathId, stepName.trim(), stepIcon || null, hours, subId);
    resetStepForm(); setShowAddStep(false);
    toast({ title: "Etapa adicionada" });
  };

  const handleEditStep = async () => {
    if (!editingStep || !stepName.trim()) return;
    const hours = parseFloat(stepHours) || 0;
    const subId = stepSubjectId && stepSubjectId !== "none" ? stepSubjectId : null;
    await updateStep(editingStep.id, {
      name: stepName.trim(),
      icon: stepIcon || null,
      estimatedHours: hours,
      subjectId: subId,
    });
    setEditingStep(null); resetStepForm();
    toast({ title: "Etapa salva" });
  };

  const openEditStep = (step: LearningPathStep) => {
    setStepName(step.name);
    setStepIcon(step.icon || "");
    setStepHours(step.estimatedHours > 0 ? String(step.estimatedHours) : "");
    setStepSubjectId(step.subjectId || "");
    setEditingStep(step);
  };

  const handleStepStatusChange = async (stepId: string, newStatus: StepStatus) => {
    await updateStep(stepId, { status: newStatus });
  };

  const getPathProgress = (path: LearningPath) => {
    if (path.steps.length === 0) return 0;
    const completed = path.steps.filter(s => s.status === "completed").length;
    return Math.round((completed / path.steps.length) * 100);
  };

  const getActualHours = (path: LearningPath) => {
    return path.steps.reduce((sum, s) => sum + s.actualHours, 0);
  };

  const getTotalHours = (path: LearningPath) => {
    return path.steps.reduce((sum, s) => sum + s.estimatedHours, 0);
  };

  const moveStep = async (pathId: string, stepId: string, direction: "up" | "down") => {
    const path = paths.find(p => p.id === pathId);
    if (!path) return;
    const ids = path.steps.map(s => s.id);
    const idx = ids.indexOf(stepId);
    if (direction === "up" && idx > 0) {
      [ids[idx], ids[idx - 1]] = [ids[idx - 1], ids[idx]];
    } else if (direction === "down" && idx < ids.length - 1) {
      [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
    }
    await reorderSteps(pathId, ids);
  };

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return null;
    return subjects.find(s => s.id === subjectId)?.name || null;
  };

  if (loading) return <AppLayout><LoadingState /></AppLayout>;

  // Detail view
  if (selectedPath) {
    const progress = getPathProgress(selectedPath);
    const actualH = getActualHours(selectedPath);
    const totalH = getTotalHours(selectedPath);
    const count = (st: StepStatus) => selectedPath.steps.filter(s => s.status === st).length;

    return (
      <AppLayout>
        <PageHeader
          back={{ onClick: () => setSelectedPathId(null), label: "Trilhas" }}
          title={selectedPath.name}
          description={selectedPath.description || undefined}
          actions={
            <Dialog open={showAddStep} onOpenChange={(o) => { setShowAddStep(o); if (!o) resetStepForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4" />Nova etapa</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova etapa</DialogTitle></DialogHeader>
                <StepForm
                  name={stepName} setName={setStepName}
                  icon={stepIcon} setIcon={setStepIcon}
                  hours={stepHours} setHours={setStepHours}
                  subjectId={stepSubjectId} setSubjectId={setStepSubjectId}
                  subjects={subjects}
                />
                <DialogFooter>
                  <Button onClick={handleAddStep} disabled={!stepName.trim()}>Adicionar etapa</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="space-y-6">
          <StatRow
            stats={[
              { label: "Concluído", value: `${progress}%`, sub: `${count("completed")} de ${selectedPath.steps.length} etapas` },
              { label: "Em andamento", value: String(count("in_progress")) },
              { label: "Horas estudadas", value: formatHours(actualH), sub: totalH > 0 ? `de ${formatHours(totalH)} estimadas` : undefined },
              { label: "Pendentes", value: String(count("not_started")) },
            ]}
          />

          {/* Edit step dialog */}
          <Dialog open={!!editingStep} onOpenChange={(o) => { if (!o) { setEditingStep(null); resetStepForm(); } }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Editar etapa</DialogTitle></DialogHeader>
              <StepForm
                name={stepName} setName={setStepName}
                icon={stepIcon} setIcon={setStepIcon}
                hours={stepHours} setHours={setStepHours}
                subjectId={stepSubjectId} setSubjectId={setStepSubjectId}
                subjects={subjects}
              />
              <DialogFooter>
                <Button onClick={handleEditStep} disabled={!stepName.trim()}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {selectedPath.steps.length === 0 ? (
            <EmptyState
              framed
              title="Nenhuma etapa ainda"
              text="Monte a trilha em etapas, na ordem em que quer estudar. Cada etapa libera a próxima quando concluída."
              action={<Button size="sm" onClick={() => setShowAddStep(true)}><Plus className="w-4 h-4" />Nova etapa</Button>}
            />
          ) : (
            <ol className="rounded-xl border bg-card p-4 sm:p-6" aria-label="Etapas da trilha">
              {selectedPath.steps.map((step, idx) => {
                const isLast = idx === selectedPath.steps.length - 1;
                const isLocked = step.status === "not_started" && idx > 0 && selectedPath.steps[idx - 1].status !== "completed";
                const subjectName = getSubjectName(step.subjectId);

                return (
                  <li key={step.id} className="relative flex gap-4">
                    {!isLast && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-[21px] top-11 bottom-0 w-0.5",
                          step.status === "completed" ? "bg-success" : "bg-border",
                        )}
                      />
                    )}
                    <StepMarker icon={step.icon} status={step.status} index={idx} />

                    <div className={cn("flex min-w-0 flex-1 flex-col gap-3 pb-8 pt-1.5 sm:flex-row sm:items-start sm:justify-between", isLast && "pb-0", isLocked && "opacity-55")}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-sans text-base font-semibold">{step.name}</h2>
                          <Badge className={cn("font-normal", STATUS_BADGE[step.status])}>
                            {isLocked ? "Bloqueada" : STATUS_LABELS[step.status]}
                          </Badge>
                        </div>
                        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums text-muted-foreground">
                          {step.estimatedHours > 0 && <span>{formatHours(step.estimatedHours)} estimadas</span>}
                          {step.subjectId && (
                            <span>
                              {formatHours(step.actualHours)} estudadas{subjectName && ` em ${subjectName}`}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {!isLocked && step.status === "not_started" && (
                          <Button size="sm" variant="outline" onClick={() => handleStepStatusChange(step.id, "in_progress")}>
                            Iniciar
                          </Button>
                        )}
                        {step.status === "in_progress" && (
                          <Button size="sm" onClick={() => handleStepStatusChange(step.id, "completed")}>
                            Concluir
                          </Button>
                        )}
                        {step.status === "completed" && (
                          <Button size="sm" variant="ghost" onClick={() => handleStepStatusChange(step.id, "in_progress")}>
                            Reabrir
                          </Button>
                        )}
                        {idx > 0 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9"
                            onClick={() => moveStep(selectedPath.id, step.id, "up")}
                            aria-label={`Mover ${step.name} para cima`}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                        )}
                        <RowActions
                          itemLabel={`etapa ${step.name}`}
                          onEdit={() => openEditStep(step)}
                          onDelete={() => deleteStep(step.id)}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
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
          <Dialog open={showCreatePath} onOpenChange={(o) => { setShowCreatePath(o); if (!o) { setPathName(""); setPathDesc(""); } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" />Nova trilha</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova trilha</DialogTitle></DialogHeader>
              <PathFields name={pathName} setName={setPathName} desc={pathDesc} setDesc={setPathDesc} />
              <DialogFooter>
                <Button onClick={handleCreatePath} disabled={!pathName.trim()}>Criar trilha</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Edit path dialog */}
      <Dialog open={!!editingPath} onOpenChange={(o) => { if (!o) setEditingPath(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar trilha</DialogTitle></DialogHeader>
          <PathFields name={pathName} setName={setPathName} desc={pathDesc} setDesc={setPathDesc} />
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
                  </div>
                  <div className="relative z-10">
                    <RowActions
                      itemLabel={`trilha ${path.name}`}
                      deleteWarning="Todas as etapas serão excluídas junto."
                      onEdit={() => { setEditingPath(path); setPathName(path.name); setPathDesc(path.description); }}
                      onDelete={() => deletePath(path.id)}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium tabular-nums">{progress}%</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {path.steps.length} {path.steps.length === 1 ? "etapa" : "etapas"}
                      {totalH > 0 && `, ${formatHours(actualH)} de ${formatHours(totalH)}`}
                    </span>
                  </div>
                  {/* One segment per step, colored by status */}
                  <div className="mt-2 flex gap-1" aria-hidden>
                    {path.steps.length === 0 ? (
                      <span className="h-2 flex-1 rounded-full bg-muted" />
                    ) : (
                      path.steps.map(step => (
                        <span
                          key={step.id}
                          className={cn(
                            "h-2 flex-1 rounded-full",
                            step.status === "completed" ? "bg-success" : step.status === "in_progress" ? "bg-primary" : "bg-muted",
                          )}
                        />
                      ))
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

function PathFields({ name, setName, desc, setDesc }: { name: string; setName: (v: string) => void; desc: string; setDesc: (v: string) => void }) {
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
    </div>
  );
}
