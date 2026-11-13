import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MonthPlanDialog from "@/components/planner/MonthPlanDialog";
import type { MonthPlanInput, PlannerItem } from "@/hooks/usePlanner";

function item(over: Partial<PlannerItem>): PlannerItem {
  return {
    id: "x",
    key: "course:x",
    kind: "course",
    name: "X",
    color: "#000000",
    deadline: null,
    weeklyHours: null,
    days: null,
    priority: 1,
    remainingHours: null,
    paceHours: 0,
    itemStatus: "in_progress",
    status: "in_progress",
    ...over,
  };
}

const ITEMS = [
  item({ id: "old", key: "course:old", name: "Curso antigo", remainingHours: 5, deadline: "2026-11-20" }),
  item({ id: "small", key: "course:small", name: "Curso pequeno", remainingHours: 11 }),
  item({ id: "big", key: "course:big", name: "Curso grande", remainingHours: 88 }),
  item({ id: "front", key: "path:front", kind: "path", name: "Frontend", stepCount: 44, remainingWith: (t) => t }),
  // 3.5 h/week over 7 days takes 30 min of every day.
  item({ id: "en", key: "language:en", kind: "language", name: "Inglês", weeklyHours: 3.5 }),
];

describe("MonthPlanDialog", () => {
  beforeEach(() => {
    // Monday 2026-11-09: 22 study days left in the month.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 9, 12));
  });
  afterEach(() => vi.useRealTimers());

  it("asks, recommends a split for the big course and applies deadlines", async () => {
    const onApply = vi.fn<(plan: MonthPlanInput) => Promise<boolean>>().mockResolvedValue(true);
    render(<MonthPlanDialog items={ITEMS} availableDays={null} budgetHours={2} dailyLimitHours={null} frozen={new Set()} onApply={onApply} />);
    const next = () => screen.getByRole("button", { name: "Avançar" });

    fireEvent.click(screen.getByRole("button", { name: "Planejar o mês" }));
    expect(screen.getByText("Quando você pode estudar?")).toBeInTheDocument();
    fireEvent.click(next());

    // The course that already had a deadline comes checked; unchecking drops it from the month.
    expect(screen.getByRole("checkbox", { name: /Curso antigo/ })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: /Curso antigo/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Curso pequeno/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Curso grande/ }));
    // Alone at 2 h/day: 5 h and 11 h fit in November, 88 h needs December too.
    expect(screen.getAllByText("cabe neste mês")).toHaveLength(2);
    expect(screen.getByText("cerca de 2 meses no seu ritmo")).toBeInTheDocument();
    fireEvent.click(next());

    // A path without hours asks for its total before going on.
    fireEvent.click(screen.getByRole("checkbox", { name: /Frontend/ }));
    expect(next()).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Total de horas da trilha inteira"), { target: { value: "22" } });
    expect(screen.getByText(/30min por etapa/)).toBeInTheDocument();
    fireEvent.click(next());

    // Free time is 2 h minus 30 min of English. Everything in November would need 0.5 + 4 + 1 = 5.5 h.
    expect(screen.getByText(/Tudo em novembro exigiria/)).toHaveTextContent("5h 30min");
    expect(screen.getByText(/você precisa de/)).toHaveTextContent("Curso pequeno + Curso grande + Frontend você precisa de 1h 25min por dia de estudo");
    expect(screen.getByRole("status")).toHaveTextContent("Cabe na sua disponibilidade.");

    fireEvent.click(screen.getByRole("button", { name: "Aplicar plano" }));
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    const plan = onApply.mock.calls[0][0];
    expect(plan.availableDays).toBeNull();
    expect(plan.dailyLimitHours).toBeNull();
    expect(plan.picks.map((p) => [p.item.key, p.deadline, p.workloadHours])).toEqual([
      ["course:small", "2026-11-30", undefined],
      ["course:big", "2027-04-30", undefined],
      ["path:front", "2026-12-31", 22],
    ]);
    expect(plan.dropped.map((i) => i.key)).toEqual(["course:old"]);
  });
});
