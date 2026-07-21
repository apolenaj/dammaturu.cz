"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import {
  countDue,
  summarizeSession,
  type FlashcardDeck,
  type FlashcardSchedule,
  type FlashcardSession,
  type ReviewGrade,
  type SessionSummary,
} from "@/domain/learning/flashcards";
import { flashcardGradeToRating } from "@/domain/learning/learning-analytics";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { recordLearningEvent } from "@/server/learning-analytics/store";
import { recordProductEvent } from "@/server/product-analytics/store";
import { recordReadinessPractice } from "@/server/readiness/record-practice";
import { markTodayMissionStepFromActivity } from "@/server/daily-dashboard/mission-progress";
import {
  createFlashcardSession,
  getFlashcardDeckBySlug,
  getFlashcardSession,
  getOrCreateSchedule,
  gradeFlashcard,
  listFlashcardDecks,
} from "@/server/flashcards/store";

export async function listFlashcardDecksAction(): Promise<FlashcardDeck[]> {
  return listFlashcardDecks();
}

export async function getReviewHubAction(): Promise<{
  decks: FlashcardDeck[];
  learnerId: string | null;
  stats: Array<{
    slug: string;
    due: number;
    newCount: number;
    learning: number;
  }>;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const decks = await listFlashcardDecks();
  const now = new Date().toISOString();
  const stats = [];
  for (const deck of decks) {
    if (!learnerId) {
      stats.push({
        slug: deck.slug,
        due: 0,
        newCount: deck.cards.length,
        learning: 0,
      });
      continue;
    }
    const schedule = await getOrCreateSchedule(learnerId, deck);
    const c = countDue(deck, schedule, now);
    stats.push({ slug: deck.slug, ...c });
  }
  return { decks, learnerId, stats };
}

export async function startFlashcardSessionAction(input: {
  deckSlug: string;
}): Promise<
  | {
      ok: true;
      session: FlashcardSession;
      schedule: FlashcardSchedule;
      deck: FlashcardDeck;
    }
  | { ok: false; error: string }
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const deck = await getFlashcardDeckBySlug(input.deckSlug);
    if (!deck) return { ok: false, error: "Balíček nenalezen." };
    const { session, schedule } = await createFlashcardSession({
      learnerId,
      deck,
    });
    track("flashcard_session_started", {
      deckSlug: deck.slug,
      queue: session.queue.length,
    });
    await recordProductEvent({
      learnerKey: learnerId,
      event: "study_session_started",
      featureId: "flashcards",
    });
    revalidatePath("/app/review");
    return { ok: true, session, schedule, deck };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function gradeFlashcardAction(input: {
  sessionId: string;
  cardId: string;
  grade: ReviewGrade;
}): Promise<
  | {
      ok: true;
      session: FlashcardSession;
      schedule: FlashcardSchedule;
      summary: SessionSummary | null;
    }
  | { ok: false; error: string }
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const { session, schedule } = await gradeFlashcard({
      learnerId,
      sessionId: input.sessionId,
      cardId: input.cardId,
      grade: input.grade,
    });
    track("flashcard_graded", {
      grade: input.grade,
      done: session.status === "completed",
    });
    await recordLearningEvent({
      learnerKey: learnerId,
      event: "flashcard_rating",
      method: "flashcards",
      topicSlug: session.deckSlug,
      itemId: input.cardId,
      rating: flashcardGradeToRating(input.grade),
      correct: input.grade === "know",
    });
    await recordReadinessPractice({
      learnerId,
      units: [{ id: input.cardId, title: session.deckSlug }],
      correctness:
        input.grade === "know"
          ? "correct"
          : input.grade === "almost"
            ? "partial"
            : "incorrect",
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
      method: mapToExperimentMethod("flashcards"),
      topicSlug: session.deckSlug,
      itemId: input.cardId,
      knowledgeUnits: [{ id: input.cardId, title: session.deckSlug }],
      correct: input.grade === "know",
      partial: input.grade === "almost",
      score01:
        input.grade === "know" ? 1 : input.grade === "almost" ? 0.5 : 0,
      minutes: 1,
      kind: "review",
    });
    const summary =
      session.status === "completed"
        ? summarizeSession(session, schedule)
        : null;
    if (summary) {
      track("flashcard_session_completed", {
        total: summary.total,
        know: summary.know,
        almost: summary.almost,
        dont_know: summary.dont_know,
      });
      await recordLearningEvent({
        learnerKey: learnerId,
        event: "review_completed",
        method: "flashcards",
        topicSlug: session.deckSlug,
        rating: Math.round(
          (5 * summary.know + 3 * summary.almost + 1 * summary.dont_know) /
            Math.max(1, summary.total),
        ),
        minutes: Math.max(1, Math.round(summary.total * 0.4)),
      });
      await markTodayMissionStepFromActivity({
        learnerId,
        stepKind: "review",
      });
    }
    revalidatePath("/app/review");
    return { ok: true, session, schedule, summary };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getFlashcardSessionAction(sessionId: string): Promise<{
  session: FlashcardSession | null;
  deck: FlashcardDeck | null;
  schedule: FlashcardSchedule | null;
  summary: SessionSummary | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const session = await getFlashcardSession(sessionId);
  if (!session) {
    return {
      session: null,
      deck: null,
      schedule: null,
      summary: null,
      learnerId,
    };
  }
  const deck = await getFlashcardDeckBySlug(session.deckSlug);
  const schedule =
    learnerId && deck
      ? await getOrCreateSchedule(learnerId, deck)
      : null;
  const summary =
    session.status === "completed" && schedule
      ? summarizeSession(session, schedule)
      : null;
  return { session, deck, schedule, summary, learnerId };
}
