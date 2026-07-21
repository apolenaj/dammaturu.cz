"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import type {
  GradeFeedback,
  QuestionPack,
  QuestionProgress,
  StudentAnswer,
} from "@/domain/learning/question-engine";
import {
  defaultWhyWrong,
  inferErrorType,
} from "@/domain/learning/error-memory";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { recordLearningEvent } from "@/server/learning-analytics/store";
import { recordReadinessPractice } from "@/server/readiness/record-practice";
import { recordLearnerError } from "@/server/error-memory/store";
import { markTodayMissionStepFromActivity } from "@/server/daily-dashboard/mission-progress";
import {
  getLearner,
  patchLearnerDiagnosticBaseline,
} from "@/server/learner-store";
import { getReadinessSnapshotForLearner } from "@/server/readiness/store";
import {
  getQuestionPackBySlug,
  getQuestionProgress,
  listQuestionPacks,
  resetQuestionProgress,
  submitQuestionAttempt,
} from "@/server/question-engine/store";

/** Min graded attempts before diagnostic baseline is locked. */
const DIAGNOSTIC_MIN_ATTEMPTS = 8;

export async function listQuestionPacksAction(): Promise<QuestionPack[]> {
  return listQuestionPacks();
}

export async function getQuestionSessionAction(slug: string): Promise<{
  pack: QuestionPack | null;
  progress: QuestionProgress | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const pack = await getQuestionPackBySlug(slug);
  const progress =
    learnerId && pack ? await getQuestionProgress(learnerId, pack.id) : null;
  return { pack, progress, learnerId };
}

type Fail = { ok: false; error: string };

export async function submitQuestionAttemptAction(input: {
  packSlug: string;
  questionId: string;
  answer: StudentAnswer;
  /** Vstupní diagnostika — evidence kind + baseline after N attempts. */
  asDiagnostic?: boolean;
  /** N=1 experiment weekly/final assessment id. */
  experimentAssessmentId?: string;
}): Promise<
  | {
      ok: true;
      progress: QuestionProgress;
      grade: GradeFeedback;
      diagnosticCompleted?: boolean;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getQuestionPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    const { progress, grade, question } = await submitQuestionAttempt({
      learnerId,
      pack,
      questionId: input.questionId,
      answer: input.answer,
    });
    track("question_attempt", {
      packSlug: input.packSlug,
      kind: question.kind,
      result: grade.result,
      score: grade.score,
      diagnostic: Boolean(input.asDiagnostic),
    });
    const correct = grade.result === "correct";
    const correctness =
      grade.result === "correct"
        ? ("correct" as const)
        : grade.result === "partial"
          ? ("partial" as const)
          : ("incorrect" as const);
    const isDiagnostic = Boolean(input.asDiagnostic);

    await recordLearningEvent({
      learnerKey: learnerId,
      event: "question_answered",
      method: "question_engine",
      topicSlug: pack.slug,
      itemId: input.questionId,
      correct,
    });
    await recordLearningEvent({
      learnerKey: learnerId,
      event: correct ? "answer_correct" : "answer_incorrect",
      method: "question_engine",
      topicSlug: pack.slug,
      itemId: input.questionId,
      correct,
    });
    await recordReadinessPractice({
      learnerId,
      units: grade.knowledgeUnits.map((ku) => ({
        id: ku.id,
        title: ku.title,
      })),
      correctness,
      kind: isDiagnostic ? "diagnostic" : "practice",
    });

    if (grade.result === "incorrect" || grade.result === "partial") {
      const ku = grade.knowledgeUnits[0];
      const errorType = inferErrorType({
        question: question.stem,
        correctConcept: grade.expectedSummary.slice(0, 200),
        knowledgeSlug: ku?.title ?? pack.slug,
      });
      await recordLearnerError({
        learnerId,
        question: question.stem.slice(0, 400),
        studentAnswer: summarizeStudentAnswer(input.answer),
        correctConcept: grade.expectedSummary.slice(0, 400),
        whyWrong: defaultWhyWrong({
          errorType,
          studentAnswer: summarizeStudentAnswer(input.answer),
          correctConcept: grade.expectedSummary.slice(0, 200),
        }),
        knowledgeUnit: {
          id: ku?.id,
          slug: slugifyKu(ku?.id ?? ku?.title ?? pack.slug),
          title: (ku?.title ?? pack.title).slice(0, 160),
        },
        errorType,
        source: "question_engine",
      });
    }

    await markTodayMissionStepFromActivity({
      learnerId,
      stepKind: "test",
    });

    const learner = await getLearner(learnerId);
    const { mapToExperimentMethod } = await import(
      "@/server/beta-experiment/map-method"
    );
    const { recordExperimentActivity } = await import(
      "@/server/beta-experiment/record"
    );
    const readinessAfter = await getReadinessSnapshotForLearner({
      learnerId,
    });
    const isExperiment = Boolean(input.experimentAssessmentId);
    await recordExperimentActivity({
      learnerId,
      method: mapToExperimentMethod("question_engine"),
      topicSlug: pack.slug,
      topicTitle: pack.title,
      itemId: input.questionId,
      knowledgeUnits: grade.knowledgeUnits.map((ku) => ({
        id: ku.id,
        title: ku.title,
      })),
      correct,
      partial: grade.result === "partial",
      score01: grade.score,
      minutes: 2,
      kind: isDiagnostic
        ? "diagnostic"
        : isExperiment
          ? "assessment"
          : "practice",
      plannedMinutes: learner?.profile.dailyMinutes,
      masteryEndPct: readinessAfter?.snapshot.overallPct ?? null,
      markQuestionSeen: !isExperiment,
      assessmentId: input.experimentAssessmentId,
      targetDate: learner?.profile.targetDate,
    });

    let diagnosticCompleted = false;
    if (isDiagnostic) {
      diagnosticCompleted = await maybeCompleteDiagnosticBaseline({
        learnerId,
        packSlug: pack.slug,
        progress,
        pack,
      });
    }

    revalidatePath(`/app/tests/otazky/${input.packSlug}`);
    revalidatePath("/app/tests");
    revalidatePath("/app/progress");
    revalidatePath("/app/progress/experiment");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/mistakes");
    revalidatePath("/app/plan");
    return { ok: true, progress, grade, diagnosticCompleted };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function maybeCompleteDiagnosticBaseline(input: {
  learnerId: string;
  packSlug: string;
  progress: QuestionProgress;
  pack: QuestionPack;
}): Promise<boolean> {
  const learner = await getLearner(input.learnerId);
  if (!learner || learner.diagnosticBaseline) return false;
  const attemptCount =
    input.progress.correctCount +
    input.progress.incorrectCount +
    input.progress.partialCount;
  if (attemptCount < DIAGNOSTIC_MIN_ATTEMPTS) return false;

  const correct = input.progress.correctCount;
  const accuracyPct = Math.round((100 * correct) / Math.max(1, attemptCount));
  const readiness = await getReadinessSnapshotForLearner({
    learnerId: input.learnerId,
  });
  const completedAt = new Date().toISOString();
  await patchLearnerDiagnosticBaseline(input.learnerId, {
    completedAt,
    attempts: attemptCount,
    correct,
    accuracyPct,
    readinessPct: readiness?.snapshot.overallPct ?? null,
    packSlug: input.packSlug,
  });
  track("diagnostic_baseline_completed", {
    attempts: attemptCount,
    accuracy: accuracyPct,
  });

  const { getExperimentBook } = await import(
    "@/server/beta-experiment/store"
  );
  const { writeExperimentBaseline, topicMasteryFromReadinessAreas } =
    await import("@/server/beta-experiment/record");
  const expBook = await getExperimentBook(input.learnerId);
  const startedAt =
    expBook?.diagnosticStartedAt ??
    learner.onboardingCompletedAt ??
    completedAt;
  const durationMinutes = Math.max(
    1,
    Math.round(
      (new Date(completedAt).getTime() - new Date(startedAt).getTime()) /
        60_000,
    ),
  );
  const objectiveKuIds = [
    ...new Set(
      input.pack.questions.flatMap((q) => q.knowledgeUnits.map((ku) => ku.id)),
    ),
  ].slice(0, 80);
  await writeExperimentBaseline({
    learnerId: input.learnerId,
    targetDate: learner.profile.targetDate,
    baseline: {
      startedAt,
      completedAt,
      durationMinutes: Math.min(480, durationMinutes),
      diagnosticAccuracyPct: accuracyPct,
      diagnosticAttempts: attemptCount,
      diagnosticCorrect: correct,
      overallMasteryPct: readiness?.snapshot.overallPct ?? null,
      topicMastery: topicMasteryFromReadinessAreas(
        readiness?.snapshot.areas.map((a) => ({
          id: a.id,
          labelCs: a.labelCs,
          pct: a.pct,
        })) ?? [],
      ),
      confidence: learner.profile.readinessFeeling,
      packSlug: input.packSlug,
      objectiveKuIds,
    },
  });
  return true;
}

function summarizeStudentAnswer(answer: StudentAnswer): string {
  try {
    const s = JSON.stringify(answer);
    return s.slice(0, 280);
  } catch {
    return "(odpoved)";
  }
}

function slugifyKu(raw: string): string {
  const s = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return s.length > 0 ? s : "unknown-ku";
}

export async function resetQuestionProgressAction(input: {
  packSlug: string;
}): Promise<{ ok: true; progress: QuestionProgress } | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getQuestionPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    const progress = await resetQuestionProgress({ learnerId, pack });
    revalidatePath(`/app/tests/otazky/${input.packSlug}`);
    revalidatePath("/app/tests");
    return { ok: true, progress };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
