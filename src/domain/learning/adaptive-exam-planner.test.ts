import { describe, expect, it } from "vitest";
import {
  adaptivePlannerConfig,
  buildAdaptiveDayPlanMeta,
  countAdaptiveQueues,
  createAdaptiveUnit,
  estimateItemsForBudget,
  isUnitFragile,
  isUnitStable,
  recordAdaptiveAttempt,
  resolvePlannerModeMinutes,
} from "@/domain/learning/adaptive-exam-planner";

describe("adaptive-exam-planner", () => {
  const t0 = "2026-07-20T10:00:00.000Z";
  const t1 = "2026-07-21T10:00:00.000Z"; // +24h
  const t2 = "2026-07-22T10:00:00.000Z";
  const t3 = "2026-07-23T10:00:00.000Z";

  it("returns incorrect/forgotten quickly and expands after delayed successes", () => {
    let unit = createAdaptiveUnit("ku-1", t0, { difficulty: 3 });
    unit = recordAdaptiveAttempt({
      unit,
      result: "incorrect",
      nowIso: t0,
      sessionKey: "s0",
    });
    expect(unit.mistakeCount).toBe(1);
    expect(unit.consecutiveSuccessfulRetrievals).toBe(0);
    const failGapMs =
      new Date(unit.nextReview).getTime() - new Date(t0).getTime();
    expect(failGapMs).toBeLessThanOrEqual(0.3 * 86_400_000);

    unit = recordAdaptiveAttempt({
      unit,
      result: "correct",
      nowIso: t1,
      sessionKey: "s1",
    });
    unit = recordAdaptiveAttempt({
      unit,
      result: "correct",
      nowIso: t2,
      sessionKey: "s2",
    });
    unit = recordAdaptiveAttempt({
      unit,
      result: "correct",
      nowIso: t3,
      sessionKey: "s3",
    });
    expect(unit.separatedSuccessfulSessions).toBeGreaterThanOrEqual(
      adaptivePlannerConfig.successiveSessionsForStable,
    );
  });

  it("requires successive relearning before stable", () => {
    let unit = createAdaptiveUnit("ku-2", t0);
    unit = recordAdaptiveAttempt({
      unit,
      result: "correct",
      nowIso: t0,
      sessionKey: "a",
    });
    expect(isUnitStable(unit)).toBe(false);
    expect(isUnitFragile(unit, t0)).toBe(true);

    unit = recordAdaptiveAttempt({
      unit,
      result: "correct",
      nowIso: t1,
      sessionKey: "b",
    });
    unit = recordAdaptiveAttempt({
      unit,
      result: "correct",
      nowIso: t2,
      sessionKey: "c",
    });
    // Still needs consecutive + zero mistakes after enough sessions
    // mistakeCount stays 0; after 3 separated + consecutive >= 2 → stable
    expect(unit.separatedSuccessfulSessions).toBeGreaterThanOrEqual(3);
    expect(isUnitStable(unit)).toBe(true);
  });

  it("shortens interval for partial / difficult retrieval", () => {
    let unit = createAdaptiveUnit("ku-3", t0, { difficulty: 5 });
    unit = recordAdaptiveAttempt({
      unit,
      result: "partial",
      nowIso: t0,
      contentDifficulty: 5,
    });
    const gap =
      new Date(unit.nextReview).getTime() - new Date(t0).getTime();
    expect(gap).toBeLessThanOrEqual(0.8 * 86_400_000);
    expect(unit.result).toBe("partial");
  });

  it("modes resolve to 15 / 30 / 60 / deadline-aware required", () => {
    expect(
      resolvePlannerModeMinutes("min_15", {
        dailyMinutes: 30,
        daysRemaining: 40,
        overdueCount: 10,
        openMistakesCount: 2,
        fragileCount: 3,
        newAvailable: 5,
      }),
    ).toBe(15);
    expect(
      resolvePlannerModeMinutes("min_30", {
        dailyMinutes: 30,
        daysRemaining: 40,
        overdueCount: 10,
        openMistakesCount: 2,
        fragileCount: 3,
        newAvailable: 5,
      }),
    ).toBe(30);
    expect(
      resolvePlannerModeMinutes("min_60", {
        dailyMinutes: 30,
        daysRemaining: 40,
        overdueCount: 10,
        openMistakesCount: 2,
        fragileCount: 3,
        newAvailable: 5,
      }),
    ).toBe(60);
    const required = resolvePlannerModeMinutes("required", {
      dailyMinutes: 30,
      daysRemaining: 20,
      overdueCount: 40,
      openMistakesCount: 8,
      fragileCount: 12,
      newAvailable: 10,
      missedDays: 3,
    });
    expect(required).toBeGreaterThanOrEqual(15);
    expect(required).toBeLessThanOrEqual(Math.round(30 * 1.2));
  });

  it("estimates capacity with Czech copy and caps backlog", () => {
    const queues = {
      overdue: 40,
      mistakes: 12,
      fragile: 15,
      newUnits: 8,
      mixed: 8,
    };
    const { estimatedItems, estimateCs, allocation } = estimateItemsForBudget(
      30,
      queues,
    );
    expect(estimatedItems).toBeGreaterThan(0);
    expect(estimatedItems).toBeLessThanOrEqual(
      adaptivePlannerConfig.hardMaxItemsPerDay,
    );
    expect(estimateCs).toMatch(/Dnes zvládneš přibližně \d+ polož/);
    expect(
      allocation.overdue +
        allocation.mistakes +
        allocation.fragile +
        allocation.new +
        allocation.mixed,
    ).toBe(estimatedItems);
  });

  it("builds day plan meta with gentle miss replan note", () => {
    const meta = buildAdaptiveDayPlanMeta({
      mode: "min_30",
      dailyMinutes: 30,
      daysRemaining: 25,
      queues: countAdaptiveQueues(
        [
          createAdaptiveUnit("a", "2026-07-01T00:00:00.000Z"),
          (() => {
            let u = createAdaptiveUnit("b", t0);
            u = recordAdaptiveAttempt({
              unit: u,
              result: "incorrect",
              nowIso: t0,
            });
            return u;
          })(),
        ],
        t1,
      ),
      missedDays: 2,
      replannedAfterMiss: true,
    });
    expect(meta.estimateCs).toMatch(/Dnes zvládneš/);
    expect(meta.replanNoteCs).toMatch(/nepočítá jako trest/);
    expect(meta.budgetMinutes).toBe(30);
  });

  it("counts overdue / mistakes / fragile queues", () => {
    const now = t1;
    const fresh = createAdaptiveUnit("new", now);
    let miss = createAdaptiveUnit("miss", t0);
    miss = recordAdaptiveAttempt({
      unit: miss,
      result: "incorrect",
      nowIso: t0,
    });
    const queues = countAdaptiveQueues([fresh, miss], now);
    expect(queues.newUnits).toBeGreaterThanOrEqual(1);
    expect(queues.mistakes).toBeGreaterThanOrEqual(1);
  });
});
