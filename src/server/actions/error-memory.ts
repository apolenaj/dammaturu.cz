"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import {
  buildMistakesHubSummary,
  type ErrorMemory,
  type ErrorMemoryBook,
  type MistakeClass,
  type MistakePracticeSession,
  type MistakesHubSummary,
  type PracticeGrade,
} from "@/domain/learning/error-memory";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  createMistakePracticeSession,
  getErrorBook,
  getOrCreateErrorBook,
  gradeMistakePracticeItem,
  recordLearnerError,
} from "@/server/error-memory/store";

type Fail = { ok: false; error: string };

export async function getMistakesHubAction(): Promise<{
  book: ErrorMemoryBook | null;
  summary: MistakesHubSummary | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { book: null, summary: null, learnerId: null };
  const book = await getErrorBook(learnerId);
  if (!book) {
    const empty = await getOrCreateErrorBook(learnerId);
    return {
      book: empty,
      summary: buildMistakesHubSummary(empty),
      learnerId,
    };
  }
  return {
    book,
    summary: buildMistakesHubSummary(book),
    learnerId,
  };
}

export async function recordErrorMemoryAction(input: {
  question: string;
  studentAnswer: string;
  correctConcept: string;
  whyWrong: string;
  knowledgeUnit: { id?: string; slug: string; title: string };
  errorType: MistakeClass;
  source?: ErrorMemory["source"];
}): Promise<{ ok: true; created: boolean } | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    if (input.source === undefined && !input.studentAnswer.trim()) {
      return { ok: false, error: "Bez skutečné odpovědi chybu neukládám." };
    }
    const { created } = await recordLearnerError({
      learnerId,
      ...input,
      source: input.source ?? "manual",
    });
    track("error_memory_recorded", {
      errorType: input.errorType,
      slug: input.knowledgeUnit.slug,
      created,
    });
    revalidatePath("/app/mistakes");
    return { ok: true, created };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function startMistakePracticeAction(): Promise<
  | {
      ok: true;
      session: MistakePracticeSession;
      book: ErrorMemoryBook;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const result = await createMistakePracticeSession({ learnerId });
    if (!result) {
      return {
        ok: false,
        error: "Žádné aktivní chyby k procvičení.",
      };
    }
    track("mistake_practice_started", {
      queue: result.session.queue.length,
    });
    const { recordProductEvent } = await import(
      "@/server/product-analytics/store"
    );
    await recordProductEvent({
      learnerKey: learnerId,
      event: "review_start",
      featureId: "mistakes",
    });
    revalidatePath("/app/mistakes");
    return { ok: true, session: result.session, book: result.book };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function gradeMistakePracticeAction(input: {
  sessionId: string;
  grade: PracticeGrade;
}): Promise<
  | {
      ok: true;
      session: MistakePracticeSession;
      book: ErrorMemoryBook;
      completed: boolean;
      summary: MistakesHubSummary;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const result = await gradeMistakePracticeItem({
      learnerId,
      sessionId: input.sessionId,
      grade: input.grade,
    });
    track("mistake_practice_grade", {
      grade: input.grade,
      completed: result.completed,
    });
    if (input.grade === "good") {
      const { recordProductEvent } = await import(
        "@/server/product-analytics/store"
      );
      await recordProductEvent({
        learnerKey: learnerId,
        event: "mistake_relearned",
        featureId: "mistakes",
      });
    }
    if (result.completed) {
      const { markTodayMissionStepFromActivity } = await import(
        "@/server/daily-dashboard/mission-progress"
      );
      await markTodayMissionStepFromActivity({
        learnerId,
        stepKind: "mistakes",
      });
      const { recordProductEvent } = await import(
        "@/server/product-analytics/store"
      );
      await recordProductEvent({
        learnerKey: learnerId,
        event: "review_complete",
        featureId: "mistakes",
      });
    }
    revalidatePath("/app/mistakes");
    revalidatePath("/app/dashboard");
    return {
      ok: true,
      session: result.session,
      book: result.book,
      completed: result.completed,
      summary: buildMistakesHubSummary(result.book),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
