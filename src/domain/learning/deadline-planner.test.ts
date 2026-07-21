import { describe, expect, it } from "vitest";
import {
  buildDeadlinePlan,
  computeMissedDays,
  isAvailableStudyDay,
  planTodayLoad,
  resolveAvailableDaysPerWeek,
} from "@/domain/learning/deadline-planner";

describe("deadline-planner (D-038)", () => {
  const base = {
    targetDate: "2026-09-15",
    dailyMinutes: 45,
    availableDaysPerWeek: 5,
    contentUnits: 31,
    difficultyIndex: 3.2,
    masteryPct: 42,
    dueReviews: 18,
    missedDays: 0,
    readinessFeeling: 3 as const,
  };

  it("uses the student's targetDate — never invents a product deadline", () => {
    const plan = buildDeadlinePlan(base, new Date(2026, 6, 21, 12, 0, 0));
    expect(plan.targetDate).toBe("2026-09-15");
    expect(plan.targetDate).not.toBe("2026-08-31");
    expect(plan.daysRemaining).toBeGreaterThan(30);
    expect(plan.bufferDays).toBeGreaterThanOrEqual(3);
    expect(plan.studyDays).toBeLessThan(plan.daysRemaining);
    expect(plan.phases.map((p) => p.phase)).toEqual([
      "coverage",
      "consolidation",
      "exam_readiness",
      "final_review",
    ]);
    expect(plan.availableMinutes).toBe(plan.studyDays * 45);
    expect(plan.reviewsNeeded).toBeGreaterThanOrEqual(18);
  });

  it("respects available days per week (weekdays vs every day)", () => {
    const weekdays = buildDeadlinePlan(
      { ...base, availableDaysPerWeek: 5 },
      new Date(2026, 6, 21, 12, 0, 0),
    );
    const everyday = buildDeadlinePlan(
      { ...base, availableDaysPerWeek: 7 },
      new Date(2026, 6, 21, 12, 0, 0),
    );
    expect(everyday.studyDays).toBeGreaterThan(weekdays.studyDays);
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
    expect(
      plan.today.backlogCapped || plan.today.scheduledMinutes <= 45 * 1.2,
    ).toBe(true);
    expect(plan.today.scheduledMinutes).toBeLessThanOrEqual(
      Math.round(45 * 1.2),
    );
    expect(plan.today.noteCs.toLowerCase()).toMatch(/přepočít|vynechan/);
  });

  it("folds ready materials into content demand", () => {
    const without = buildDeadlinePlan(base, new Date(2026, 6, 21, 12, 0, 0));
    const withMats = buildDeadlinePlan(
      {
        ...base,
        materialsReadyCount: 2,
        materialsKnowledgePoints: 48,
      },
      new Date(2026, 6, 21, 12, 0, 0),
    );
    expect(withMats.contentUnits).toBeGreaterThan(without.contentUnits);
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

  it("maps study mode to available days", () => {
    expect(resolveAvailableDaysPerWeek({ studyMode: "intensive" })).toBe(6);
    expect(resolveAvailableDaysPerWeek({ studyMode: "standard" })).toBe(5);
    expect(
      isAvailableStudyDay(new Date(2026, 6, 25, 12), 5), // Saturday
    ).toBe(false);
    expect(
      isAvailableStudyDay(new Date(2026, 6, 24, 12), 5), // Friday
    ).toBe(true);
  });
});
