"use server";

import {
  buildDeadlinePlan,
  computeMissedDays,
  estimateDifficultyIndex,
  plannerConfig,
  type DeadlinePlan,
} from "@/domain/learning/deadline-planner";
import { dateKeyFromDate } from "@/domain/learning/daily-dashboard";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";
import { getDueSummaryForLearner } from "@/server/spaced-repetition/store";
import { getReadinessSnapshotForLearner } from "@/server/readiness/store";
import { getDailyStreak } from "@/server/daily-dashboard/store";
import { getDefaultCurriculumPack } from "@/server/curriculum/store";
import { track } from "@/lib/analytics";

export async function getDeadlinePlanAction(): Promise<{
  plan: DeadlinePlan | null;
  learnerId: string | null;
  displayName: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) {
    return { plan: null, learnerId: null, displayName: null };
  }
  const learner = await getLearner(learnerId);
  if (!learner) {
    return { plan: null, learnerId, displayName: null };
  }

  const now = new Date();
  const todayKey = dateKeyFromDate(now);
  const [due, readiness, streak, curriculum] = await Promise.all([
    getDueSummaryForLearner({ learnerId }),
    getReadinessSnapshotForLearner({ learnerId }),
    getDailyStreak(learnerId),
    getDefaultCurriculumPack(),
  ]);

  const contentUnits =
    curriculum?.modules.reduce((n, m) => n + m.topics.length, 0) ?? 31;
  // Unknown readiness = 0 coverage, not a fabricated mid score
  const masteryPct = readiness?.snapshot.overallPct ?? 0;
  const dueReviews = due?.summary.dueCount ?? 0;
  const missedDays = computeMissedDays({
    lastCompletedDateKey: streak?.lastCompletedDateKey ?? null,
    todayKey,
  });

  const difficultyIndex = estimateDifficultyIndex({
    readinessFeeling: learner.profile.readinessFeeling,
    masteryPct,
    contentUnits,
  });

  const plan = buildDeadlinePlan(
    {
      targetDate: learner.profile.targetDate || plannerConfig.betaTargetDate,
      dailyMinutes: learner.profile.dailyMinutes,
      contentUnits,
      difficultyIndex,
      masteryPct,
      dueReviews,
      missedDays,
      readinessFeeling: learner.profile.readinessFeeling,
    },
    now,
  );

  track("deadline_plan_viewed", {
    phase: plan.currentPhase,
    daysRemaining: plan.daysRemaining,
    missedDays,
    backlogCapped: plan.today.backlogCapped,
  });

  return {
    plan,
    learnerId,
    displayName: learner.profile.displayName,
  };
}
