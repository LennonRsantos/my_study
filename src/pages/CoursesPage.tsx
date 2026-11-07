import AppLayout from "@/components/AppLayout";
import { useStudy } from "@/contexts/StudyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/useCategories";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, GraduationCap, ChevronRight } from "lucide-react";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import RowActions from "@/components/page/RowActions";
import ColorSwatchPicker from "@/components/page/ColorSwatchPicker";
import { ColorDot, HoursProgress, LoadingState } from "@/components/page/bits";
import { formatHours } from "@/lib/format";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SUBJECT_COLORS } from "@/lib/types";
import { CategoryManager } from "@/components/CategoryManager";
import { CategoryBadges } from "@/components/CategoryBadges";
import { CategoryPicker } from "@/components/CategoryPicker";
import { CourseModules } from "@/components/CourseModules";
import { useCourseModules, moduleStats, type CourseModule } from "@/hooks/useCourseModules";
import { useCourses, type Course } from "@/hooks/useCourses";
import type { ImportedModule } from "@/lib/courseImport";


export default function CoursesPage() {
  const { subjects, sessions, practiceSessions } = useStudy();
  const { user } = useAuth();
  const { categories, getCategoriesForItem, setItemCategories, getItemsInCategory, addCategory, updateCategory, deleteCategory } = useCategories("course");
  const { modules, loading: modulesLoading, modulesFor, addModule, updateModule, toggleModuleComplete, toggleLesson, importModules, deleteModule } = useCourseModules();
  const { courses, loading, refresh: fetchCourses } = useCourses();
  const [editing, setEditing] = useState<Course | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Study and practice sessions linked to a course count as time spent on it
  const sessionHoursFor = (courseId: string) =>
    [...sessions, ...practiceSessions].filter((s) => s.courseId === courseId).reduce((sum, s) => sum + s.hours, 0);

  const handleSave = async (data: Omit<Course, "id" | "completedAt">, categoryIds: string[], id?: string) => {
    if (!user) return;
    const courseId = id || crypto.randomUUID();
    const payload = {
      name: data.name,
      description: data.description,
      color: data.color,
      completed: data.completed,
      target_hours: data.targetHours,
      completed_at: data.completed ? new Date().toISOString() : null,
    };
    if (id) {
      await supabase.from("courses").update(payload).eq("id", id);
      await supabase.from("course_subjects").delete().eq("course_id", id);
      if (data.subjectIds.length > 0) await supabase.from("course_subjects").insert(data.subjectIds.map((sid) => ({ course_id: id, subject_id: sid })));
    } else {
      await supabase.from("courses").insert({ id: courseId, user_id: user.id, ...payload });
      if (data.subjectIds.length > 0) await supabase.from("course_subjects").insert(data.subjectIds.map((sid) => ({ course_id: courseId, subject_id: sid })));
    }
    await setItemCategories(courseId, "course", categoryIds);
    toast.success(id ? "Curso salvo" : "Curso criado");
    setDialogOpen(false);
    setEditing(null);
    fetchCourses();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("courses").delete().eq("id", id);
    toast.success("Curso excluído");
    fetchCourses();
  };

  const toggleComplete = async (course: Course) => {
    const completed = !course.completed;
    await supabase.from("courses").update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq("id", course.id);
    toast.success(completed ? "Curso concluído" : "Curso reaberto");
    fetchCourses();
  };

  // A completed course goes back to "in progress" when it gains a pending module
  const reopenIfCompleted = async (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course?.completed) return;
    await supabase.from("courses").update({ completed: false, completed_at: null }).eq("id", courseId);
    toast.info(`Curso "${course.name}" reaberto: há módulos pendentes`);
    fetchCourses();
  };

  const handleAddModule: typeof addModule = async (v) => {
    await addModule(v);
    await reopenIfCompleted(v.course_id);
  };

  const handleToggleModule = async (id: string) => {
    const wasCompleted = modules.find((m) => m.id === id);
    await toggleModuleComplete(id);
    if (wasCompleted?.completed) await reopenIfCompleted(wasCompleted.course_id);
  };

  const handleToggleLesson = async (moduleId: string, lessonId: string) => {
    const mod = modules.find((m) => m.id === moduleId);
    const wasDone = mod?.lessons?.find((l) => l.id === lessonId)?.completed;
    await toggleLesson(moduleId, lessonId);
    if (mod && wasDone) await reopenIfCompleted(mod.course_id);
  };

  const handleImportModules = async (courseId: string, imported: ImportedModule[]) => {
    const created = await importModules(courseId, imported);
    if (created === null) return false;
    if (created === 0) {
      toast.info("Todos os módulos do JSON já existem neste curso");
      return true;
    }
    const skipped = imported.length - created;
    toast.success(`${created} módulos importados${skipped > 0 ? `, ${skipped} já existiam` : ""}`);
    if (imported.some((m) => m.lessons.some((l) => !l.completed))) await reopenIfCompleted(courseId);
    return true;
  };

  const filterIds = filterCategory ? new Set(getItemsInCategory(filterCategory, "course")) : null;
  const activeCourses = courses.filter((c) => !c.completed && (!filterIds || filterIds.has(c.id)));
  const completedCourses = courses.filter((c) => c.completed && (!filterIds || filterIds.has(c.id)));

  // Auto-complete: courses with modules finish when every module is done;
  // courses without modules finish when session hours reach the target.
  useEffect(() => {
    // Without loaded modules every course would look module-less and fall into the session rule
    if (modulesLoading) return;
    courses.forEach(async (course) => {
      if (course.completed) return;
      const courseModules = modulesFor(course.id);
      let reason: string | null = null;
      if (courseModules.length > 0) {
        if (moduleStats(courseModules).allDone) reason = "todos os módulos concluídos";
      } else if (course.targetHours > 0) {
        if (sessionHoursFor(course.id) >= course.targetHours) reason = "carga horária atingida";
      }
      if (reason) {
        await supabase.from("courses").update({ completed: true, completed_at: new Date().toISOString() }).eq("id", course.id);
        toast.success(`Curso "${course.name}" concluído: ${reason}`);
        fetchCourses();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses, sessions, practiceSessions, modules, modulesLoading]);

  if (loading) return <AppLayout><LoadingState /></AppLayout>;

  const renderCourse = (course: Course) => (
    <CourseCard
      key={course.id} course={course} subjects={subjects}
      categories={getCategoriesForItem(course.id, "course")}
      totalHours={sessionHoursFor(course.id)}
      onEdit={() => { setEditing(course); setDialogOpen(true); }}
      onDelete={() => handleDelete(course.id)}
      onToggleComplete={() => toggleComplete(course)}
      modules={modulesFor(course.id)}
      onAddModule={handleAddModule}
      onUpdateModule={updateModule}
      onToggleModule={handleToggleModule}
      onToggleLesson={handleToggleLesson}
      onImportModules={(imported) => handleImportModules(course.id, imported)}
      onDeleteModule={deleteModule}
    />
  );

  return (
    <AppLayout>
      <PageHeader
        title="Cursos"
        description="Agrupe matérias num curso e acompanhe a carga horária até concluir."
        actions={
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" />Novo curso</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Editar curso" : "Novo curso"}</DialogTitle></DialogHeader>
              <CourseForm
                subjects={subjects}
                categories={categories}
                initialCategories={editing ? getCategoriesForItem(editing.id, "course").map((c) => c.id) : []}
                initial={editing}
                moduleHours={editing ? moduleStats(modulesFor(editing.id)).totalHours : 0}
                onSave={(data, catIds) => handleSave(data, catIds, editing?.id)}
                onCancel={() => { setDialogOpen(false); setEditing(null); }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-6">
        <CategoryManager categories={categories} selectedFilter={filterCategory} onSelectFilter={setFilterCategory} onAdd={addCategory} onUpdate={updateCategory} onDelete={deleteCategory} />

        {activeCourses.length === 0 && completedCourses.length === 0 ? (
          <EmptyState
            framed
            title={filterCategory ? "Nada nesta categoria" : "Nenhum curso ainda"}
            text={filterCategory ? "Nenhum curso foi marcado com esta categoria." : "Crie um curso, ligue as matérias dele e defina a carga horária. Ele é concluído sozinho ao atingir a meta."}
            action={!filterCategory && <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" />Novo curso</Button>}
          />
        ) : (
          <>
            {activeCourses.length > 0 && <div className="space-y-3">{activeCourses.map(renderCourse)}</div>}
            {completedCourses.length > 0 && (
              <section className="space-y-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCompleted(!showCompleted)}
                  aria-expanded={showCompleted}
                  className="-ml-2 text-muted-foreground"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${showCompleted ? "rotate-90" : ""}`} aria-hidden />
                  Concluídos ({completedCourses.length})
                </Button>
                {showCompleted && completedCourses.map(renderCourse)}
              </section>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function CourseCard({ course, subjects, categories: cats, totalHours, onEdit, onDelete, onToggleComplete, modules, onAddModule, onUpdateModule, onToggleModule, onToggleLesson, onImportModules, onDeleteModule }: {
  course: Course;
  subjects: { id: string; name: string; color: string }[];
  categories: { id: string; name: string; color: string }[];
  totalHours: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
  modules: CourseModule[];
  onAddModule: (v: Omit<CourseModule, "id" | "position" | "completed" | "completed_at">) => Promise<void> | void;
  onUpdateModule: (id: string, patch: Partial<CourseModule>) => Promise<void> | void;
  onToggleModule: (id: string) => Promise<void> | void;
  onToggleLesson: (moduleId: string, lessonId: string) => Promise<void> | void;
  onImportModules: (modules: ImportedModule[]) => Promise<boolean>;
  onDeleteModule: (id: string) => Promise<void> | void;
}) {
  const linkedSubjects = subjects.filter((s) => course.subjectIds.includes(s.id));
  const stats = moduleStats(modules);
  return (
    <article className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: course.color }}>
          <GraduationCap className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{course.name}</h3>
            {course.completed && <Badge className="gap-1 font-normal"><CheckCircle className="h-3 w-3" aria-hidden />Concluído</Badge>}
          </div>
          {course.description && <p className="mt-0.5 text-sm text-muted-foreground">{course.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onToggleComplete}
            aria-label={course.completed ? `Reabrir curso ${course.name}` : `Marcar curso ${course.name} como concluído`}
            aria-pressed={course.completed}
          >
            <CheckCircle className={`h-4 w-4 ${course.completed ? "text-primary" : "text-muted-foreground"}`} />
          </Button>
          <RowActions
            itemLabel={`curso ${course.name}`}
            deleteWarning="Os módulos do curso também serão excluídos."
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </div>

      <div className="mt-5 sm:pl-[60px]">
        {stats.hasDurations ? (
          <>
            {/* Progress = durations of completed modules over the sum of module durations */}
            <HoursProgress
              done={stats.doneHours}
              target={stats.totalHours}
              doneSuffix=" concluídas"
              label={`Módulos concluídos do curso ${course.name}`}
            />
            <p className="mt-2 text-xs tabular-nums text-muted-foreground">
              {stats.doneCount} de {modules.length} {modules.length === 1 ? "módulo" : "módulos"}
              {totalHours > 0 && `, ${formatHours(totalHours)} estudadas em sessões`}
            </p>
          </>
        ) : course.targetHours > 0 ? (
          <HoursProgress done={totalHours} target={course.targetHours} label={`Carga horária do curso ${course.name}`} />
        ) : (
          <p className="text-sm tabular-nums text-muted-foreground">{formatHours(totalHours)} estudadas</p>
        )}

        {(linkedSubjects.length > 0 || cats.length > 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {linkedSubjects.length > 0 && (
              <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Matérias do curso">
                {linkedSubjects.map((s) => (
                  <li key={s.id} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <ColorDot color={s.color} className="h-2 w-2" />
                    {s.name}
                  </li>
                ))}
              </ul>
            )}
            <CategoryBadges categories={cats} />
          </div>
        )}

        <CourseModules
          courseId={course.id}
          modules={modules}
          subjects={subjects}
          onAdd={onAddModule}
          onUpdate={onUpdateModule}
          onToggleComplete={onToggleModule}
          onToggleLesson={onToggleLesson}
          onImport={onImportModules}
          onDelete={onDeleteModule}
        />
      </div>
    </article>
  );
}

function CourseForm({ subjects, categories, initialCategories, initial, moduleHours = 0, onSave, onCancel }: {
  subjects: { id: string; name: string; color: string }[];
  categories: { id: string; name: string; color: string }[];
  initialCategories: string[];
  initial: Course | null;
  /** Sum of module durations; when > 0 the course load comes from the modules. */
  moduleHours?: number;
  onSave: (data: Omit<Course, "id" | "completedAt">, categoryIds: string[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [color, setColor] = useState(initial?.color || SUBJECT_COLORS[1]);
  const [completed, setCompleted] = useState(initial?.completed || false);
  const [targetHours, setTargetHours] = useState<string>(initial?.targetHours ? String(initial.targetHours) : "");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(initial?.subjectIds || []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);

  const toggleSubject = (id: string) => {
    setSelectedSubjects((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="course-name">Nome do curso</Label>
        <Input id="course-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Engenharia de Software" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="course-description">Descrição <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Textarea id="course-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      {moduleHours > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">Carga horária</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium tabular-nums text-foreground">{formatHours(moduleHours)}</span>, soma da duração dos módulos.
            Para mudar, edite a duração de cada módulo.
          </p>
        </div>
      ) : (
      <div className="space-y-2">
        <Label htmlFor="course-hours">Carga horária (horas)</Label>
        <Input
          id="course-hours"
          aria-describedby="course-hours-hint"
          inputMode="decimal"
          type="number"
          min="0"
          step="0.5"
          value={targetHours}
          onChange={(e) => setTargetHours(e.target.value)}
          placeholder="Ex: 40"
        />
        <p id="course-hours-hint" className="text-xs text-muted-foreground">
          O curso é concluído sozinho quando você atinge essa carga. Se os módulos tiverem duração, a carga passa a ser a soma deles.
        </p>
      </div>
      )}
      <div className="space-y-2">
        <Label>Cor</Label>
        <ColorSwatchPicker value={color} onChange={setColor} colors={SUBJECT_COLORS.slice(0, 12)} label="Cor do curso" />
      </div>
      <div>
        <Label>Matérias vinculadas</Label>
        {subjects.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-1">Nenhuma matéria disponível.</p>
        ) : (
          <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
            {subjects.map((s) => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={selectedSubjects.includes(s.id)} onCheckedChange={() => toggleSubject(s.id)} />
                <ColorDot color={s.color} />
                <span className="text-sm">{s.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {categories.length > 0 && (
        <div>
          <Label>Categorias <span className="font-normal text-muted-foreground">(opcional)</span></Label>
          <CategoryPicker categories={categories} selected={selectedCategories} onChange={setSelectedCategories} />
        </div>
      )}
      {initial && (
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={completed} onCheckedChange={(v) => setCompleted(!!v)} />
          <span className="text-sm">Marcar como concluído</span>
        </label>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button disabled={!name.trim()} onClick={() => onSave({ name, description, color, completed, targetHours: parseFloat(targetHours) || 0, subjectIds: selectedSubjects }, selectedCategories)}>
          {initial ? "Salvar" : "Criar"}
        </Button>
      </div>
    </div>
  );
}
