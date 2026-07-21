"use server";

import {
  buildDynamicStudyPlan,
  type DynamicStudyPlan,
} from "@/domain/learning/dynamic-study-plan";
import { dateKeyFromDate } from "@/domain/learning/daily-dashboard";
import { computeMissedDays } from "@/domain/learning/deadline-planner";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";
import { getDueSummaryForLearner } from "@/server/spaced-repetition/store";
import { getReadinessSnapshotForLearner } from "@/server/readiness/store";
import { getDailyStreak } from "@/server/daily-dashboard/store";
import { getDefaultCurriculumPack } from "@/server/curriculum/store";
import { listLearnerMaterials } from "@/server/learner-materials/store";
import { track } from "@/lib/analytics";

export async function getDynamicStudyPlanAction(): Promise<{
  plan: DynamicStudyPlan | null;
  learnerId: string | null;
  displayName: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) {
    return { plan: null, learnerId: null, displayName: null };
  }
  const learner = await getLearner(learnerId);
  if (!learner?.profile.targetDate) {
    return { plan: null, learnerId, displayName: learner?.profile.displayName ?? null };
  }

  const now = new Date();
  const todayKey = dateKeyFromDate(now);
  const [due, readiness, streak, curriculum, materials] = await Promise.all([
    getDueSummaryForLearner({ learnerId }),
    getReadinessSnapshotForLearner({ learnerId }),
    getDailyStreak(learnerId),
    getDefaultCurriculumPack(),
    listLearnerMaterials(learnerId),
  ]);

  const contentUnits =
    curriculum?.modules.reduce((n, m) => n + m.topics.length, 0) ?? 1;
  const readinessPct =
    readiness?.snapshot.overall.scorePct ??
    readiness?.snapshot.overall.provisionalPct ??
    readiness?.snapshot.overallPct ??
    null;

  const materialsReady = materials.filter((m) => m.status === "ready");
  const materialsPending = materials.filter(
    (m) => m.status === "processing" || m.status === "uploading",
  );
  const materialsKnowledgePoints = materialsReady.reduce(
    (n, m) => n + (m.knowledgePointCount ?? 0),
    0,
  );
  const dayMs = 86_400_000;
  const materialsRecentlyReady = materialsReady.some((m) => {
    const updated = Date.parse(m.updatedAt);
    return Number.isFinite(updated) && now.getTime() - updated < dayMs;
  });

  const weakAreas = (readiness?.snapshot.weakAreas ?? []).slice(0, 3).map((w) => ({
    labelCs: w.labelCs,
    pct: w.pct,
    href: w.sessionHref,
  }));

  const missedDays = computeMissedDays({
    lastCompletedDateKey: streak?.lastCompletedDateKey ?? null,
    todayKey,
  });

  const previousTargetDate =
    learner.studyPlan?.targetDate &&
    learner.studyPlan.targetDate !== learner.profile.targetDate
      ? learner.studyPlan.targetDate
      : null;

  const plan = buildDynamicStudyPlan(
    {
      targetDate: learner.profile.targetDate,
      subjects: learner.profile.subjects,
      studyMode: learner.profile.studyMode,
      dailyMinutes: learner.profile.dailyMinutes,
      readinessPct,
      readinessFeeling: learner.profile.readinessFeeling,
      weekDeltaPct: readiness?.snapshot.weekDeltaPct ?? null,
      materialsReadyCount: materialsReady.length,
      materialsPendingCount: materialsPending.length,
      materialsKnowledgePoints,
      materialsRecentlyReady,
      weakAreas,
      dueReviews: due?.summary.dueCount ?? 0,
      contentUnits,
      missedDays,
      previousTargetDate,
    },
    now,
  );

  track("dynamic_study_plan_viewed", {
    daysRemaining: plan.daysRemaining,
    feasibility: plan.feasibility,
    missedDays,
    materialsReady: materialsReady.length,
    phase: plan.engine.currentPhase,
  });

  return {
    plan,
    learnerId,
    displayName: learner.profile.displayName,
  };
}

/** @deprecated use getDynamicStudyPlanAction — kept for callers expecting DeadlinePlan shape */
export async function getDeadlinePlanAction() {
  const { plan, learnerId, displayName } = await getDynamicStudyPlanAction();
  return {
    plan: plan?.engine ?? null,
    dynamic: plan,
    learnerId,
    displayName,
  };
}
