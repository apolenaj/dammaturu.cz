"use server";

import { track } from "@/lib/analytics";
import type {
  LearningCelebration,
  ProgressMotivationView,
} from "@/domain/learning/progress-gamification";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";
import { recordLearningEvent } from "@/server/learning-analytics/store";
import { recordProductEvent } from "@/server/product-analytics/store";
import {
  recordMockExamCompletion,
  syncProgressMotivation,
} from "@/server/progress-gamification/sync";

function daysRemainingForLearner(
  targetDate: string,
  now = new Date(),
): number {
  const target = new Date(`${targetDate}T12:00:00`);
  const todayNoon = new Date(now);
  todayNoon.setHours(12, 0, 0, 0);
  return Math.max(
    0,
    Math.ceil((target.getTime() - todayNoon.getTime()) / 86_400_000),
  );
}

export async function getProgressMotivationAction(): Promise<{
  view: ProgressMotivationView | null;
  celebrations: LearningCelebration[];
}> {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) return { view: null, celebrations: [] };
  const learner = await getLearner(learnerId);
  if (!learner) return { view: null, celebrations: [] };

  const { view, celebrations } = await syncProgressMotivation({
    learnerId,
    daysRemaining: daysRemainingForLearner(learner.profile.targetDate),
  });
  track("progress_motivation_viewed", {
    readiness: view.readinessPct,
    streak: view.streak.current,
    milestones: view.milestones.filter((m) => m.unlocked).length,
    celebrations: celebrations.length,
  });
  return { view, celebrations };
}

export async function recordMockExamProgressAction(input: {
  score: number;
  topicSlug: string;
}): Promise<
  | { ok: true; celebrations: LearningCelebration[] }
  | { ok: false; error: string }
> {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) return { ok: false, error: "Nejsi přihlášen/a (onboarding)." };
  if (
    !Number.isFinite(input.score) ||
    input.score < 0 ||
    input.score > 100 ||
    !input.topicSlug
  ) {
    return { ok: false, error: "Neplatný výsledek simulace." };
  }
  const { celebrations } = await recordMockExamCompletion({
    learnerId,
    score: Math.round(input.score),
    topicSlug: input.topicSlug.slice(0, 120),
  });
  track("mock_exam_recorded_for_progress", {
    score: Math.round(input.score),
    topic: input.topicSlug,
    celebrations: celebrations.length,
  });
  await recordLearningEvent({
    learnerKey: learnerId,
    event: "simulation_completed",
    method: "simulation",
    topicSlug: input.topicSlug.slice(0, 120),
    simulationScore: Math.round(input.score),
    minutes: 30,
  });
  await recordProductEvent({
    learnerKey: learnerId,
    event: "mock_exam_completed",
    topicSlug: input.topicSlug.slice(0, 120),
    minutes: 30,
  });
  await recordProductEvent({
    learnerKey: learnerId,
    event: "study_minutes",
    minutes: 30,
    featureId: "mock_exam",
  });
  const { mapToExperimentMethod } = await import(
    "@/server/beta-experiment/map-method"
  );
  const { recordExperimentActivity } = await import(
    "@/server/beta-experiment/record"
  );
  await recordExperimentActivity({
    learnerId,
    method: mapToExperimentMethod("mock_exam"),
    topicSlug: input.topicSlug.slice(0, 120),
    correct: input.score >= 60,
    score01: Math.min(1, Math.max(0, input.score / 100)),
    minutes: 30,
    kind: "practice",
    oralScore: input.score,
  });
  return { ok: true, celebrations };
}
