import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Roadmap, leafSteps, roadmapRows, stepHours } from "@/lib/learningPath";

export type StepStatus = "not_started" | "in_progress" | "completed";

export interface LearningPathStep {
  id: string;
  pathId: string;
  parentId: string | null;
  name: string;
  icon: string | null;
  status: StepStatus;
  estimatedHours: number;
  actualHours: number;
  position: number;
  completedAt: string | null;
  subjectId: string | null;
  moduleId: string | null;
  studyNote: string;
  /** Hours or the linked module keep this step completed, so it cannot be unchecked. */
  autoDone: boolean;
}

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  /** Emoji or devicon name; null when none was picked. */
  icon: string | null;
  estimatedHours: number;
  courseId: string | null;
  steps: LearningPathStep[];
  createdAt: string;
}

export function useLearningPaths() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pathsData, error: pErr } = await supabase
        .from("learning_paths")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at");
      if (pErr) throw pErr;

      const pathIds = (pathsData || []).map((p: any) => p.id);
      let stepsData: any[] = [];
      if (pathIds.length > 0) {
        const { data, error: sErr } = await supabase
          .from("learning_path_steps")
          .select("*")
          .in("path_id", pathIds)
          .order("position");
        if (sErr) throw sErr;
        stepsData = data || [];
      }

      const steps: LearningPathStep[] = stepsData.map((s: any) => ({
        id: s.id,
        pathId: s.path_id,
        parentId: s.parent_id ?? null,
        name: s.name,
        icon: s.icon,
        status: s.status as StepStatus,
        estimatedHours: Number(s.estimated_hours),
        actualHours: 0,
        position: s.position,
        completedAt: s.completed_at,
        subjectId: s.subject_id,
        moduleId: s.module_id ?? null,
        studyNote: s.study_note ?? "",
        autoDone: false,
      }));

      // Sessions linked to a step, plus sessions of the subjects steps follow
      const subjectIds = [...new Set(steps.flatMap((s) => (s.subjectId ? [s.subjectId] : [])))];
      const moduleIds = [...new Set(steps.flatMap((s) => (s.moduleId ? [s.moduleId] : [])))];
      const [{ data: sessionsData }, { data: doneModules }] = await Promise.all([
        steps.length > 0
          ? supabase
              .from("study_sessions")
              .select("subject_id, step_id, hours")
              .eq("user_id", user.id)
              .or(subjectIds.length > 0 ? `step_id.not.is.null,subject_id.in.(${subjectIds.join(",")})` : "step_id.not.is.null")
          : Promise.resolve({ data: [] }),
        moduleIds.length > 0
          ? supabase.from("course_modules").select("id").in("id", moduleIds).eq("completed", true)
          : Promise.resolve({ data: [] }),
      ]);
      const hours = stepHours(steps, sessionsData || []);
      const doneModuleIds = new Set((doneModules || []).map((m: any) => m.id));
      const leafIds = new Set(leafSteps(steps).map((s) => s.id));
      for (const step of steps) {
        step.actualHours = hours.get(step.id) || 0;
        step.autoDone = leafIds.has(step.id) && (
          (step.estimatedHours > 0 && step.actualHours >= step.estimatedHours) ||
          (!!step.moduleId && doneModuleIds.has(step.moduleId))
        );
      }

      const result: LearningPath[] = (pathsData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        icon: p.icon ?? null,
        estimatedHours: Number(p.estimated_hours),
        courseId: p.course_id ?? null,
        createdAt: p.created_at,
        steps: steps.filter((s) => s.pathId === p.id),
      }));

      // Auto-complete steps that reached their hours or whose module is completed
      const autoCompletePromises: Promise<any>[] = [];
      for (const step of steps) {
        if (step.autoDone && step.status !== "completed") {
          step.status = "completed";
          step.completedAt = new Date().toISOString();
          autoCompletePromises.push((async () => {
            await supabase.from("learning_path_steps").update({
              status: "completed" as const,
              completed_at: step.completedAt,
            }).eq("id", step.id);
          })());
        }
      }
      if (autoCompletePromises.length > 0) {
        await Promise.all(autoCompletePromises);
      }

      setPaths(result);
    } catch (e) {
      console.error("Failed to load learning paths:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createPath = async (name: string, description: string, courseId: string | null = null, icon: string | null = null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("learning_paths")
      .insert({ name, description, icon, user_id: user.id, course_id: courseId })
      .select()
      .single();
    if (error) { toast({ title: "Erro ao criar trilha", variant: "destructive" }); return null; }
    await refresh();
    return data.id;
  };

  const updatePath = async (id: string, name: string, description: string, courseId: string | null, icon: string | null) => {
    const { error } = await supabase.from("learning_paths").update({ name, description, icon, course_id: courseId, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar trilha", variant: "destructive" }); return; }
    // Modules belong to the old course
    if (paths.find(p => p.id === id)?.courseId !== courseId) {
      await supabase.from("learning_path_steps").update({ module_id: null }).eq("path_id", id);
    }
    await refresh();
  };

  /** Creates the path and its whole tree, or nothing: a failed tree insert removes the path again. */
  const importPath = async (roadmap: Roadmap, courseId: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const id = crypto.randomUUID();
    const { error } = await supabase
      .from("learning_paths")
      .insert({ id, name: roadmap.name, description: roadmap.description, user_id: user.id, course_id: courseId });
    if (error) { toast({ title: "Erro ao criar trilha", variant: "destructive" }); return null; }
    const { error: stepsError } = await supabase.from("learning_path_steps").insert(roadmapRows(roadmap.steps, id));
    if (stepsError) {
      await supabase.from("learning_paths").delete().eq("id", id);
      toast({ title: "Erro ao criar etapas da trilha", variant: "destructive" });
      return null;
    }
    await refresh();
    return id;
  };

  const deletePath = async (id: string) => {
    const { error } = await supabase.from("learning_paths").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir trilha", variant: "destructive" }); return; }
    await refresh();
  };

  const addStep = async (
    pathId: string, name: string, icon: string | null, estimatedHours: number,
    subjectId: string | null = null, parentId: string | null = null, moduleId: string | null = null,
  ) => {
    const path = paths.find(p => p.id === pathId);
    const siblings = (path?.steps || []).filter(s => s.parentId === parentId);
    const position = Math.max(-1, ...siblings.map(s => s.position)) + 1;
    const insertData: any = {
      path_id: pathId, name, icon, estimated_hours: estimatedHours, position, parent_id: parentId, module_id: moduleId,
    };
    if (subjectId) insertData.subject_id = subjectId;
    const { error } = await supabase.from("learning_path_steps").insert(insertData);
    if (error) { toast({ title: "Erro ao adicionar etapa", variant: "destructive" }); return; }
    const newTotal = (path?.estimatedHours || 0) + estimatedHours;
    await supabase.from("learning_paths").update({ estimated_hours: newTotal }).eq("id", pathId);
    await refresh();
  };

  const updateStep = async (stepId: string, updates: Partial<{ name: string; icon: string | null; estimatedHours: number; status: StepStatus; subjectId: string | null; moduleId: string | null; studyNote: string }>) => {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.estimatedHours !== undefined) dbUpdates.estimated_hours = updates.estimatedHours;
    if (updates.subjectId !== undefined) dbUpdates.subject_id = updates.subjectId;
    if (updates.moduleId !== undefined) dbUpdates.module_id = updates.moduleId;
    if (updates.studyNote !== undefined) dbUpdates.study_note = updates.studyNote;
    if (updates.status !== undefined) {
      dbUpdates.status = updates.status;
      dbUpdates.completed_at = updates.status === "completed" ? new Date().toISOString() : null;
    }
    const { error } = await supabase.from("learning_path_steps").update(dbUpdates).eq("id", stepId);
    if (error) { toast({ title: "Erro ao atualizar etapa", variant: "destructive" }); return false; }
    await refresh();
    return true;
  };

  const setStepsStatus = async (stepIds: string[], status: StepStatus) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("learning_path_steps")
      .update({ status, completed_at: status === "completed" ? now : null, updated_at: now })
      .in("id", stepIds);
    if (error) { toast({ title: "Erro ao atualizar etapa", variant: "destructive" }); return; }
    await refresh();
  };

  const deleteStep = async (stepId: string) => {
    const { error } = await supabase.from("learning_path_steps").delete().eq("id", stepId);
    if (error) { toast({ title: "Erro ao excluir etapa", variant: "destructive" }); return; }
    await refresh();
  };

  const reorderSteps = async (pathId: string, stepIds: string[]) => {
    const updates = stepIds.map((id, i) =>
      supabase.from("learning_path_steps").update({ position: i }).eq("id", id)
    );
    await Promise.all(updates);
    await refresh();
  };

  return { paths, loading, createPath, importPath, updatePath, deletePath, addStep, updateStep, setStepsStatus, deleteStep, reorderSteps, refresh };
}
