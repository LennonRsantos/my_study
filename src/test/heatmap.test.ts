import { describe, it, expect } from "vitest";
import { buildHeatmap, longestStreak } from "@/hooks/useStats";

describe("buildHeatmap", () => {
  it("covers a whole year in full weeks and hides days outside it or in the future", () => {
    const { days, weeks } = buildHeatmap({ "2025-03-10": 2 }, new Set(["2025-03-11"]), 2025, new Date(2026, 10, 8));
    expect(days.length).toBe(weeks * 7);
    expect(days.filter(Boolean)).toHaveLength(365);
    expect(days.find((d) => d?.day === "2025-03-10")?.hours).toBe(2);
    expect(days.find((d) => d?.day === "2025-03-11")?.frozen).toBe(true);
  });

  it("stops at today in the current year", () => {
    const { days } = buildHeatmap({}, new Set(), 2026, new Date(2026, 0, 3));
    expect(days.filter(Boolean).map((d) => d!.day)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
  });
});

describe("longestStreak", () => {
  it("counts study and frozen days and breaks on a gap", () => {
    const hours = { "2026-01-01": 1, "2026-01-02": 1, "2026-01-05": 1, "2026-01-07": 0.5 };
    expect(longestStreak(hours, new Set(["2026-01-06"]))).toBe(3);
    expect(longestStreak({}, new Set())).toBe(0);
  });
});
