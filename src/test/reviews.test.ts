import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { reviewBlocks } from "@/lib/reviews";

describe("reviewBlocks", () => {
  it("schedules three 15-minute reviews 3, 7 and 21 days after completion", () => {
    const r = reviewBlocks(new Date(2026, 10, 8), "Funções");
    expect(r.map((b) => b.date)).toEqual(["2026-11-11", "2026-11-15", "2026-11-29"]);
    expect(r.every((b) => b.minutes === 15)).toBe(true);
    expect(r[0].label).toBe("Revisão 1/3 · Funções");
    expect(r.map((b) => b.reviewStep)).toEqual([1, 2, 3]);
  });
});
