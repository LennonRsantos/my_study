import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Subject, StudySession, DailyGoal, Goal, FrozenDay, PracticeSession } from "@/lib/types";
import {
  getSubjects, saveSubject, deleteSubjectDb,
  getSessions, saveSession, deleteSessionDb,
  getGoal, saveGoal,
  getGoals, saveGoalDb, deleteGoalDb,
  getFrozenDays, saveFrozenDay, deleteFrozenDayDb,
  getPracticeSessions, savePracticeSession, deletePracticeSessionDb,
} from "@/lib/store";

interface StudyContextType {
  subjects: Subject[];
  sessions: StudySession[];
  goal: DailyGoal;
  goals: Goal[];
  frozenDays: FrozenDay[];
  practiceSessions: PracticeSession[];
  loading: boolean;
  addSubject: (s: Subject) => void;
  updateSubject: (s: Subject) => void;
  deleteSubject: (id: string) => void;
  addSession: (s: StudySession) => Promise<void>;
  updateSession: (s: StudySession) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setGoal: (g: DailyGoal) => void;
  addGoal: (g: Goal) => void;
  updateGoal: (g: Goal) => void;
  deleteGoal: (id: string) => void;
  addFrozenDay: (f: FrozenDay) => void;
  updateFrozenDay: (f: FrozenDay) => void;
  deleteFrozenDay: (id: string) => void;
  addPracticeSession: (p: PracticeSession) => void;
  updatePracticeSession: (p: PracticeSession) => void;
  deletePracticeSession: (id: string) => void;
  refresh: () => void;
}

const StudyContext = createContext<StudyContextType | null>(null);

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error("useStudy must be within StudyProvider");
  return ctx;
}

export function StudyProvider({ children }: { children: ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [goal, setGoalState] = useState<DailyGoal>({ hoursPerDay: 4 });
  const [goals, setGoals] = useState<Goal[]>([]);
  const [frozenDays, setFrozenDays] = useState<FrozenDay[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [s, ss, g, gs, fd, ps] = await Promise.all([
        getSubjects(), getSessions(), getGoal(), getGoals(), getFrozenDays(), getPracticeSessions(),
      ]);
      setSubjects(s);
      setSessions(ss);
      setGoalState(g);
      setGoals(gs);
      setFrozenDays(fd);
      setPracticeSessions(ps);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addSubject = async (s: Subject) => { setSubjects((prev) => [...prev, s]); await saveSubject(s); };
  const updateSubject = async (s: Subject) => { setSubjects((prev) => prev.map((x) => (x.id === s.id ? s : x))); await saveSubject(s); };
  const deleteSubject = async (id: string) => { setSubjects((prev) => prev.filter((x) => x.id !== id)); await deleteSubjectDb(id); };
  const addSession = async (s: StudySession) => {
    setSessions((prev) => [...prev, s]);
    try { await saveSession(s); } catch (e) { setSessions((prev) => prev.filter((x) => x.id !== s.id)); throw e; }
  };
  const updateSession = async (s: StudySession) => {
    const prevSession = sessions.find((x) => x.id === s.id);
    setSessions((prev) => prev.map((x) => (x.id === s.id ? s : x)));
    try { await saveSession(s); } catch (e) { if (prevSession) setSessions((prev) => prev.map((x) => (x.id === s.id ? prevSession : x))); throw e; }
  };
  const deleteSession = async (id: string) => {
    const prevSession = sessions.find((x) => x.id === id);
    setSessions((prev) => prev.filter((x) => x.id !== id));
    try { await deleteSessionDb(id); } catch (e) { if (prevSession) setSessions((prev) => [...prev, prevSession]); throw e; }
  };
  const setGoalFn = async (g: DailyGoal) => { setGoalState(g); await saveGoal(g); };
  const addGoal = async (g: Goal) => { setGoals((prev) => [...prev, g]); await saveGoalDb(g); };
  const updateGoal = async (g: Goal) => { setGoals((prev) => prev.map((x) => (x.id === g.id ? g : x))); await saveGoalDb(g); };
  const deleteGoal = async (id: string) => { setGoals((prev) => prev.filter((x) => x.id !== id)); await deleteGoalDb(id); };
  const addFrozenDay = async (f: FrozenDay) => { setFrozenDays((prev) => [...prev, f]); await saveFrozenDay(f); };
  const updateFrozenDay = async (f: FrozenDay) => { setFrozenDays((prev) => prev.map((x) => (x.id === f.id ? f : x))); await saveFrozenDay(f); };
  const deleteFrozenDay = async (id: string) => { setFrozenDays((prev) => prev.filter((x) => x.id !== id)); await deleteFrozenDayDb(id); };
  const addPracticeSession = async (p: PracticeSession) => { setPracticeSessions((prev) => [...prev, p]); await savePracticeSession(p); };
  const updatePracticeSession = async (p: PracticeSession) => { setPracticeSessions((prev) => prev.map((x) => (x.id === p.id ? p : x))); await savePracticeSession(p); };
  const deletePracticeSession = async (id: string) => { setPracticeSessions((prev) => prev.filter((x) => x.id !== id)); await deletePracticeSessionDb(id); };

  return (
    <StudyContext.Provider
      value={{
        subjects, sessions, goal, goals, frozenDays, practiceSessions, loading,
        addSubject, updateSubject, deleteSubject,
        addSession, updateSession, deleteSession,
        setGoal: setGoalFn,
        addGoal, updateGoal, deleteGoal,
        addFrozenDay, updateFrozenDay, deleteFrozenDay,
        addPracticeSession, updatePracticeSession, deletePracticeSession,
        refresh,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
}
