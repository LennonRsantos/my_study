import { describe, it, expect } from "vitest";
import { addDays, getISODay } from "date-fns";
import { buildPlan, dayAllowed, doneMinutes, monthOptions, overloadedDays, recommendMonths, splitBlock, type PlanItem, type PlanBlock } from "@/lib/planner";
import { toDayKey } from "@/lib/streak";

// 2026-11-09 is a Monday (local time).
const TODAY = new Date(2026, 10, 9);

function item(over: Partial<PlanItem> = {}): PlanItem {
  return {
    key: "course:a",
    kind: "course",
    name: "Curso A",
    color: "#000000",
    deadline: null,
    weeklyHours: null,
    days: null,
    priority: 1,
    remainingHours: null,
    paceHours: 0,
    ...over,
  };
}

function plan(items: PlanItem[], extra: { budget?: number; frozen?: string[]; reserved?: Map<string, number>; available?: number[] } = {}) {
  return buildPlan({
    items,
    today: TODAY,
    dailyBudgetHours: extra.budget ?? Infinity,
    frozen: new Set(extra.frozen ?? []),
    reserved: extra.reserved,
    availableDays: extra.available,
  });
}

const sumMin = (blocks: PlanBlock[]) => blocks.reduce((a, b) => a + b.minutes, 0);

describe("buildPlan: weekly goal", () => {
  it("spreads 5 h/week over Mon/Wed/Fri with 300 min in the first week", () => {
    const { blocks } = plan([item({ weeklyHours: 5, days: [1, 3, 5] })]);
    expect(blocks.every((b) => [1, 3, 5].includes(getISODay(new Date(b.date + "T12:00:00"))))).toBe(true);
    const firstWeek = blocks.filter((b) => b.date <= toDayKey(addDays(TODAY, 6)));
    expect(sumMin(firstWeek)).toBe(300);
  });

  it("never plans more than remaining hours", () => {
    const { blocks } = plan([item({ weeklyHours: 7, remainingHours: 1 })]);
    expect(sumMin(blocks)).toBe(60);
  });

  it("reports ahead / ontrack / behind from pace vs goal", () => {
    const status = (pace: number) => plan([item({ weeklyHours: 5, paceHours: pace })]).rows[0].status;
    expect(status(6.25)).toBe("ahead");
    expect(status(5)).toBe("ontrack");
    expect(status(4)).toBe("behind");
  });
});

describe("buildPlan: deadline", () => {
  it("derives about 1 h/day from 10 h over 10 days", () => {
    const { rows, blocks } = plan([item({ remainingHours: 10, deadline: "2026-11-18" })]);
    expect(rows[0].requiredWeekly).toBeCloseTo(7, 5);
    expect(blocks).toHaveLength(10);
    expect(blocks.every((b) => b.minutes === 60)).toBe(true);
    expect(sumMin(blocks)).toBe(600);
  });

  it("schedules nothing after the deadline", () => {
    const { blocks } = plan([item({ remainingHours: 100, deadline: "2026-11-11" })]);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.every((b) => b.date <= "2026-11-11")).toBe(true);
  });

  it("is behind with no usable day before the deadline", () => {
    // Deadline is tomorrow (Tue) but only Sunday is allowed.
    const { rows, blocks } = plan([item({ remainingHours: 5, deadline: "2026-11-10", days: [7] })]);
    expect(rows[0].status).toBe("behind");
    expect(blocks).toHaveLength(0);
  });

  it("is behind and empty when the deadline has passed", () => {
    const { rows, blocks } = plan([item({ remainingHours: 5, deadline: "2026-11-01" })]);
    expect(rows[0].status).toBe("behind");
    expect(blocks).toHaveLength(0);
  });
});

describe("buildPlan: status and calendar rules", () => {
  it("is done and empty when nothing remains", () => {
    const { rows, blocks } = plan([item({ remainingHours: 0, weeklyHours: 5 })]);
    expect(rows[0].status).toBe("done");
    expect(blocks).toHaveLength(0);
  });

  it("is nodata without deadline or weekly goal", () => {
    const { rows, blocks } = plan([item({ remainingHours: 10 })]);
    expect(rows[0].status).toBe("nodata");
    expect(blocks).toHaveLength(0);
  });

  it("skips frozen days", () => {
    const { blocks } = plan([item({ weeklyHours: 7 })], { frozen: ["2026-11-09"] });
    expect(blocks.some((b) => b.date === "2026-11-09")).toBe(false);
    expect(blocks.some((b) => b.date === "2026-11-10")).toBe(true);
  });
});

describe("buildPlan: shared daily budget", () => {
  it("gives the budget to the higher priority first and reports the overflow", () => {
    const { rows, blocks } = plan(
      [
        item({ key: "course:a", name: "A", weeklyHours: 7, priority: 2 }),
        item({ key: "course:b", name: "B", weeklyHours: 7, priority: 0 }),
      ],
      { budget: 1 },
    );
    expect(blocks.filter((b) => b.itemKey === "course:b")).toHaveLength(0);
    const rowA = rows.find((r) => r.key === "course:a")!;
    const rowB = rows.find((r) => r.key === "course:b")!;
    expect(rowA.unplacedHours).toBe(0);
    expect(rowB.unplacedHours).toBeGreaterThan(0);
  });
});

describe("buildPlan: module labels", () => {
  const modules = [
    { name: "Módulo 1", minutes: 60 },
    { name: "Módulo 2", minutes: 60 },
  ];

  it("advances the label as minutes are consumed", () => {
    const { blocks } = plan([item({ weeklyHours: 7, remainingHours: 2, modules })]);
    expect(blocks.map((b) => b.label)).toEqual(["Módulo 1", "Módulo 2"]);
  });

  it("marks a block that spans several modules", () => {
    // 1.5 h/day: first block covers Módulo 1 and part of Módulo 2.
    const { blocks } = plan([item({ weeklyHours: 10.5, remainingHours: 3, modules })]);
    expect(blocks[0].label).toBe("Módulo 1 +1");
  });
});

describe("doneMinutes", () => {
  it("sums hours per item and day", () => {
    const map = doneMinutes([
      { key: "course:a", date: "2026-11-09", hours: 0.5 },
      { key: "course:a", date: "2026-11-09", hours: 0.25 },
      { key: "course:b", date: "2026-11-09", hours: 1 },
    ]);
    expect(map.get("course:a|2026-11-09")).toBe(45);
    expect(map.get("course:b|2026-11-09")).toBe(60);
  });
});

describe("buildPlan: deadline feasibility", () => {
  it("plans 40 h in 30 days at 80 min/day within a 2 h limit", () => {
    const { rows, blocks } = plan([item({ remainingHours: 40, deadline: toDayKey(addDays(TODAY, 29)) })], { budget: 2 });
    expect(rows[0].dailyMinutes).toBe(80);
    expect(rows[0].feasible).toBe(true);
    expect(blocks.every((b) => b.minutes <= 120)).toBe(true);
  });

  it("flags 40 h in 10 days with a 2 h limit and suggests day 20 or 4 h/day", () => {
    const { rows } = plan([item({ remainingHours: 40, deadline: toDayKey(addDays(TODAY, 9)) })], { budget: 2 });
    expect(rows[0].feasible).toBe(false);
    expect(toDayKey(rows[0].suggestion!.minDeadline!)).toBe(toDayKey(addDays(TODAY, 19)));
    expect(rows[0].suggestion!.neededDailyHours).toBeCloseTo(4, 5);
  });
});

describe("buildPlan: sharing the daily limit", () => {
  it("splits free time by priority among courses without a goal", () => {
    const { rows, blocks } = plan(
      [
        item({ key: "course:a", name: "A", remainingHours: 50, priority: 1 }),
        item({ key: "course:b", name: "B", remainingHours: 50, priority: 2 }),
      ],
      { budget: 2 },
    );
    const day = blocks.filter((b) => b.date === "2026-11-09");
    expect(sumMin(day)).toBe(120);
    const a = rows.find((r) => r.key === "course:a")!;
    const b = rows.find((r) => r.key === "course:b")!;
    expect(b.dailyMinutes).toBeGreaterThan(a.dailyMinutes);
    expect(a.mode).toBe("share");
    expect(a.eta).not.toBeNull();
  });

  it("gives a finished course's share to the others", () => {
    const { blocks } = plan(
      [
        item({ key: "course:a", name: "A", remainingHours: 1 }),
        item({ key: "course:b", name: "B", remainingHours: 50 }),
      ],
      { budget: 2 },
    );
    const last = blocks.filter((b) => b.date === "2026-11-12");
    expect(last.map((b) => [b.itemKey, b.minutes])).toEqual([["course:b", 120]]);
  });

  it("gives deadline items the budget first and shares the rest", () => {
    const { blocks } = plan(
      [
        item({ key: "course:a", name: "A", remainingHours: 10, deadline: "2026-11-18" }),
        item({ key: "course:b", name: "B", remainingHours: 50 }),
      ],
      { budget: 2 },
    );
    const day = blocks.filter((b) => b.date === "2026-11-09");
    expect(day.find((b) => b.itemKey === "course:a")!.minutes).toBe(60);
    expect(day.find((b) => b.itemKey === "course:b")!.minutes).toBe(60);
  });

  it("subtracts reserved minutes from the day", () => {
    const { blocks } = plan([item({ remainingHours: 50 })], { budget: 2, reserved: new Map([["2026-11-09", 30]]) });
    expect(blocks.find((b) => b.date === "2026-11-09")!.minutes).toBe(90);
  });
});

describe("fatigue helpers", () => {
  it("splits a long block with a break", () => {
    expect(splitBlock(120, 90)).toEqual({ parts: [60, 60], breakMinutes: 10 });
    expect(splitBlock(45, 90)).toEqual({ parts: [45], breakMinutes: 0 });
  });

  it("lists only days above the limit", () => {
    const over = overloadedDays(
      [
        { date: "2026-11-09", minutes: 240 },
        { date: "2026-11-09", minutes: 120 },
        { date: "2026-11-10", minutes: 60 },
      ],
      240,
    );
    expect([...over]).toEqual([["2026-11-09", 360]]);
  });
});

describe("month plan", () => {
  const every = () => true;
  const none = new Set<string>();

  it("gives the hours per study day to finish by each month end", () => {
    const [first, second] = monthOptions(22, TODAY, every, none);
    expect(first).toEqual({ months: 1, deadline: "2026-11-30", slots: 22, dailyHours: 1 });
    expect(second.deadline).toBe("2026-12-31");
    expect(second.slots).toBe(53);
  });

  it("counts only allowed weekdays that are not frozen", () => {
    // 16 weekdays from 2026-11-09 to 2026-11-30, one of them frozen.
    const [first] = monthOptions(15, TODAY, dayAllowed([1, 2, 3, 4, 5], null), new Set(["2026-11-10"]));
    expect(first.slots).toBe(15);
    expect(first.dailyHours).toBe(1);
  });

  it("is out of reach in a month without study days", () => {
    // Monday 2026-11-30 is the last day of the month and only Sundays are allowed.
    const [first, second] = monthOptions(5, new Date(2026, 10, 30), dayAllowed([7], null), none);
    expect(first.dailyHours).toBe(Infinity);
    expect(second.slots).toBe(4);
  });

  it("keeps everything in the month when it fits", () => {
    const picks = [
      { key: "course:a", options: monthOptions(11, TODAY, every, none) },
      { key: "path:p", options: monthOptions(22, TODAY, every, none) },
    ];
    expect([...recommendMonths(picks, 2)]).toEqual([["course:a", 1], ["path:p", 1]]);
  });

  it("spreads the big course over more months and keeps the small one", () => {
    // 88 h needs 4 h/day in November, 1.66 by December and 1.05 by January; the small course takes 0.5.
    const picks = [
      { key: "course:small", options: monthOptions(11, TODAY, every, none) },
      { key: "course:big", options: monthOptions(88, TODAY, every, none) },
    ];
    const months = recommendMonths(picks, 2);
    expect(months.get("course:small")).toBe(1);
    expect(months.get("course:big")).toBe(3);
  });

  it("stops at the last option when nothing fits", () => {
    const picks = [{ key: "course:a", options: monthOptions(100, TODAY, every, none, 3) }];
    expect(recommendMonths(picks, 0).get("course:a")).toBe(3);
  });
});

describe("buildPlan: availability and status queue", () => {
  const isoOf = (date: string) => getISODay(new Date(date + "T12:00:00"));

  it("plans only on the user's available days, within the hours per day", () => {
    const { blocks } = plan([item({ remainingHours: 20 })], { budget: 2, available: [1, 3, 5] });
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.every((b) => [1, 3, 5].includes(isoOf(b.date)))).toBe(true);
    expect(blocks.every((b) => b.minutes <= 120)).toBe(true);
  });

  it("intersects item days with available days for deadline slots", () => {
    // 10 h by Sunday 2026-11-22; Mon/Wed/Fri available, item prefers Wed/Fri: 4 slots of 150 min.
    const { rows, blocks } = plan([item({ remainingHours: 10, deadline: "2026-11-22", days: [3, 5, 6] })], { available: [1, 3, 5] });
    expect(blocks.every((b) => [3, 5].includes(isoOf(b.date)))).toBe(true);
    expect(rows[0].dailyMinutes).toBe(150);
  });

  it("gives pending items time only after in-progress ones are planned out", () => {
    const { rows, blocks } = plan(
      [
        item({ key: "course:a", name: "A", remainingHours: 3 }),
        item({ key: "course:b", name: "B", remainingHours: 2, status: "pending" }),
        item({ key: "course:c", name: "C", remainingHours: 2, status: "pending" }),
      ],
      { budget: 1 },
    );
    const days = (k: string) => blocks.filter((b) => b.itemKey === k).map((b) => b.date);
    expect(days("course:a")).toEqual(["2026-11-09", "2026-11-10", "2026-11-11"]);
    expect(days("course:b")).toEqual(["2026-11-12", "2026-11-13"]);
    expect(days("course:c")).toEqual(["2026-11-14", "2026-11-15"]);
    const c = rows.find((r) => r.key === "course:c")!;
    expect(c.mode).toBe("queue");
    expect(c.startDate).toBe("2026-11-14");
    expect(toDayKey(c.eta!)).toBe("2026-11-15");
  });

  it("labels path blocks with the pending steps", () => {
    const { blocks } = plan(
      [item({ key: "path:p", kind: "path", remainingHours: 2, modules: [{ name: "HTML", minutes: 60 }, { name: "CSS", minutes: 60 }] })],
      { budget: 1 },
    );
    expect(blocks.map((b) => b.label)).toEqual(["HTML", "CSS"]);
  });
});
