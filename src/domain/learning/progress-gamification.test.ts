import { describe, expect, it } from "vitest";
import {
  PROGRESS_MILESTONES,
  TOPIC_MASTERED_PCT,
  WEEKLY_MISSION_GOAL,
  applyTopicCompletionsFromAreas,
  buildProgressMotivationView,
  buildWeeklyGoalView,
  emptyProgressState,
  evaluateUnlockedMilestones,
  mergeMilestoneUnlocks,
  progressPhilosophyCs,
  recordMockExamInState,
  secondaryXpRewards,
  weekStartDateKey,
  dateKeysInWeek,
} from "@/domain/learning/progress-gamification";

describe("progress-gamification (D-047)", () => {
  it("defines study-first milestones and secondary XP philosophy", () => {
    expect(PROGRESS_MILESTONES).toHaveLength(5);
    expect(PROGRESS_MILESTONES.map((m) => m.id)).toEqual([
      "first_topic_mastered",
      "fifty_ku_mastered",
      "seven_day_streak",
      "first_simulation",
      "eighty_pct_curriculum",
    ]);
    expect(WEEKLY_MISSION_GOAL).toBe(5);
    expect(progressPhilosophyCs).toMatch(/sekundární/i);
    expect(progressPhilosophyCs).not.toMatch(/diamant|avatar/i);
    expect(secondaryXpRewards.missionDay).toBeLessThan(
      secondaryXpRewards.milestone,
    );
  });

  it("evaluates milestones from real progress signals", () => {
    const none = evaluateUnlockedMilestones({
      masteredKuCount: 0,
      readinessOverallPct: 10,
      areaPcts: [{ id: "a", labelCs: "A", pct: 20 }],
      currentStreak: 0,
      longestStreak: 0,
      mockExamCompletions: 0,
    });
    expect(none).toHaveLength(0);

    const all = evaluateUnlockedMilestones({
      masteredKuCount: 50,
      readinessOverallPct: 82,
      areaPcts: [{ id: "rozbory", labelCs: "Rozbory", pct: TOPIC_MASTERED_PCT }],
      currentStreak: 7,
      longestStreak: 7,
      mockExamCompletions: 1,
    });
    expect(all).toHaveLength(5);
  });

  it("builds weekly goal and motivation view with XP as footnote", () => {
    const week = buildWeeklyGoalView(3);
    expect(week.labelCs).toMatch(/3 \/ 5/);
    expect(week.pct).toBe(60);

    const now = "2026-07-20T12:00:00.000Z";
    let state = emptyProgressState("learner-1", now);
    state = applyTopicCompletionsFromAreas(
      state,
      [{ id: "rozbory", labelCs: "Rozbory", pct: 85 }],
      now,
    );
    expect(state.topicCompletions).toHaveLength(1);

    const { state: withSim, isPersonalBest } = recordMockExamInState(state, {
      score: 72,
      topicSlug: "maj",
      nowIso: now,
    });
    expect(isPersonalBest).toBe(true);
    expect(withSim.mockExamCompletions).toBe(1);

    const unlocked = evaluateUnlockedMilestones({
      masteredKuCount: 2,
      readinessOverallPct: 40,
      areaPcts: [{ id: "rozbory", labelCs: "Rozbory", pct: 85 }],
      currentStreak: 1,
      longestStreak: 1,
      mockExamCompletions: withSim.mockExamCompletions,
    });
    const merged = mergeMilestoneUnlocks(withSim, unlocked, now);
    expect(merged.justUnlocked).toContain("first_topic_mastered");
    expect(merged.justUnlocked).toContain("first_simulation");

    const view = buildProgressMotivationView({
      daysRemaining: 40,
      readinessPct: 40,
      masteredKuCount: 2,
      dailyCompleted: false,
      dailyStepsDone: 1,
      dailyStepsTotal: 3,
      weeklyMissionDays: 3,
      currentStreak: 1,
      longestStreak: 1,
      state: merged.state,
    });
    expect(view.primaryGoalCs).toMatch(/40 dní/);
    expect(view.secondaryXpNoteCs).toMatch(/sekundární/i);
    expect(view.milestones.filter((m) => m.unlocked).length).toBeGreaterThan(0);
    expect(view.personalBests.mockExamScore).toBe(72);
  });

  it("computes week date keys from Monday", () => {
    // 2026-07-20 is Monday
    const start = weekStartDateKey(new Date("2026-07-22T15:00:00"));
    expect(start).toBe("2026-07-20");
    expect(dateKeysInWeek(start)).toHaveLength(7);
    expect(dateKeysInWeek(start)[6]).toBe("2026-07-26");
  });
});
