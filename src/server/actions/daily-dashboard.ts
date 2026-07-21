"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import {
  buildDailyDashboardView,
  dateKeyFromDate,
  emptyStreak,
  totalPlanMinutes,
  type DailyDashboardView,
} from "@/domain/learning/daily-dashboard";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";
import { getDueSummaryForLearner } from "@/server/spaced-repetition/store";
import { getReadinessSnapshotForLearner } from "@/server/readiness/store";
import {
  completeDailyMission,
  getDailyStreak,
  getOrCreateTodayMission,
  markDailyStepDone,
} from "@/server/daily-dashboard/store";
import { computeMissedDays } from "@/domain/learning/deadline-planner";
import { appendBetaTelemetryEvent } from "@/server/beta-telemetry/store";
import { resolveBetaEnrollment } from "@/server/beta-profile/helpers";
import { syncProgressMotivation } from "@/server/progress-gamification/sync";
import { recordLearningEvent } from "@/server/learning-analytics/store";

type Fail = { ok: false; error: string };

export async function getDailyDashboardAction(): Promise<{
  view: DailyDashboardView | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { view: null, learnerId: null };
  const learner = await getLearner(learnerId);
  if (!learner) return { view: null, learnerId };

  const now = new Date();
  const due = await getDueSummaryForLearner({ learnerId });
  const readiness = await getReadinessSnapshotForLearner({ learnerId });

  const weak = readiness?.snapshot.weakAreas[0] ?? null;
  const day = await getOrCreateTodayMission({
    learnerId,
    dueCardCount: due?.summary.dueCount ?? 0,
    learnTopicTitle: weak?.labelCs ?? "Realismus v Rusku",
    learnHref: weak?.sessionHref ?? "/app/learn/rychle/realismus",
    now,
  });

  const streak =
    (await getDailyStreak(learnerId)) ?? emptyStreak(learnerId, now.toISOString());

  const todayKey = dateKeyFromDate(now);
  const missedDays = computeMissedDays({
    lastCompletedDateKey: streak.lastCompletedDateKey,
    todayKey,
  });

  // Live days to deadline (not frozen onboarding snapshot)
  const target = new Date(`${learner.profile.targetDate}T12:00:00`);
  const todayNoon = new Date(now);
  todayNoon.setHours(12, 0, 0, 0);
  const daysRemaining = Math.max(
    0,
    Math.ceil((target.getTime() - todayNoon.getTime()) / 86_400_000),
  );

  // Real history only — never invent spark values
  const weeklySpark = [
    ...(readiness?.book.weeklyHistory.map((w) => w.overallPct) ?? []),
  ];
  if (readiness?.snapshot.overallPct != null) {
    weeklySpark.push(readiness.snapshot.overallPct);
  }

  const upcomingReviews = Math.min(
    24,
    missedDays > 0
      ? Math.min(due?.summary.dueCount ?? 0, 18)
      : due?.summary.dueCount ?? 0,
  );

  const view = buildDailyDashboardView({
    displayName: learner.profile.displayName,
    daysRemaining,
    day,
    streak,
    now,
    secondary: {
      readinessPct: readiness?.snapshot.overallPct ?? null,
      readinessHref: "/app/progress",
      weekDeltaPct: readiness?.snapshot.weekDeltaPct ?? null,
      weakLabelCs: weak?.labelCs ?? "Rozbory",
      weakHref: weak?.sessionHref ?? "/app/mistakes",
      upcomingReviews,
      weeklySpark: weeklySpark.slice(-7),
    },
  });

  return { view, learnerId };
}

export async function markDailyStepDoneAction(input: {
  stepId: string;
}): Promise<{ ok: true; view: DailyDashboardView } | Fail> {
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

    const { getDailyMissionDay } = await import(
      "@/server/daily-dashboard/store"
    );
    const day = await getDailyMissionDay(learnerId, dateKey);
    if (day?.completedAt) {
      const learner = await getLearner(learnerId);
      if (learner) {
        const target = new Date(`${learner.profile.targetDate}T12:00:00`);
        const todayNoon = new Date();
        todayNoon.setHours(12, 0, 0, 0);
        const daysRemaining = Math.max(
          0,
          Math.ceil((target.getTime() - todayNoon.getTime()) / 86_400_000),
        );
        await syncProgressMotivation({
          learnerId,
          daysRemaining,
          awardMissionDayXp: true,
        });
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
    return { ok: true, view };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function completeDailyMissionAction(): Promise<
  { ok: true; view: DailyDashboardView } | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const dateKey = dateKeyFromDate(new Date());
    const day = await completeDailyMission({ learnerId, dateKey });
    track("daily_mission_completed", { dateKey });

    const learner = await getLearner(learnerId);
    if (learner) {
      const target = new Date(`${learner.profile.targetDate}T12:00:00`);
      const todayNoon = new Date();
      todayNoon.setHours(12, 0, 0, 0);
      const daysRemaining = Math.max(
        0,
        Math.ceil((target.getTime() - todayNoon.getTime()) / 86_400_000),
      );
      await syncProgressMotivation({
        learnerId,
        daysRemaining,
        awardMissionDayXp: true,
      });
    }
    await recordLearningEvent({
      learnerKey: learnerId,
      event: "study_plan_completed",
      method: "daily_mission",
      minutes: totalPlanMinutes(day.steps),
    });
    const { recordExperimentActivity } = await import(
      "@/server/beta-experiment/record"
    );
    await recordExperimentActivity({
      learnerId,
      method: "mixed_test",
      minutes: totalPlanMinutes(day.steps),
      plannedMinutes: learner?.profile.dailyMinutes ?? totalPlanMinutes(day.steps),
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
    return { ok: true, view };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
