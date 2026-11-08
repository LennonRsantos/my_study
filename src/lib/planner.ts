import { addDays, getISODay } from "date-fns";
import { toDayKey } from "./streak";

/**
 * Study planner engine. Pure: no I/O, no React.
 * Suggests blocks per day from plan settings. Never stores "done": callers derive it from real sessions.
 */

export type PlanKind = "course" | "language";
export type PlanPriority = 0 | 1 | 2; // 0 baixa, 1 normal, 2 alta
export type PlanStatus = "done" | "ahead" | "ontrack" | "behind" | "nodata";

export interface PlanSettings {
  deadline: string | null; // YYYY-MM-DD
  weeklyHours: number | null; // explicit weekly goal; wins over deadline-derived pace
  days: number[] | null; // ISO weekdays 1 (Seg) .. 7 (Dom); null = every day
  priority: PlanPriority;
}

export interface PlanModule {
  name: string;
  minutes: number;
}

export interface PlanItem extends PlanSettings {
  key: string; // `${kind}:${id}`
  kind: PlanKind;
  name: string;
  color: string;
  remainingHours: number | null; // null = unknown total
  paceHours: number; // hours per week, last 28 days
  modules?: PlanModule[]; // pending modules in order; only for module-based courses
}

export interface PlanBlock {
  itemKey: string;
  date: string; // YYYY-MM-DD
  minutes: number;
  label: string | null;
}

/** How the scheduled pace was chosen: explicit weekly goal, deadline, share of the free daily time, or none. */
export type PlanMode = "weekly" | "deadline" | "share" | "none";

export interface PlanSuggestion {
  minDeadline: Date | null; // earliest date the daily limit allows; null = beyond the scan window
  neededDailyHours: number; // hours per study day the current deadline would need
}

export interface PlanRow {
  key: string;
  status: PlanStatus;
  mode: PlanMode;
  requiredWeekly: number | null; // hours/week needed to meet the deadline
  targetWeekly: number; // hours/week scheduled
  dailyMinutes: number; // recommended minutes per study day
  eta: Date | null;
  unplacedHours: number; // hours cut by the daily budget
  feasible: boolean; // false when the deadline cannot be met within the daily limit
  suggestion: PlanSuggestion | null; // set when not feasible
}

export interface PlanInput {
  items: PlanItem[];
  today: Date;
  dailyBudgetHours: number; // Infinity = no cap
  frozen: Set<string>; // YYYY-MM-DD frozen days (skipped)
  horizonDays?: number;
  reserved?: Map<string, number>; // dayKey -> minutes already taken (e.g. review blocks)
}

const STEP = 15; // minutes per block granularity
const SLOT_LIMIT = 1100; // max days scanned when counting slots to a deadline
const AHEAD_RATIO = 1.25;
const UNPLACED_NOISE_HOURS = 0.25;
const BREAK_MINUTES = 10;
const PRIORITY_WEIGHT: Record<PlanPriority, number> = { 0: 1, 1: 2, 2: 3 };

const roundStep = (min: number) => Math.round(min / STEP) * STEP;

function compareDeadline(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

function countSlots(today: Date, deadline: string, allowed: (iso: number) => boolean, frozen: Set<string>): number {
  let n = 0;
  for (let i = 0; i < SLOT_LIMIT; i++) {
    const d = addDays(today, i);
    const key = toDayKey(d);
    if (key > deadline) break;
    if (allowed(getISODay(d)) && !frozen.has(key)) n++;
  }
  return n;
}

// First day on which `slots × dailyHours` covers the remaining hours.
function earliestFinish(today: Date, rem: number, dailyHours: number, allowed: (iso: number) => boolean, frozen: Set<string>): Date | null {
  let covered = 0;
  for (let i = 0; i < SLOT_LIMIT; i++) {
    const d = addDays(today, i);
    if (!allowed(getISODay(d)) || frozen.has(toDayKey(d))) continue;
    covered += dailyHours;
    if (covered >= rem - 1e-9) return d;
  }
  return null;
}

// cum[i] = minutes before module i; cum[last] = total. Returns module index holding pos, or -1.
function indexAt(cum: number[], pos: number): number {
  for (let i = 0; i < cum.length - 1; i++) if (pos < cum[i + 1]) return i;
  return -1;
}

function moduleLabel(mods: PlanModule[], cum: number[], from: number, minutes: number): string | null {
  if (mods.length === 0) return null;
  const first = indexAt(cum, from);
  if (first < 0) return null;
  const last = indexAt(cum, from + minutes - 1);
  const extra = (last < 0 ? mods.length - 1 : last) - first;
  return extra > 0 ? `${mods[first].name} +${extra}` : mods[first].name;
}

export function buildPlan(input: PlanInput): { rows: PlanRow[]; blocks: PlanBlock[] } {
  const { items, today, dailyBudgetHours, frozen, horizonDays = 14, reserved } = input;
  const todayKey = toDayKey(today);
  const horizon = Array.from({ length: horizonDays }, (_, i) => {
    const d = addDays(today, i);
    return { key: toDayKey(d), iso: getISODay(d) };
  });
  const budgetMin = dailyBudgetHours * 60;
  const used = new Map<string, number>(reserved ?? []); // dayKey -> minutes already placed (shared budget)
  const rowsByKey = new Map<string, PlanRow>();
  const blocks: PlanBlock[] = [];
  const roomOn = (day: string) => Math.max(0, Math.floor((budgetMin - (used.get(day) ?? 0)) / STEP) * STEP);

  const ctx = (it: PlanItem) => {
    const mods = it.modules?.filter((m) => m.minutes > 0) ?? [];
    const cum = [0];
    mods.forEach((m) => cum.push(cum[cum.length - 1] + m.minutes));
    return {
      nDays: it.days?.length ? it.days.length : 7,
      allowed: (iso: number) => !it.days?.length || it.days.includes(iso),
      mods,
      cum,
      // Never plan more than remains (rounded up to a block step).
      capLeft: it.remainingHours == null ? Infinity : Math.ceil((it.remainingHours * 60) / STEP) * STEP,
      placedMin: 0,
    };
  };
  type Ctx = ReturnType<typeof ctx>;

  const place = (it: PlanItem, c: Ctx, day: string, minutes: number) => {
    blocks.push({ itemKey: it.key, date: day, minutes, label: moduleLabel(c.mods, c.cum, c.placedMin, minutes) });
    used.set(day, (used.get(day) ?? 0) + minutes);
    c.capLeft -= minutes;
    c.placedMin += minutes;
  };

  const statusOf = (it: PlanItem, needed: number | null): PlanStatus => {
    if (needed == null || needed <= 0) return "nodata";
    if (it.paceHours >= needed * AHEAD_RATIO) return "ahead";
    if (it.paceHours >= needed) return "ontrack";
    return "behind";
  };

  // Items with an explicit goal or a deadline place first; the rest share what is left of each day.
  const hasGoal = (it: PlanItem) => (it.weeklyHours != null && it.weeklyHours > 0) || !!it.deadline;
  const canShare = (it: PlanItem) => Number.isFinite(budgetMin) && it.remainingHours != null && it.remainingHours > 0;

  // Highest priority places first; earlier deadline breaks ties; then name.
  const order = [...items].sort(
    (a, b) => b.priority - a.priority || compareDeadline(a.deadline, b.deadline) || a.name.localeCompare(b.name),
  );

  // Pass A: weekly goal or deadline.
  for (const it of order.filter((i) => hasGoal(i) || !canShare(i))) {
    const c = ctx(it);
    const rem = it.remainingHours; // null = unknown
    const overdue = !!it.deadline && it.deadline < todayKey;
    const slots = it.deadline && !overdue ? countSlots(today, it.deadline, c.allowed, frozen) : null;
    const hasWeekly = it.weeklyHours != null && it.weeklyHours > 0;

    // Hours/week needed to finish by the deadline, spread over the allowed days.
    const required = rem != null && rem > 0 && slots ? (rem / slots) * c.nDays : null;

    // Per-day scheduled hours. Explicit weekly goal wins; otherwise deadline pace.
    const perDayH = hasWeekly
      ? (it.weeklyHours as number) / c.nDays
      : required != null
        ? (rem as number) / (slots as number)
        : 0;
    const targetWeekly = perDayH * c.nDays;
    const needed = required ?? (hasWeekly ? (it.weeklyHours as number) : null);

    let status: PlanStatus;
    if (rem != null && rem <= 0) status = "done";
    else if (rem != null && it.deadline && (overdue || slots === 0)) status = "behind";
    else status = statusOf(it, needed);

    // Deadline not reachable within the daily limit: suggest a later date or more hours per day.
    let feasible = true;
    let suggestion: PlanSuggestion | null = null;
    if (rem != null && rem > 0 && it.deadline) {
      const neededDaily = slots ? rem / slots : Infinity;
      if (overdue || !slots || neededDaily > dailyBudgetHours + 1e-9) {
        feasible = false;
        const daily = Number.isFinite(dailyBudgetHours) ? dailyBudgetHours : perDayH;
        suggestion = {
          minDeadline: daily > 0 ? earliestFinish(today, rem, daily, c.allowed, frozen) : null,
          neededDailyHours: neededDaily,
        };
      }
    }

    const eta = rem != null && rem > 0 && targetWeekly > 0 ? addDays(today, Math.ceil((rem / targetWeekly) * 7)) : null;

    let carry = 0; // rounding error carried to next day, keeps weekly total on target
    let unplacedMin = 0;

    if (perDayH > 0) {
      for (const d of horizon) {
        if (it.deadline && d.key > it.deadline) break;
        if (!c.allowed(d.iso) || frozen.has(d.key) || c.capLeft <= 0) continue;

        const want = perDayH * 60 + carry;
        const rounded = roundStep(want);
        carry = want - rounded;
        const m = Math.min(rounded, c.capLeft);
        const fit = Math.min(m, roomOn(d.key));
        if (fit >= STEP) place(it, c, d.key, fit);
        unplacedMin += m - (fit >= STEP ? fit : 0);
      }
    }

    rowsByKey.set(it.key, {
      key: it.key,
      status,
      mode: hasWeekly ? "weekly" : it.deadline ? "deadline" : "none",
      requiredWeekly: required,
      targetWeekly,
      dailyMinutes: Math.round(perDayH * 60),
      eta,
      unplacedHours: unplacedMin / 60 < UNPLACED_NOISE_HOURS ? 0 : unplacedMin / 60,
      feasible,
      suggestion,
    });
  }

  // Pass B: no goal, known remaining hours. Each day's free time is split by priority weight;
  // an item that finishes frees its share for the others.
  const sharers = order.filter((i) => !hasGoal(i) && canShare(i)).map((it) => ({ it, c: ctx(it), days: 0 }));
  for (const d of horizon) {
    if (frozen.has(d.key)) continue;
    const active = sharers.filter((s) => s.c.allowed(d.iso) && s.c.capLeft > 0);
    let room = roomOn(d.key);
    if (active.length === 0 || room < STEP) continue;

    const totalW = active.reduce((a, s) => a + PRIORITY_WEIGHT[s.it.priority], 0);
    const give = new Map(
      active.map((s) => [s, Math.min(Math.floor((room * PRIORITY_WEIGHT[s.it.priority]) / totalW / STEP) * STEP, s.c.capLeft)]),
    );
    room -= [...give.values()].reduce((a, v) => a + v, 0);
    // Leftover from rounding and caps goes one step at a time, highest priority first.
    for (let moved = true; room >= STEP && moved; ) {
      moved = false;
      for (const s of active) {
        if (room < STEP) break;
        if (give.get(s)! + STEP <= s.c.capLeft) {
          give.set(s, give.get(s)! + STEP);
          room -= STEP;
          moved = true;
        }
      }
    }
    for (const [s, m] of give) {
      if (m < STEP) continue;
      place(s.it, s.c, d.key, m);
      s.days++;
    }
  }

  for (const s of sharers) {
    const rem = s.it.remainingHours as number;
    const dailyMinutes = s.days > 0 ? Math.round(s.c.placedMin / s.days) : 0;
    const targetWeekly = (dailyMinutes / 60) * s.c.nDays;
    rowsByKey.set(s.it.key, {
      key: s.it.key,
      status: statusOf(s.it, targetWeekly),
      mode: "share",
      requiredWeekly: null,
      targetWeekly,
      dailyMinutes,
      eta: dailyMinutes > 0 ? earliestFinish(today, rem, dailyMinutes / 60, s.c.allowed, frozen) : null,
      unplacedHours: 0,
      feasible: true,
      suggestion: null,
    });
  }

  return {
    rows: items.map((it) => rowsByKey.get(it.key)!),
    blocks: blocks.sort((a, b) => a.date.localeCompare(b.date) || a.itemKey.localeCompare(b.itemKey)),
  };
}

/** Minutes planned per day, keeping only days above the limit. Feeds the overload alert. */
export function overloadedDays(blocks: { date: string; minutes: number }[], limitMinutes: number): Map<string, number> {
  const perDay = new Map<string, number>();
  for (const b of blocks) perDay.set(b.date, (perDay.get(b.date) ?? 0) + b.minutes);
  return new Map([...perDay].filter(([, m]) => m > limitMinutes));
}

/** Splits a long block into near-equal sessions no longer than `maxBlock`, with a break between them. */
export function splitBlock(minutes: number, maxBlock: number): { parts: number[]; breakMinutes: number } {
  const n = Math.max(1, Math.ceil(minutes / Math.max(STEP, maxBlock)));
  const base = Math.floor(minutes / n);
  const parts = Array.from({ length: n }, (_, i) => base + (i < minutes - base * n ? 1 : 0));
  return { parts, breakMinutes: n > 1 ? BREAK_MINUTES : 0 };
}

/** Minutes studied per `${itemKey}|${date}`. Feeds the "feito" column of the planned-vs-done view. */
export function doneMinutes(entries: { key: string; date: string; hours: number }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) {
    const k = `${e.key}|${e.date}`;
    map.set(k, (map.get(k) ?? 0) + Math.round(e.hours * 60));
  }
  return map;
}
