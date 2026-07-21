"use server";

import { track } from "@/lib/analytics";
import {
  betaFeedbackPromptCs,
  buildBeforeAfterReport,
  type BeforeAfterReport,
  type DiagnosticBaseline,
} from "@/domain/learning/beta-feedback";
import { dateKeyFromDate } from "@/domain/learning/daily-dashboard";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";
import { appendBetaFeedback } from "@/server/beta-feedback/store";
import { getReadinessSnapshotForLearner } from "@/server/readiness/store";
import { listLearningEvents } from "@/server/learning-analytics/store";
import { sumMinutesForLearner } from "@/server/beta-telemetry/store";

export async function submitBetaFeedbackAction(input: {
  confusingCs: string;
  boringCs: string;
  helpedMostCs: string;
  brokenCs: string;
  changeWishCs: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const now = new Date();
    await appendBetaFeedback({
      learnerKey: learnerId,
      dateKey: dateKeyFromDate(now),
      at: now.toISOString(),
      confusingCs: input.confusingCs.trim().slice(0, 500),
      boringCs: input.boringCs.trim().slice(0, 500),
      helpedMostCs: input.helpedMostCs.trim().slice(0, 500),
      brokenCs: input.brokenCs.trim().slice(0, 500),
      changeWishCs: input.changeWishCs.trim().slice(0, 500),
    });
    track("beta_feedback_submitted", { hasText: true });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getBetaFeedbackPromptsAction() {
  return betaFeedbackPromptCs;
}

export async function getBeforeAfterReportAction(): Promise<{
  report: BeforeAfterReport | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { report: null, learnerId: null };
  const learner = await getLearner(learnerId);
  if (!learner) return { report: null, learnerId };

  const [readiness, events, minutesRaw] = await Promise.all([
    getReadinessSnapshotForLearner({ learnerId }),
    listLearningEvents(),
    sumMinutesForLearner(learnerId),
  ]);

  const mine = events.filter((e) => e.learnerKey === learnerId);
  const graded = mine.filter(
    (e) =>
      e.event === "answer_correct" ||
      e.event === "answer_incorrect" ||
      (e.event === "question_answered" && e.correct != null),
  );
  const correctN = graded.filter(
    (e) => e.event === "answer_correct" || e.correct === true,
  ).length;
  const recentAccuracyPct =
    graded.length === 0
      ? null
      : Math.round((100 * correctN) / graded.length);

  const ratings = mine.filter(
    (e) =>
      (e.event === "flashcard_rating" || e.event === "review_completed") &&
      e.rating != null,
  );
  const held = ratings.filter((e) => (e.rating ?? 0) >= 3);
  const retentionProxyPct =
    ratings.length === 0
      ? null
      : Math.round((100 * held.length) / ratings.length);

  const studyTimeMinutes =
    minutesRaw +
    mine.reduce(
      (s, e) => s + (e.minutes ?? 0) + Math.round((e.durationMs ?? 0) / 60_000),
      0,
    );

  const units = readiness?.book.units ?? [];
  const topicsMastered = units
    .filter((u) => u.state.score >= 80)
    .map((u) => ({
      id: u.id,
      title: u.title,
      score: Math.round(u.state.score),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const weaknessesRemaining =
    readiness?.snapshot.weakAreas.map((w) => ({
      labelCs: w.labelCs,
      pct: w.pct,
    })) ?? [];

  const baseline: DiagnosticBaseline | null =
    learner.diagnosticBaseline ?? null;

  const report = buildBeforeAfterReport({
    displayName: learner.profile.displayName,
    targetDate: learner.profile.targetDate,
    baseline,
    finalMasteryPct: readiness?.snapshot.overallPct ?? null,
    recentAccuracyPct,
    retentionProxyPct,
    topicsMastered,
    studyTimeMinutes,
    weaknessesRemaining,
  });

  return { report, learnerId };
}
