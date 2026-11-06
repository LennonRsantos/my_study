import { describe, it, expect } from "vitest";
import { addDays, getISODay } from "date-fns";
import { buildPlan, doneMinutes, type PlanItem, type PlanBlock } from "@/lib/planner";
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

function plan(items: PlanItem[], extra: { budget?: number; frozen?: string[] } = {}) {
  return buildPlan({
    items,
    today: TODAY,
    dailyBudgetHours: extra.budget ?? Infinity,
    frozen: new Set(extra.frozen ?? []),
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
