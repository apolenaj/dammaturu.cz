"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import {
  buildDailyDashboardView,
  dateKeyFromDate,
  emptyStreak,
  totalPlanMinutes,
  type DailyDashboardView,
  type MissionSignals,
} from "@/domain/learning/daily-dashboard";
import { listActiveMemories } from "@/domain/learning/error-memory";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";
import { getDueSummaryForLearner } from "@/server/spaced-repetition/store";
import { getReadinessSnapshotForLearner } from "@/server/readiness/store";
import { getErrorBook } from "@/server/error-memory/store";
import {
  completeDailyMission,
  getDailyStreak,
  getOrCreateTodayMission,
  markDailyStepDone,
} from "@/server/daily-dashboard/store";
import { appendBetaTelemetryEvent } from "@/server/beta-telemetry/store";
import { resolveBetaEnrollment } from "@/server/beta-profile/helpers";
import { syncProgressMotivation } from "@/server/progress-gamification/sync";
import { recordLearningEvent } from "@/server/learning-analytics/store";
import type { LearningCelebration } from "@/domain/learning/progress-gamification";
import type { ProgressMotivationView } from "@/domain/learning/progress-gamification";

type Fail = { ok: false; error: string };

function daysRemainingToTarget(targetDate: string, now: Date): number {
  const target = new Date(`${targetDate}T12:00:00`);
  const todayNoon = new Date(now);
  todayNoon.setHours(12, 0, 0, 0);
  return Math.max(
    0,
    Math.ceil((target.getTime() - todayNoon.getTime()) / 86_400_000),
  );
}

async function gatherMissionSignals(input: {
  learnerId: string;
  targetDate: string;
  now: Date;
}): Promise<MissionSignals> {
  const [due, readiness, errorBook] = await Promise.all([
    getDueSummaryForLearner({ learnerId: input.learnerId }),
    getReadinessSnapshotForLearner({ learnerId: input.learnerId }),
    getErrorBook(input.learnerId),
  ]);

  const weak = readiness?.snapshot.weakAreas[0] ?? null;
  const openMistakes = errorBook
    ? listActiveMemories(errorBook).length
    : 0;

  return {
    overdueCount: due?.summary.dueCount ?? 0,
    openMistakesCount: openMistakes,
    weakAreaLabelCs: weak?.labelCs ?? null,
    weakAreaHref: weak?.sessionHref ?? null,
    weakAreaPct: weak?.pct ?? null,
    daysRemaining: daysRemainingToTarget(input.targetDate, input.now),
    newTopicLabelCs: "Nová látka",
    newTopicHref: "/app/learn",
    reviewHref: "/app/review/mixed",
    mistakesHref: "/app/mistakes",
    examHref: "/app/tests",
    testHref: "/app/tests/otazky/cjl-otazky",
  };
}

export async function getDailyDashboardAction(): Promise<{
  view: DailyDashboardView | null;
  learnerId: string | null;
  motivation: ProgressMotivationView | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { view: null, learnerId: null, motivation: null };
  const learner = await getLearner(learnerId);
  if (!learner) return { view: null, learnerId, motivation: null };

  const now = new Date();
  const daysRemaining = daysRemainingToTarget(
    learner.profile.targetDate,
    now,
  );
  const signals = await gatherMissionSignals({
    learnerId,
    targetDate: learner.profile.targetDate,
    now,
  });

  const day = await getOrCreateTodayMission({
    learnerId,
    signals,
    dailyMinutes: learner.profile.dailyMinutes ?? 30,
    now,
  });

  const streak =
    (await getDailyStreak(learnerId)) ??
    emptyStreak(learnerId, now.toISOString());

  const view = buildDailyDashboardView({
    displayName: learner.profile.displayName,
    daysRemaining,
    day,
    streak,
    now,
    secondary: {
      streakDays: streak.currentStreak,
    },
  });

  const { view: motivation } = await syncProgressMotivation({
    learnerId,
    daysRemaining,
  });

  return { view, learnerId, motivation };
}

export async function markDailyStepDoneAction(input: {
  stepId: string;
}): Promise<
  | {
      ok: true;
      view: DailyDashboardView;
      celebrations: LearningCelebration[];
      motivation: ProgressMotivationView | null;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const dateKey = dateKeyFromDate(new Date());
    await markDailyStepDone({
      learnerId,
      dateKey,
      stepId: input.stepId,
    });
    track("daily_mission_step_done", { stepId: input.stepId });

    let celebrations: LearningCelebration[] = [];
    let motivation: ProgressMotivationView | null = null;

    const { getDailyMissionDay } = await import(
      "@/server/daily-dashboard/store"
    );
    const day = await getDailyMissionDay(learnerId, dateKey);
    if (day?.completedAt) {
      const learner = await getLearner(learnerId);
      if (learner) {
        const synced = await syncProgressMotivation({
          learnerId,
          daysRemaining: daysRemainingToTarget(
            learner.profile.targetDate,
            new Date(),
          ),
          awardMissionDayXp: true,
        });
        celebrations = synced.celebrations;
        motivation = synced.view;
      }
      await recordLearningEvent({
        learnerKey: learnerId,
        event: "study_plan_completed",
        method: "daily_mission",
        minutes: day ? totalPlanMinutes(day.steps) : undefined,
      });
    }

    revalidatePath("/app/dashboard");
    revalidatePath("/app/progress");
    const { view } = await getDailyDashboardAction();
    if (!view) return { ok: false, error: "Dashboard se nepodařilo načíst." };
    return { ok: true, view, celebrations, motivation };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function completeDailyMissionAction(): Promise<
  | {
      ok: true;
      view: DailyDashboardView;
      celebrations: LearningCelebration[];
      motivation: ProgressMotivationView | null;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const dateKey = dateKeyFromDate(new Date());
    const day = await completeDailyMission({ learnerId, dateKey });
    track("daily_mission_completed", { dateKey });

    let celebrations: LearningCelebration[] = [];
    let motivation: ProgressMotivationView | null = null;
    const learner = await getLearner(learnerId);
    if (learner) {
      const synced = await syncProgressMotivation({
        learnerId,
        daysRemaining: daysRemainingToTarget(
          learner.profile.targetDate,
          new Date(),
        ),
        awardMissionDayXp: true,
      });
      celebrations = synced.celebrations;
      motivation = synced.view;
    }
    await recordLearningEvent({
      learnerKey: learnerId,
      event: "study_plan_completed",
      method: "daily_mission",
      minutes: totalPlanMinutes(day.steps),
    });
    const { recordProductEvent } = await import(
      "@/server/product-analytics/store"
    );
    const mins = totalPlanMinutes(day.steps);
    await recordProductEvent({
      learnerKey: learnerId,
      event: "study_session_started",
      featureId: "daily_mission",
    });
    if (mins > 0) {
      await recordProductEvent({
        learnerKey: learnerId,
        event: "study_minutes",
        minutes: mins,
        featureId: "daily_mission",
      });
    }
    const { recordExperimentActivity } = await import(
      "@/server/beta-experiment/record"
    );
    await recordExperimentActivity({
      learnerId,
      method: "mixed_test",
      minutes: totalPlanMinutes(day.steps),
      plannedMinutes:
        learner?.profile.dailyMinutes ?? totalPlanMinutes(day.steps),
      kind: "lesson",
      topicSlug: "daily_mission",
    });
    if (learner && resolveBetaEnrollment(learner)) {
      await appendBetaTelemetryEvent({
        learnerKey: learnerId,
        kind: "mission_day",
        feature: "daily_mission",
        minutes: totalPlanMinutes(day.steps),
        dateKey,
        at: new Date().toISOString(),
      });
    }

    revalidatePath("/app/dashboard");
    revalidatePath("/app/progress");
    const { view } = await getDailyDashboardAction();
    if (!view) return { ok: false, error: "Dashboard se nepodařilo načíst." };
    return { ok: true, view, celebrations, motivation };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
