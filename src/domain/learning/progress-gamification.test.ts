import { describe, expect, it } from "vitest";
import {
  PROGRESS_MILESTONES,
  TOPIC_MASTERED_PCT,
  WEEKLY_MISSION_GOAL,
  XP_AFFECTS_READINESS,
  applyReadinessBaselines,
  applyTopicCompletionsFromAreas,
  assertXpDoesNotAffectReadiness,
  buildProgressMotivationView,
  buildWeeklyGoalView,
  celebrateMockExam,
  celebrateStreakMarks,
  celebrateTopicCompletions,
  celebrateWeeklyGoalIfMet,
  emptyProgressState,
  evaluateUnlockedMilestones,
  mergeMilestoneUnlocks,
  progressPhilosophyCs,
  recordMockExamInState,
  secondaryXpRewards,
  weekStartDateKey,
  dateKeysInWeek,
} from "@/domain/learning/progress-gamification";

describe("progress-gamification (D-047 / D-060)", () => {
  it("defines study-first milestones and forbids XP→readiness coupling", () => {
    expect(PROGRESS_MILESTONES).toHaveLength(5);
    expect(PROGRESS_MILESTONES.find((m) => m.id === "seven_day_streak")?.titleCs).toBe(
      "7 dní v řadě",
    );
    expect(
      PROGRESS_MILESTONES.find((m) => m.id === "first_simulation")?.titleCs,
    ).toMatch(/maturita nanečisto/i);
    expect(WEEKLY_MISSION_GOAL).toBe(5);
    expect(XP_AFFECTS_READINESS).toBe(false);
    expect(assertXpDoesNotAffectReadiness()).toBe(false);
    expect(progressPhilosophyCs).toMatch(/nepřidává|připravenost/i);
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

  it("celebrates topic mastery with evidence-first copy", () => {
    const now = "2026-07-20T12:00:00.000Z";
    let state = emptyProgressState("learner-1", now);
    const applied = applyTopicCompletionsFromAreas(
      state,
      [{ id: "romantismus", labelCs: "Romantismus", pct: 85 }],
      now,
    );
    state = applied.state;
    expect(applied.justCompleted).toHaveLength(1);
    const celeb = celebrateTopicCompletions(applied.justCompleted);
    expect(celeb[0]!.titleCs).toBe("Romantismus zvládnut");
    expect(celeb[0]!.kind).toBe("topic_mastered");
  });

  it("celebrates readiness area jumps without inventing scores", () => {
    const now = "2026-07-20T12:00:00.000Z";
    let state = emptyProgressState("learner-1", now);
    state = {
      ...state,
      lastSeenAreaPcts: { jazyk: 50 },
      lastSeenOverallPct: 40,
    };
    const diff = applyReadinessBaselines(state, {
      overallPct: 52,
      areas: [{ id: "jazyk", labelCs: "Jazyk", pct: 62 }],
      nowIso: now,
    });
    expect(diff.celebrations.some((c) => c.titleCs === "+12 % · Jazyk")).toBe(
      true,
    );
    expect(diff.celebrations.some((c) => c.kind === "readiness_overall")).toBe(
      true,
    );
    // XP unchanged — celebration is display-only relative to readiness write
    expect(diff.state.secondaryXp).toBe(state.secondaryXp);
  });

  it("celebrates streak marks and weekly goal once", () => {
    const now = "2026-07-20T12:00:00.000Z";
    const state = emptyProgressState("learner-1", now);
    const streak = celebrateStreakMarks(state, 7, now);
    expect(streak.celebrations.some((c) => c.titleCs === "7 dní v řadě")).toBe(
      true,
    );
    const again = celebrateStreakMarks(streak.state, 7, now);
    expect(again.celebrations).toHaveLength(0);

    const week = celebrateWeeklyGoalIfMet(streak.state, 5, "2026-07-20", now);
    expect(week.celebrations[0]!.kind).toBe("weekly_goal");
    const weekAgain = celebrateWeeklyGoalIfMet(
      week.state,
      5,
      "2026-07-20",
      now,
    );
    expect(weekAgain.celebrations).toHaveLength(0);
  });

  it("celebrates first mock exam as maturita nanečisto", () => {
    const celeb = celebrateMockExam({
      isFirst: true,
      isPersonalBest: true,
      score: 71,
      topicSlug: "maj",
      nowIso: "2026-07-20T12:00:00.000Z",
    });
    expect(celeb[0]!.titleCs).toMatch(/První maturita nanečisto/i);
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
    ).state;

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
    expect(view.secondaryXpNoteCs).toMatch(/nepřidává do připravenosti/i);
    expect(view.celebrations).toEqual([]);
    expect(view.milestones.filter((m) => m.unlocked).length).toBeGreaterThan(0);
    expect(view.personalBests.mockExamScore).toBe(72);
  });

  it("computes week date keys from Monday", () => {
    const start = weekStartDateKey(new Date("2026-07-22T15:00:00"));
    expect(start).toBe("2026-07-20");
    expect(dateKeysInWeek(start)).toHaveLength(7);
    expect(dateKeysInWeek(start)[6]).toBe("2026-07-26");
  });
});
