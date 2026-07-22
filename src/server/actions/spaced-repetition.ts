"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import type {
  DueSummary,
  LearnerScheduleBook,
  MixedReviewSession,
  PerformanceGrade,
  SpacedReviewPack,
} from "@/domain/learning/spaced-repetition";
import { spacedGradeToRating } from "@/domain/learning/learning-analytics";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { recordLearningEvent } from "@/server/learning-analytics/store";
import { recordReadinessPractice } from "@/server/readiness/record-practice";
import { markTodayMissionStepFromActivity } from "@/server/daily-dashboard/mission-progress";
import {
  createMixedReviewSession,
  getDueSummaryForLearner,
  getScheduleBook,
  getSpacedPackBySlug,
  gradeMixedReviewItem,
  listSpacedPacks,
} from "@/server/spaced-repetition/store";

export async function listSpacedPacksAction(): Promise<SpacedReviewPack[]> {
  return listSpacedPacks();
}

export async function getSpacedDueSummaryAction(): Promise<{
  pack: SpacedReviewPack | null;
  summary: DueSummary | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { pack: null, summary: null, learnerId: null };
  const result = await getDueSummaryForLearner({ learnerId });
  if (!result) return { pack: null, summary: null, learnerId };
  return { pack: result.pack, summary: result.summary, learnerId };
}

export async function getMixedReviewHubAction(): Promise<{
  pack: SpacedReviewPack | null;
  summary: DueSummary | null;
  book: LearnerScheduleBook | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const packs = await listSpacedPacks();
  const pack = packs[0] ?? null;
  if (!learnerId || !pack) {
    return { pack, summary: null, book: null, learnerId };
  }
  const result = await getDueSummaryForLearner({
    learnerId,
    packSlug: pack.slug,
  });
  const book = await getScheduleBook(learnerId, pack.id);
  return {
    pack,
    summary: result?.summary ?? null,
    book,
    learnerId,
  };
}

type Fail = { ok: false; error: string };

export async function startMixedReviewAction(input?: {
  packSlug?: string;
}): Promise<
  | {
      ok: true;
      session: MixedReviewSession;
      summary: DueSummary;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = input?.packSlug
      ? await getSpacedPackBySlug(input.packSlug)
      : (await listSpacedPacks())[0] ?? null;
    if (!pack)
      return {
        ok: false,
        error:
          "Balíček opakování zatím není nasazený. Zkus Testy nebo flashcards z učení.",
      };
    const { session, summary } = await createMixedReviewSession({
      learnerId,
      pack,
    });
    track("spaced_review_started", {
      packSlug: pack.slug,
      queue: session.queue.length,
    });
    revalidatePath("/app/dashboard");
    revalidatePath("/app/review");
    revalidatePath("/app/review/mixed");
    return { ok: true, session, summary };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function gradeMixedReviewAction(input: {
  packSlug: string;
  sessionId: string;
  grade: PerformanceGrade;
  studentAnswer?: string;
}): Promise<
  | {
      ok: true;
      session: MixedReviewSession;
      completed: boolean;
      summary: DueSummary;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getSpacedPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    const result = await gradeMixedReviewItem({
      learnerId,
      pack,
      sessionId: input.sessionId,
      grade: input.grade,
      studentAnswer: input.studentAnswer,
    });
    track("spaced_review_grade", {
      packSlug: input.packSlug,
      grade: input.grade,
      completed: result.completed,
    });
    await recordLearningEvent({
      learnerKey: learnerId,
      event: "flashcard_rating",
      method: "spaced_review",
      topicSlug: pack.slug,
      itemId:
        result.session.grades.at(-1)?.knowledgeId ??
        result.session.queue[Math.max(0, result.session.cursor - 1)]
          ?.knowledgeId ??
        pack.slug,
      rating: spacedGradeToRating(input.grade),
      correct: input.grade === "good" || input.grade === "easy",
    });
    const kuId =
      result.session.grades.at(-1)?.knowledgeId ??
      result.session.queue[Math.max(0, result.session.cursor - 1)]
        ?.knowledgeId;
    if (kuId) {
      await recordReadinessPractice({
        learnerId,
        units: [{ id: kuId, title: pack.slug }],
        correctness:
          input.grade === "again"
            ? "incorrect"
            : input.grade === "hard"
              ? "partial"
              : "correct",
        kind: "review",
      });
      const { mapToExperimentMethod } = await import(
        "@/server/beta-experiment/map-method"
      );
      const { recordExperimentActivity } = await import(
        "@/server/beta-experiment/record"
      );
      await recordExperimentActivity({
        learnerId,
        method: mapToExperimentMethod("spaced_review"),
        topicSlug: pack.slug,
        itemId: kuId,
        knowledgeUnits: [{ id: kuId, title: pack.slug }],
        correct: input.grade === "good" || input.grade === "easy",
        partial: input.grade === "hard",
        score01:
          input.grade === "easy"
            ? 1
            : input.grade === "good"
              ? 0.85
              : input.grade === "hard"
                ? 0.5
                : 0,
        minutes: 1,
        kind: "review",
      });
    }
    if (result.completed) {
      await recordLearningEvent({
        learnerKey: learnerId,
        event: "review_completed",
        method: "spaced_review",
        topicSlug: pack.slug,
        rating: spacedGradeToRating(input.grade),
        minutes: Math.max(1, Math.round(result.session.queue.length * 0.5)),
      });
      await markTodayMissionStepFromActivity({
        learnerId,
        stepKind: "review",
      });
    }
    revalidatePath("/app/dashboard");
    revalidatePath("/app/review");
    revalidatePath("/app/review/mixed");
    revalidatePath("/app/mistakes");
    return {
      ok: true,
      session: result.session,
      completed: result.completed,
      summary: result.summary,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
