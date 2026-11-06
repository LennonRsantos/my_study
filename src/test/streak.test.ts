import { describe, it, expect } from "vitest";
import {
  buildFrozenSet, computeStreak, countQualifyingDays,
  dayQualifies, hoursOnDay, toDayKey,
} from "@/lib/streak";
import type { StudySession, FrozenDay } from "@/lib/types";

const mkSession = (date: string, hours: number): StudySession => ({
  id: `s-${date}-${hours}`,
  subjectId: "sub-1",
  date,
  startTime: "10:00",
  endTime: "11:00",
  hours,
  notes: "",
});

const mkFrozen = (date: string): FrozenDay => ({
  id: `f-${date}`,
  frozenDate: date,
  reason: "test",
  compensationDate: "2099-01-01",
  compensationHours: 1,
  compensated: false,
  compensatedAt: null,
});

describe("streak primitives — single source of truth", () => {
  it("hoursOnDay sums all sessions for a date", () => {
    const sessions = [mkSession("2026-04-20", 1), mkSession("2026-04-20", 0.5), mkSession("2026-04-21", 2)];
    expect(hoursOnDay(sessions, "2026-04-20")).toBe(1.5);
    expect(hoursOnDay(sessions, "2026-04-22")).toBe(0);
  });

  it("dayQualifies — any hours > 0 OR frozen", () => {
    const sessions = [mkSession("2026-04-20", 0.25)];
    const frozenSet = buildFrozenSet([mkFrozen("2026-04-19")]);
    expect(dayQualifies(new Date("2026-04-20T12:00:00"), sessions, frozenSet)).toBe(true);
    expect(dayQualifies(new Date("2026-04-19T12:00:00"), sessions, frozenSet)).toBe(true);
    expect(dayQualifies(new Date("2026-04-18T12:00:00"), sessions, frozenSet)).toBe(false);
  });

  it("computeStreak — frozen days preserve continuity", () => {
    // studied 18,19,21,22,23 ; 20 is frozen ; today is 24 (no study yet)
    const sessions = ["2026-04-18", "2026-04-19", "2026-04-21", "2026-04-22", "2026-04-23"]
      .map((d) => mkSession(d, 1));
    const frozenSet = buildFrozenSet([mkFrozen("2026-04-20")]);
    const today = new Date("2026-04-24T08:00:00");
    expect(computeStreak(today, sessions, frozenSet)).toBe(6); // 23,22,21,20(frozen),19,18
  });

  it("computeStreak — today not started doesn't break streak", () => {
    const sessions = [mkSession("2026-04-23", 1), mkSession("2026-04-22", 1)];
    const today = new Date("2026-04-24T08:00:00");
    expect(computeStreak(today, sessions, new Set())).toBe(2);
  });

  it("computeStreak — gap (no study, not frozen) breaks streak", () => {
    const sessions = [mkSession("2026-04-23", 1), mkSession("2026-04-21", 1)];
    const today = new Date("2026-04-24T08:00:00");
    expect(computeStreak(today, sessions, new Set())).toBe(1); // only 23
  });

  it("countQualifyingDays — month includes frozen days, ignores future", () => {
    const sessions = ["2026-04-01", "2026-04-02", "2026-04-05"].map((d) => mkSession(d, 1));
    const frozenSet = buildFrozenSet([mkFrozen("2026-04-03")]);
    const today = new Date("2026-04-10T12:00:00");
    expect(countQualifyingDays(
      new Date("2026-04-01T00:00:00"),
      new Date("2026-04-30T23:59:59"),
      today,
      sessions,
      frozenSet,
    )).toBe(4); // 01, 02, 03(frozen), 05
  });

  it("toDayKey is timezone-stable for noon dates", () => {
    expect(toDayKey(new Date("2026-04-20T12:00:00"))).toBe("2026-04-20");
  });

  it("CONSISTENCY: streak day-by-day matches countQualifyingDays for a contiguous run", () => {
    // If every day in the last N days qualifies, streak should equal N
    // and countQualifyingDays over that same range should also equal N.
    const today = new Date("2026-04-24T08:00:00");
    const dates = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (i + 1));
      return toDayKey(d);
    });
    const sessions = dates.map((d) => mkSession(d, 1));
    const frozenSet = new Set<string>();
    const streak = computeStreak(today, sessions, frozenSet);
    const start = new Date(today); start.setDate(start.getDate() - 10);
    const counted = countQualifyingDays(start, today, today, sessions, frozenSet);
    expect(streak).toBe(10);
    expect(counted).toBe(10);
    expect(streak).toBe(counted);
  });
});
