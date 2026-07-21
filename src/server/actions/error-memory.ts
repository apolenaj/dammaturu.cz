"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import {
  buildMistakesHubSummary,
  type ErrorMemory,
  type ErrorMemoryBook,
  type ErrorType,
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
  errorType: ErrorType;
  source?: ErrorMemory["source"];
}): Promise<{ ok: true; created: boolean } | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
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
        error: "Žádné otevřené chyby k procvičení.",
      };
    }
    track("mistake_practice_started", {
      queue: result.session.queue.length,
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
    revalidatePath("/app/mistakes");
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

/** Load demo ErrorMemory — only with NEXT_PUBLIC_ENABLE_DEMO_DATA=1 (never for beta tester). */
export async function loadDemoMistakesAction(): Promise<
  | { ok: true; book: ErrorMemoryBook; summary: MistakesHubSummary; count: number }
  | Fail
> {
  try {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA !== "1"
    ) {
      return {
        ok: false,
        error: "Ukázkové chyby nejsou v beta režimu dostupné.",
      };
    }
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const { buildSeedErrorBook } = await import("@/server/error-memory/seed");
    const { saveErrorBook } = await import("@/server/error-memory/store");
    const existing = await getOrCreateErrorBook(learnerId);
    if (existing.memories.length >= 3) {
      return {
        ok: true,
        book: existing,
        summary: buildMistakesHubSummary(existing),
        count: 0,
      };
    }
    const seeded = buildSeedErrorBook(learnerId);
    // Keep any existing, prepend seed that aren't duplicate slugs
    const have = new Set(existing.memories.map((m) => m.knowledgeUnit.slug));
    const merged = {
      ...existing,
      memories: [
        ...seeded.memories.filter((m) => !have.has(m.knowledgeUnit.slug)),
        ...existing.memories,
      ],
      updatedAt: new Date().toISOString(),
    };
    await saveErrorBook(merged);
    track("error_memory_demo_loaded", { count: merged.memories.length });
    revalidatePath("/app/mistakes");
    return {
      ok: true,
      book: merged,
      summary: buildMistakesHubSummary(merged),
      count: merged.memories.length - existing.memories.length,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
