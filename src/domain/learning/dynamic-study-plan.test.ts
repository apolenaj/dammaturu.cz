import { describe, expect, it } from "vitest";
import { buildDynamicStudyPlan } from "@/domain/learning/dynamic-study-plan";

describe("dynamic-study-plan (D-041)", () => {
  const base = {
    targetDate: "2026-10-01",
    subjects: ["cjl" as const],
    studyMode: "standard" as const,
    dailyMinutes: 30,
    readinessPct: 48,
    readinessFeeling: 3 as const,
    weekDeltaPct: null as number | null,
    materialsReadyCount: 1,
    materialsPendingCount: 0,
    materialsKnowledgePoints: 24,
    weakAreas: [
      {
        labelCs: "Rozbory",
        pct: 38,
        href: "/app/learn/rekonstrukce-pribehu/literarni-dej",
      },
    ],
    dueReviews: 14,
    contentUnits: 28,
    missedDays: 0,
  };

  it("builds Today / This week / Milestones / Risk areas to student exam date", () => {
    const plan = buildDynamicStudyPlan(
      base,
      new Date(2026, 6, 21, 12, 0, 0),
    );
    expect(plan.targetDate).toBe("2026-10-01");
    expect(plan.today.minutes).toBeGreaterThan(0);
    expect(plan.today.items.length).toBeGreaterThan(0);
    expect(plan.thisWeek).toHaveLength(7);
    expect(plan.thisWeek[0]!.isToday).toBe(true);
    expect(plan.milestones.some((m) => m.id === "exam")).toBe(true);
    expect(plan.milestones.find((m) => m.id === "exam")!.dateKey).toBe(
      "2026-10-01",
    );
    expect(plan.riskAreas.some((r) => r.titleCs === "Rozbory")).toBe(true);
    expect(plan.philosophyCs.toLowerCase()).toMatch(/realist/);
  });

  it("recalculates after miss, fast mastery, materials, and exam date change", () => {
    const plan = buildDynamicStudyPlan(
      {
        ...base,
        missedDays: 4,
        weekDeltaPct: 8,
        materialsRecentlyReady: true,
        previousTargetDate: "2026-09-01",
      },
      new Date(2026, 6, 21, 12, 0, 0),
    );
    expect(plan.recalculationReasonsCs.join(" ")).toMatch(/Vynechané/);
    expect(plan.recalculationReasonsCs.join(" ")).toMatch(/rychleji|materiál/i);
    expect(plan.recalculationReasonsCs.join(" ")).toMatch(/Datum maturity/);
    expect(plan.engine.recalculatedAfterMiss).toBe(true);
  });

  it("never hardcodes August 31 as the exam date", () => {
    const plan = buildDynamicStudyPlan(
      { ...base, targetDate: "2027-05-20" },
      new Date(2026, 6, 21, 12, 0, 0),
    );
    expect(plan.targetDate).toBe("2027-05-20");
    expect(JSON.stringify(plan)).not.toMatch(/2026-08-31/);
  });
});
