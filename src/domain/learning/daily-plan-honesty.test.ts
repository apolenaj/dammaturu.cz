import { describe, expect, it } from "vitest";
import { buildDailyPlanSteps } from "@/domain/learning/daily-dashboard";

describe("daily plan honesty (QA)", () => {
  it("does not invent due card floors when count is 0", () => {
    const steps = buildDailyPlanSteps({ dueCardCount: 0 });
    expect(steps[1]!.titleCs).toMatch(/Žádné due|0/);
    expect(steps[1]!.labelCs).toMatch(/0 due/);
  });

  it("keeps real due counts", () => {
    const steps = buildDailyPlanSteps({ dueCardCount: 12 });
    expect(steps[1]!.labelCs).toMatch(/12 kartiček/);
  });
});
