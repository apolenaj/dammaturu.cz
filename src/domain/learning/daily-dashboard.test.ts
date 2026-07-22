import { describe, expect, it } from "vitest";
import {
  applyStreakOnComplete,
  buildDailyDashboardView,
  buildDailyMissionPlan,
  buildDailyPlanSteps,
  emptyStreak,
  formatCompletionCs,
  formatDaysRemainingCs,
  greetingCs,
  packMissionIntoBudget,
  buildMissionCandidates,
  resolveTimeBudget,
  totalPlanMinutes,
  type MissionSignals,
} from "@/domain/learning/daily-dashboard";

const fullSignals = (overdue: number): MissionSignals => ({
  overdueCount: overdue,
  openMistakesCount: 4,
  weakAreaLabelCs: "Rozbory",
  weakAreaHref: "/app/learn/rekonstrukce-pribehu/literarni-dej",
  weakAreaPct: 42,
  daysRemaining: 18,
  newTopicLabelCs: "Realismus v Rusku",
  newTopicHref: "/app/learn/rychle/realismus",
});

describe("daily-dashboard (D-037)", () => {
  it("greets by part of day", () => {
    expect(greetingCs("Jana", new Date(2026, 6, 20, 14, 0, 0))).toBe(
      "Dobré odpoledne, Jana",
    );
    expect(greetingCs("Jana", new Date(2026, 6, 20, 8, 0, 0))).toBe(
      "Dobré ráno, Jana",
    );
  });

  it("maps daily minutes into discrete budgets", () => {
    expect(resolveTimeBudget(10)).toBe(10);
    expect(resolveTimeBudget(15)).toBe(15);
    expect(resolveTimeBudget(25)).toBe(30);
    expect(resolveTimeBudget(40)).toBe(45);
    expect(resolveTimeBudget(60)).toBe(60);
    expect(resolveTimeBudget(90)).toBe(60);
  });

  it("prioritizes overdue before mistakes before weak before exam", () => {
    const candidates = buildMissionCandidates(fullSignals(18));
    expect(candidates.map((c) => c.priority)).toEqual(
      expect.arrayContaining([1, 2, 3, 4]),
    );
    expect(candidates[0]!.kind).toBe("review");
    expect(candidates[1]!.kind).toBe("mistakes");
    expect(candidates[2]!.kind).toBe("learn");
  });

  it("packs a realistic session within 30 min budget", () => {
    const plan = buildDailyMissionPlan({
      signals: fullSignals(18),
      dailyMinutes: 30,
    });
    expect(plan.budgetMinutes).toBe(30);
    expect(plan.totalMinutes).toBeLessThanOrEqual(30);
    expect(plan.totalMinutes).toBeGreaterThanOrEqual(10);
    expect(plan.steps[0]!.kind).toBe("review");
    expect(plan.steps[0]!.labelCs).toMatch(/Zopakovat/);
  });

  it("fits a short 15-minute mission without inventing due counts", () => {
    const plan = buildDailyMissionPlan({
      signals: {
        overdueCount: 0,
        openMistakesCount: 0,
        weakAreaLabelCs: "Rozbory",
        weakAreaHref: "/app/mistakes",
        weakAreaPct: 50,
        daysRemaining: 40,
      },
      dailyMinutes: 15,
    });
    expect(plan.budgetMinutes).toBe(15);
    expect(plan.totalMinutes).toBeLessThanOrEqual(15);
    expect(plan.steps.every((s) => !/\b[1-9]\d* položek/.test(s.labelCs))).toBe(
      true,
    );
  });

  it("legacy buildDailyPlanSteps still works via signals bridge", () => {
    const steps = buildDailyPlanSteps({
      dueCardCount: 18,
      dailyMinutes: 30,
    });
    expect(steps[0]!.kind).toBe("review");
    expect(steps[0]!.labelCs).toMatch(/18 položek/);
    expect(totalPlanMinutes(steps)).toBeLessThanOrEqual(30);
  });

  it("formats days remaining and completion copy", () => {
    expect(formatDaysRemainingCs(37)).toBe("Do cíle zbývá 37 dní.");
    expect(formatCompletionCs(14)).toBe(
      "Hotovo. Dnes jsi posílil/a 14 znalostí.",
    );
  });

  it("increments streak on consecutive days", () => {
    const now = "2026-07-20T18:00:00.000Z";
    let streak = emptyStreak("l1", now);
    streak = applyStreakOnComplete(streak, "2026-07-19", now);
    expect(streak.currentStreak).toBe(1);
    streak = applyStreakOnComplete(streak, "2026-07-20", now);
    expect(streak.currentStreak).toBe(2);
  });

  it("view exposes one CTA with remaining minutes", () => {
    const now = new Date(2026, 6, 20, 14, 0, 0);
    const plan = buildDailyMissionPlan({
      signals: fullSignals(12),
      dailyMinutes: 30,
    });
    const steps = plan.steps.map((s) => ({ ...s, done: false }));
    const view = buildDailyDashboardView({
      displayName: "Josef",
      daysRemaining: 37,
      now,
      day: {
        learnerId: "l1",
        dateKey: "2026-07-20",
        steps,
        budgetMinutes: plan.budgetMinutes,
        plannerMode: "min_30",
        completedAt: null,
        knowledgeStrengthened: 0,
        updatedAt: now.toISOString(),
      },
      streak: emptyStreak("l1", now.toISOString()),
    });
    expect(view.questionCs).toBe("Co mám dnes udělat?");
    expect(view.ctaLabelCs).toBe(
      `Začít dnešní misi — ${view.remainingMinutes} min`,
    );
    expect(view.planTitleCs).toBe("DNEŠNÍ MISE");
    expect(view.completed).toBe(false);
  });

  it("never packs over budget", () => {
    const steps = packMissionIntoBudget(
      buildMissionCandidates(fullSignals(40)),
      10,
    );
    expect(totalPlanMinutes(steps)).toBeLessThanOrEqual(10);
    expect(steps.length).toBeGreaterThanOrEqual(1);
  });
});
