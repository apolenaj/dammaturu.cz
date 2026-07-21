import { describe, expect, it } from "vitest";
import {
  applyStreakOnComplete,
  buildDailyDashboardView,
  buildDailyPlanSteps,
  emptyStreak,
  formatCompletionCs,
  formatDaysRemainingCs,
  greetingCs,
  totalPlanMinutes,
} from "@/domain/learning/daily-dashboard";

describe("daily-dashboard (D-037)", () => {
  it("greets by part of day", () => {
    expect(greetingCs("Jana", new Date(2026, 6, 20, 14, 0, 0))).toBe(
      "Dobré odpoledne, Jana",
    );
    expect(greetingCs("Jana", new Date(2026, 6, 20, 8, 0, 0))).toBe(
      "Dobré ráno, Jana",
    );
  });

  it("builds 3-step plan totaling ~27 minutes", () => {
    const steps = buildDailyPlanSteps({ dueCardCount: 18 });
    expect(steps).toHaveLength(3);
    expect(steps[0]!.labelCs).toMatch(/Naučit: Realismus v Rusku/);
    expect(steps[1]!.labelCs).toMatch(/18 kartiček/);
    expect(steps[2]!.labelCs).toMatch(/Mini test/);
    expect(totalPlanMinutes(steps)).toBe(27);
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

  it("view exposes single CTA and plan — no choose-your-adventure", () => {
    const now = new Date(2026, 6, 20, 14, 0, 0);
    const steps = buildDailyPlanSteps({ dueCardCount: 18 }).map((s) => ({
      ...s,
      done: false,
    }));
    const view = buildDailyDashboardView({
      displayName: "Josef",
      daysRemaining: 37,
      now,
      day: {
        learnerId: "l1",
        dateKey: "2026-07-20",
        steps,
        completedAt: null,
        knowledgeStrengthened: 0,
        updatedAt: now.toISOString(),
      },
      streak: emptyStreak("l1", now.toISOString()),
      secondary: {
        readinessPct: 64,
        readinessHref: "/app/progress",
        weekDeltaPct: 5,
        weakLabelCs: "Rozbory",
        weakHref: "/app/learn/rekonstrukce-pribehu/literarni-dej",
        upcomingReviews: 18,
        weeklySpark: [55, 58, 59, 61, 62, 63, 64],
      },
    });
    expect(view.ctaLabelCs).toBe("ZAČÍT DNEŠNÍ MISI");
    expect(view.planTitleCs).toBe("DNEŠNÍ PLÁN");
    expect(view.daysRemainingCs).toContain("37");
    expect(view.completed).toBe(false);
  });
});
