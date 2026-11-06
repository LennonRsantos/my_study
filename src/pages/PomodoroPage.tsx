import AppLayout from "@/components/AppLayout";
import { useStudy } from "@/contexts/StudyContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Play, Pause, RotateCcw, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/page/PageHeader";
import { ColorDot } from "@/components/page/bits";
import { linkClass } from "@/components/page/styles";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/useCategories";

interface CourseOption { id: string; name: string; color: string; }

type TimerMode = "focus" | "short-break" | "long-break";

interface PomodoroConfig {
  focus: number;
  shortBreak: number;
  longBreak: number;
}

const DEFAULT_CONFIG: PomodoroConfig = { focus: 25, shortBreak: 5, longBreak: 15 };

export default function PomodoroPage() {
  const { subjects, addSession } = useStudy();
  const { user } = useAuth();
  const { categories, setItemCategories } = useCategories("session");
  const [config, setConfig] = useState<PomodoroConfig>(DEFAULT_CONFIG);
  const [mode, setMode] = useState<TimerMode>("focus");
  const [subjectId, setSubjectId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [running, setRunning] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const startTimeRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived category lists
  const rootCategories = categories.filter((c) => !c.parentId);
  const subCategories = mainCategoryId
    ? categories.filter((c) => c.parentId === mainCategoryId)
    : [];

  const getMinutes = useCallback((m: TimerMode) => {
    if (m === "focus") return config.focus;
    if (m === "short-break") return config.shortBreak;
    return config.longBreak;
  }, [config]);

  const [secondsLeft, setSecondsLeft] = useState(config.focus * 60);
  const totalSeconds = getMinutes(mode) * 60;
  // Timestamp (ms) when the current timer segment was started/resumed
  const timerStartedAtRef = useRef<number | null>(null);
  // How many seconds were remaining when the timer was started/resumed
  const secondsAtStartRef = useRef<number>(config.focus * 60);

  // Load saved settings & courses
  useEffect(() => {
    if (!user) return;
    supabase.from("pomodoro_settings").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        const c = { focus: data.focus_minutes, shortBreak: data.short_break_minutes, longBreak: data.long_break_minutes };
        setConfig(c);
        setSecondsLeft(c.focus * 60);
      }
    });
    supabase.from("courses").select("id, name, color").eq("user_id", user.id).eq("completed", false).order("name").then(({ data }) => {
      setCourses((data || []).map((c: any) => ({ id: c.id, name: c.name, color: c.color })));
    });
  }, [user]);

  const saveSettings = async (c: PomodoroConfig) => {
    if (!user) return;
    setConfig(c);
    if (!running) setSecondsLeft(getMinutesFor(mode, c) * 60);
    const { data } = await supabase.from("pomodoro_settings").select("id").eq("user_id", user.id).maybeSingle();
    if (data) {
      await supabase.from("pomodoro_settings").update({ focus_minutes: c.focus, short_break_minutes: c.shortBreak, long_break_minutes: c.longBreak }).eq("id", data.id);
    } else {
      await supabase.from("pomodoro_settings").insert({ user_id: user.id, focus_minutes: c.focus, short_break_minutes: c.shortBreak, long_break_minutes: c.longBreak });
    }
    toast.success("Tempos salvos");
    setSettingsOpen(false);
  };

  function getMinutesFor(m: TimerMode, c: PomodoroConfig) {
    if (m === "focus") return c.focus;
    if (m === "short-break") return c.shortBreak;
    return c.longBreak;
  }

  const resetTimer = useCallback((newMode?: TimerMode) => {
    const m = newMode || mode;
    setRunning(false);
    const secs = getMinutes(m) * 60;
    setSecondsLeft(secs);
    startTimeRef.current = null;
    timerStartedAtRef.current = null;
    secondsAtStartRef.current = secs;
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [mode, getMinutes]);

  const switchMode = useCallback((newMode: TimerMode) => {
    setMode(newMode);
    setRunning(false);
    const secs = getMinutes(newMode) * 60;
    setSecondsLeft(secs);
    startTimeRef.current = null;
    timerStartedAtRef.current = null;
    secondsAtStartRef.current = secs;
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [getMinutes]);

  const savePomodoroSession = useCallback(async () => {
    if (!subjectId || !startTimeRef.current) return;
    const now = new Date();
    const sessionId = crypto.randomUUID();
    addSession({
      id: sessionId,
      subjectId,
      courseId: (courseId && courseId !== "none") ? courseId : null,
      date: format(now, "yyyy-MM-dd"),
      startTime: startTimeRef.current,
      endTime: format(now, "HH:mm"),
      hours: Math.round((getMinutes("focus") / 60) * 100) / 100,
      notes: `Pomodoro (${getMinutes("focus")}min foco)`,
    });
    // Link categories
    const categoryIds: string[] = [];
    if (mainCategoryId && mainCategoryId !== "none") categoryIds.push(mainCategoryId);
    if (subCategoryId && subCategoryId !== "none") categoryIds.push(subCategoryId);
    if (categoryIds.length > 0) {
      await setItemCategories(sessionId, "session", categoryIds);
    }
    toast.success("Sessão registrada");
  }, [subjectId, courseId, mainCategoryId, subCategoryId, addSession, getMinutes, setItemCategories]);

  const handleComplete = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (mode === "focus") {
      savePomodoroSession();
      const count = pomodorosCompleted + 1;
      setPomodorosCompleted(count);
      toast.success(`Pomodoro ${count} concluído. Hora da pausa.`);
      switchMode(count % 4 === 0 ? "long-break" : "short-break");
    } else {
      toast.info("Pausa encerrada. Hora de focar.");
      switchMode("focus");
    }
  }, [mode, pomodorosCompleted, savePomodoroSession, switchMode]);

  // Timestamp-based timer: survives tab switches, minimizing, etc.
  useEffect(() => {
    if (!running) return;

    const calcRemaining = () => {
      if (!timerStartedAtRef.current) return secondsAtStartRef.current;
      const elapsed = (Date.now() - timerStartedAtRef.current) / 1000;
      return Math.max(0, Math.round(secondsAtStartRef.current - elapsed));
    };

    // Sync immediately (handles returning to tab)
    setSecondsLeft(calcRemaining());

    intervalRef.current = setInterval(() => {
      const remaining = calcRemaining();
      setSecondsLeft(remaining);
    }, 250); // faster tick for smoother sync

    // Also sync on visibility change (tab focus)
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        setSecondsLeft(calcRemaining());
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [running]);

  useEffect(() => {
    if (secondsLeft === 0 && running) handleComplete();
  }, [secondsLeft, running, handleComplete]);

  const toggleTimer = () => {
    if (!running) {
      // Starting or resuming
      if (!startTimeRef.current) startTimeRef.current = format(new Date(), "HH:mm");
      secondsAtStartRef.current = secondsLeft;
      timerStartedAtRef.current = Date.now();
    } else {
      // Pausing — snapshot remaining seconds
      if (timerStartedAtRef.current) {
        const elapsed = (Date.now() - timerStartedAtRef.current) / 1000;
        const remaining = Math.max(0, Math.round(secondsAtStartRef.current - elapsed));
        setSecondsLeft(remaining);
        secondsAtStartRef.current = remaining;
      }
      timerStartedAtRef.current = null;
    }
    setRunning(!running);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  const modeLabels: Record<TimerMode, string> = {
    focus: "Foco",
    "short-break": "Pausa curta",
    "long-break": "Pausa longa",
  };

  const categoryItem = (c: { id: string; name: string; color: string }) => (
    <SelectItem key={c.id} value={c.id}>
      <span className="flex items-center gap-2">
        <ColorDot color={c.color} />
        {c.name}
      </span>
    </SelectItem>
  );

  return (
    <AppLayout>
      <PageHeader
        title="Pomodoro"
        description="Blocos de foco com pausas. Ao fim de cada foco, a sessão é registrada na matéria escolhida."
        actions={
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Settings2 className="w-4 h-4" />Ajustar tempos</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Tempos do pomodoro</DialogTitle></DialogHeader>
              <PomodoroSettingsForm initial={config} onSave={saveSettings} onCancel={() => setSettingsOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Timer */}
        <section aria-label="Cronômetro" className="flex flex-col items-center rounded-xl border bg-card px-6 py-10 sm:py-14">
          <Tabs value={mode} onValueChange={(v) => switchMode(v as TimerMode)}>
            <TabsList>
              {(["focus", "short-break", "long-break"] as TimerMode[]).map((m) => (
                <TabsTrigger key={m} value={m} disabled={running}>
                  {modeLabels[m]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <p
            className="mt-10 font-display text-7xl font-semibold tabular-nums tracking-tight sm:text-8xl"
            role="timer"
            aria-label={`${mins} minutos e ${secs} segundos restantes`}
          >
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {modeLabels[mode]} de {getMinutes(mode)} minutos
          </p>

          <div
            role="progressbar"
            aria-label="Tempo decorrido"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            className="mt-8 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear motion-reduce:transition-none" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-10 flex gap-3">
            <Button size="lg" onClick={toggleTimer} disabled={mode === "focus" && !subjectId} className="min-w-[150px]">
              {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {running ? "Pausar" : "Iniciar"}
            </Button>
            <Button variant="outline" size="lg" onClick={() => resetTimer()}>
              <RotateCcw className="w-5 h-5" />Reiniciar
            </Button>
          </div>
          {mode === "focus" && !subjectId && (
            <p className="mt-4 text-sm text-muted-foreground">Escolha uma matéria ao lado para iniciar.</p>
          )}
        </section>

        <div className="space-y-6">
          <section aria-labelledby="pomo-subject" className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
            <h2 id="pomo-subject" className="text-base font-semibold">O que você vai estudar</h2>
            <div className="space-y-2">
              <Label htmlFor="pomo-subject-select">Matéria</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger id="pomo-subject-select"><SelectValue placeholder="Selecione uma matéria" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => categoryItem(s))}
                </SelectContent>
              </Select>
              {subjects.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Você ainda não tem matérias. <Link to="/subjects" className={linkClass}>Criar matéria</Link>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pomo-course">Curso <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger id="pomo-course"><SelectValue placeholder="Nenhum curso" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {courses.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {rootCategories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="pomo-category">Categoria <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <Select value={mainCategoryId} onValueChange={(v) => { setMainCategoryId(v); setSubCategoryId(""); }}>
                  <SelectTrigger id="pomo-category"><SelectValue placeholder="Nenhuma categoria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {rootCategories.map(categoryItem)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {subCategories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="pomo-subcategory">Subcategoria <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <Select value={subCategoryId} onValueChange={setSubCategoryId}>
                  <SelectTrigger id="pomo-subcategory"><SelectValue placeholder="Nenhuma subcategoria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {subCategories.map(categoryItem)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </section>

          <section aria-labelledby="pomo-today" className="rounded-xl border bg-card p-5 sm:p-6">
            <h2 id="pomo-today" className="font-sans text-sm font-medium text-muted-foreground">Pomodoros hoje</h2>
            <p className="mt-1 font-display text-4xl font-semibold">{pomodorosCompleted}</p>
            {pomodorosCompleted > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden>
                {Array.from({ length: Math.min(pomodorosCompleted, 12) }).map((_, i) => (
                  <span key={i} className={`h-2.5 w-2.5 rounded-full bg-primary ${(i + 1) % 4 === 0 ? "mr-2" : ""}`} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function PomodoroSettingsForm({ initial, onSave, onCancel }: { initial: PomodoroConfig; onSave: (c: PomodoroConfig) => void; onCancel: () => void }) {
  const [focus, setFocus] = useState(initial.focus);
  const [shortBreak, setShortBreak] = useState(initial.shortBreak);
  const [longBreak, setLongBreak] = useState(initial.longBreak);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pomo-focus">Foco (minutos)</Label>
        <Input id="pomo-focus" type="number" inputMode="numeric" min={1} max={120} value={focus} onChange={(e) => setFocus(Number(e.target.value))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pomo-short">Pausa curta (minutos)</Label>
        <Input id="pomo-short" type="number" inputMode="numeric" min={1} max={60} value={shortBreak} onChange={(e) => setShortBreak(Number(e.target.value))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pomo-long">Pausa longa (minutos)</Label>
        <Input id="pomo-long" type="number" inputMode="numeric" min={1} max={60} value={longBreak} onChange={(e) => setLongBreak(Number(e.target.value))} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave({ focus, shortBreak, longBreak })}>Salvar</Button>
      </div>
    </div>
  );
}
