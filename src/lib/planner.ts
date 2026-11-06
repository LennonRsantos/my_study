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

export interface PlanRow {
  key: string;
  status: PlanStatus;
  requiredWeekly: number | null; // hours/week needed to meet the deadline
  targetWeekly: number; // hours/week scheduled
  eta: Date | null;
  unplacedHours: number; // hours cut by the daily budget
}

export interface PlanInput {
  items: PlanItem[];
  today: Date;
  dailyBudgetHours: number; // Infinity = no cap
  frozen: Set<string>; // YYYY-MM-DD frozen days (skipped)
  horizonDays?: number;
}

const STEP = 15; // minutes per block granularity
const SLOT_LIMIT = 1100; // max days scanned when counting slots to a deadline
const AHEAD_RATIO = 1.25;
const UNPLACED_NOISE_HOURS = 0.25;

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
  const { items, today, dailyBudgetHours, frozen, horizonDays = 14 } = input;
  const todayKey = toDayKey(today);
  const horizon = Array.from({ length: horizonDays }, (_, i) => {
    const d = addDays(today, i);
    return { key: toDayKey(d), iso: getISODay(d) };
  });
  const budgetMin = dailyBudgetHours * 60;
  const used = new Map<string, number>(); // dayKey -> minutes already placed (shared budget)
  const rowsByKey = new Map<string, PlanRow>();
  const blocks: PlanBlock[] = [];

  // Highest priority places first; earlier deadline breaks ties; then name.
  const order = [...items].sort(
    (a, b) => b.priority - a.priority || compareDeadline(a.deadline, b.deadline) || a.name.localeCompare(b.name),
  );

  for (const it of order) {
    const nDays = it.days?.length ? it.days.length : 7;
    const allowed = (iso: number) => !it.days?.length || it.days.includes(iso);
    const rem = it.remainingHours; // null = unknown
    const overdue = !!it.deadline && it.deadline < todayKey;
    const slots = it.deadline && !overdue ? countSlots(today, it.deadline, allowed, frozen) : null;
    const hasWeekly = it.weeklyHours != null && it.weeklyHours > 0;

    // Hours/week needed to finish by the deadline, spread over the allowed days.
    const required = rem != null && rem > 0 && slots ? (rem / slots) * nDays : null;

    // Per-day scheduled hours. Explicit weekly goal wins; otherwise deadline pace.
    const perDayH = hasWeekly
      ? (it.weeklyHours as number) / nDays
      : required != null
        ? (rem as number) / (slots as number)
        : 0;
    const targetWeekly = perDayH * nDays;
    const needed = required ?? (hasWeekly ? (it.weeklyHours as number) : null);

    let status: PlanStatus;
    if (rem != null && rem <= 0) status = "done";
    else if (rem != null && it.deadline && (overdue || slots === 0)) status = "behind";
    else if (needed == null || needed <= 0) status = "nodata";
    else if (it.paceHours >= needed * AHEAD_RATIO) status = "ahead";
    else if (it.paceHours >= needed) status = "ontrack";
    else status = "behind";

    const eta = rem != null && rem > 0 && targetWeekly > 0 ? addDays(today, Math.ceil((rem / targetWeekly) * 7)) : null;

    // Never plan more than remains (rounded up to a block step).
    let capLeft = rem == null ? Infinity : Math.ceil((rem * 60) / STEP) * STEP;
    const mods = it.modules?.filter((m) => m.minutes > 0) ?? [];
    const cum = [0];
    mods.forEach((m) => cum.push(cum[cum.length - 1] + m.minutes));

    let carry = 0; // rounding error carried to next day, keeps weekly total on target
    let placedMin = 0;
    let unplacedMin = 0;

    if (perDayH > 0) {
      for (const d of horizon) {
        if (it.deadline && d.key > it.deadline) break;
        if (!allowed(d.iso) || frozen.has(d.key) || capLeft <= 0) continue;

        const want = perDayH * 60 + carry;
        const rounded = Math.round(want / STEP) * STEP;
        carry = want - rounded;
        const m = Math.min(rounded, capLeft);
        const room = Math.max(0, Math.floor((budgetMin - (used.get(d.key) ?? 0)) / STEP) * STEP);
        const place = Math.min(m, room);
        if (place < STEP) {
          unplacedMin += m - place;
          continue;
        }

        blocks.push({ itemKey: it.key, date: d.key, minutes: place, label: moduleLabel(mods, cum, placedMin, place) });
        used.set(d.key, (used.get(d.key) ?? 0) + place);
        capLeft -= place;
        placedMin += place;
        unplacedMin += m - place;
      }
    }

    const unplacedHours = unplacedMin / 60 < UNPLACED_NOISE_HOURS ? 0 : unplacedMin / 60;
    rowsByKey.set(it.key, {
      key: it.key,
      status,
      requiredWeekly: required,
      targetWeekly,
      eta,
      unplacedHours,
    });
  }

  return {
    rows: items.map((it) => rowsByKey.get(it.key)!),
    blocks: blocks.sort((a, b) => a.date.localeCompare(b.date) || a.itemKey.localeCompare(b.itemKey)),
  };
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
