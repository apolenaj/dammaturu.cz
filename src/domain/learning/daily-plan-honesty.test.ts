import { describe, expect, it } from "vitest";
import {
  buildDailyMissionPlan,
  buildDailyPlanSteps,
} from "@/domain/learning/daily-dashboard";

describe("daily plan honesty (QA)", () => {
  it("does not invent overdue review items when count is 0", () => {
    const steps = buildDailyPlanSteps({ dueCardCount: 0, dailyMinutes: 30 });
    const review = steps.find((s) => s.kind === "review");
    expect(review).toBeUndefined();
    expect(
      steps.every((s) => !/[1-9]\d* položek k opakování/.test(s.labelCs)),
    ).toBe(true);
  });

  it("keeps real due counts on the review step", () => {
    const steps = buildDailyPlanSteps({ dueCardCount: 12, dailyMinutes: 30 });
    const review = steps.find((s) => s.kind === "review");
    expect(review?.labelCs).toMatch(/12 položek/);
  });

  it("does not invent mistake counts", () => {
    const plan = buildDailyMissionPlan({
      signals: {
        overdueCount: 5,
        openMistakesCount: 0,
        weakAreaLabelCs: null,
        weakAreaHref: null,
        weakAreaPct: null,
        daysRemaining: 40,
      },
      dailyMinutes: 30,
    });
    expect(plan.steps.every((s) => s.kind !== "mistakes")).toBe(true);
  });
});
