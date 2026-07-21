import { describe, expect, it } from "vitest";
import {
  buildDeadlinePlan,
  computeMissedDays,
  plannerConfig,
  planTodayLoad,
} from "@/domain/learning/deadline-planner";

describe("deadline-planner (D-038)", () => {
  const base = {
    targetDate: plannerConfig.betaTargetDate,
    dailyMinutes: 45,
    contentUnits: 31,
    difficultyIndex: 3.2,
    masteryPct: 42,
    dueReviews: 18,
    missedDays: 0,
    readinessFeeling: 3 as const,
  };

  it("targets beta date 31 Aug and computes buffer + phases", () => {
    const plan = buildDeadlinePlan(base, new Date(2026, 6, 21, 12, 0, 0));
    expect(plan.targetDate).toBe("2026-08-31");
    expect(plan.daysRemaining).toBeGreaterThan(30);
    expect(plan.bufferDays).toBeGreaterThanOrEqual(3);
    expect(plan.studyDays).toBe(plan.daysRemaining - plan.bufferDays);
    expect(plan.phases.map((p) => p.phase)).toEqual([
      "coverage",
      "consolidation",
      "exam_readiness",
      "final_review",
    ]);
    expect(plan.summaryLinesCs.length).toBeGreaterThanOrEqual(6);
    expect(plan.availableMinutes).toBe(plan.studyDays * 45);
    expect(plan.reviewsNeeded).toBeGreaterThanOrEqual(18);
  });

  it("stays in coverage when mastery is low", () => {
    const plan = buildDeadlinePlan(
      { ...base, masteryPct: 30 },
      new Date(2026, 6, 21, 12, 0, 0),
    );
    expect(plan.currentPhase).toBe("coverage");
  });

  it("recalculates after missed days without dumping full backlog", () => {
    const plan = buildDeadlinePlan(
      { ...base, missedDays: 5, dueReviews: 80 },
      new Date(2026, 6, 21, 12, 0, 0),
    );
    expect(plan.recalculatedAfterMiss).toBe(true);
    expect(plan.today.backlogCapped || plan.today.scheduledMinutes <= 45 * 1.2).toBe(
      true,
    );
    expect(plan.today.scheduledMinutes).toBeLessThanOrEqual(
      Math.round(45 * plannerConfig.maxDailyLoadFactor),
    );
    expect(plan.today.reviewItems).toBeLessThanOrEqual(
      plannerConfig.maxReviewsPerDay,
    );
    expect(plan.today.noteCs.toLowerCase()).toMatch(/přepočít|vynechan/);
  });

  it("computeMissedDays ignores today/yesterday", () => {
    expect(
      computeMissedDays({
        lastCompletedDateKey: "2026-07-20",
        todayKey: "2026-07-21",
      }),
    ).toBe(0);
    expect(
      computeMissedDays({
        lastCompletedDateKey: "2026-07-18",
        todayKey: "2026-07-21",
      }),
    ).toBe(2);
  });

  it("final review near deadline", () => {
    const plan = buildDeadlinePlan(
      { ...base, targetDate: "2026-07-25", masteryPct: 70 },
      new Date(2026, 6, 21, 12, 0, 0),
    );
    expect(plan.daysRemaining).toBeLessThanOrEqual(5);
    expect(["final_review", "exam_readiness"]).toContain(plan.currentPhase);
  });

  it("caps daily load in planTodayLoad", () => {
    const today = planTodayLoad({
      phase: "consolidation",
      dailyMinutes: 30,
      missedDays: 10,
      dueReviews: 200,
      contentUnits: 31,
      masteryPct: 40,
      difficultyIndex: 4,
    });
    expect(today.scheduledMinutes).toBeLessThanOrEqual(36);
    expect(today.reviewItems).toBeLessThanOrEqual(24);
  });
});
