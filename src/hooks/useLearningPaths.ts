import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type StepStatus = "not_started" | "in_progress" | "completed";

export interface LearningPathStep {
  id: string;
  pathId: string;
  name: string;
  icon: string | null;
  status: StepStatus;
  estimatedHours: number;
  actualHours: number;
  position: number;
  completedAt: string | null;
  subjectId: string | null;
}

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  estimatedHours: number;
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

      // Fetch actual hours from study_sessions for linked subjects
      const subjectIds = stepsData
        .map((s: any) => s.subject_id)
        .filter((id: string | null) => id !== null) as string[];
      
      let hoursMap: Record<string, number> = {};
      if (subjectIds.length > 0) {
        const uniqueSubjectIds = [...new Set(subjectIds)];
        const { data: sessionsData } = await supabase
          .from("study_sessions")
          .select("subject_id, hours")
          .eq("user_id", user.id)
          .in("subject_id", uniqueSubjectIds);
        
        (sessionsData || []).forEach((s: any) => {
          hoursMap[s.subject_id] = (hoursMap[s.subject_id] || 0) + Number(s.hours);
        });
      }

      const result: LearningPath[] = (pathsData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        estimatedHours: Number(p.estimated_hours),
        createdAt: p.created_at,
        steps: stepsData
          .filter((s: any) => s.path_id === p.id)
          .map((s: any) => ({
            id: s.id,
            pathId: s.path_id,
            name: s.name,
            icon: s.icon,
            status: s.status as StepStatus,
            estimatedHours: Number(s.estimated_hours),
            actualHours: s.subject_id ? (hoursMap[s.subject_id] || 0) : 0,
            position: s.position,
            completedAt: s.completed_at,
            subjectId: s.subject_id,
          })),
      }));

      // Auto-complete steps where actualHours >= estimatedHours
      const autoCompletePromises: Promise<any>[] = [];
      for (const path of result) {
        for (const step of path.steps) {
          if (
            step.status !== "completed" &&
            step.estimatedHours > 0 &&
            step.actualHours >= step.estimatedHours
          ) {
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

  const createPath = async (name: string, description: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("learning_paths")
      .insert({ name, description, user_id: user.id })
      .select()
      .single();
    if (error) { toast({ title: "Erro ao criar trilha", variant: "destructive" }); return null; }
    await refresh();
    return data.id;
  };

  const updatePath = async (id: string, name: string, description: string) => {
    const { error } = await supabase.from("learning_paths").update({ name, description, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar trilha", variant: "destructive" }); return; }
    await refresh();
  };

  const deletePath = async (id: string) => {
    const { error } = await supabase.from("learning_paths").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir trilha", variant: "destructive" }); return; }
    await refresh();
  };

  const addStep = async (pathId: string, name: string, icon: string | null, estimatedHours: number, subjectId: string | null = null) => {
    const path = paths.find(p => p.id === pathId);
    const position = path ? path.steps.length : 0;
    const insertData: any = {
      path_id: pathId, name, icon, estimated_hours: estimatedHours, position,
    };
    if (subjectId) insertData.subject_id = subjectId;
    const { error } = await supabase.from("learning_path_steps").insert(insertData);
    if (error) { toast({ title: "Erro ao adicionar etapa", variant: "destructive" }); return; }
    const newTotal = (path?.estimatedHours || 0) + estimatedHours;
    await supabase.from("learning_paths").update({ estimated_hours: newTotal }).eq("id", pathId);
    await refresh();
  };

  const updateStep = async (stepId: string, updates: Partial<{ name: string; icon: string | null; estimatedHours: number; status: StepStatus; subjectId: string | null }>) => {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.estimatedHours !== undefined) dbUpdates.estimated_hours = updates.estimatedHours;
    if (updates.subjectId !== undefined) dbUpdates.subject_id = updates.subjectId;
    if (updates.status !== undefined) {
      dbUpdates.status = updates.status;
      dbUpdates.completed_at = updates.status === "completed" ? new Date().toISOString() : null;
    }
    const { error } = await supabase.from("learning_path_steps").update(dbUpdates).eq("id", stepId);
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

  return { paths, loading, createPath, updatePath, deletePath, addStep, updateStep, deleteStep, reorderSteps, refresh };
}
