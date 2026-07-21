import { deterministicUuid } from "@/server/curriculum/ids";
import type { GeneratedQuestion } from "@/domain/learning/question-generation";
import {
  parseQuestionPack,
  type EngineQuestion,
  type QuestionPack,
} from "@/domain/learning/question-engine";
import type { FlashcardDeck, FlashcardItem } from "@/domain/learning/flashcards";
import { flashcardDeckSchema } from "@/domain/learning/flashcards";

const NS = "dammaturu.qg";

/**
 * Build a Question Engine pack from generated engine questions.
 * Requires ≥8 questions spanning ≥8 kinds (pack invariant).
 * Returns null if the set cannot satisfy pack rules.
 */
export function buildPackFromGeneratedQuestions(params: {
  questions: GeneratedQuestion[];
  slug: string;
  title: string;
  summary: string;
  now?: string;
}): QuestionPack | null {
  const engineQuestions = params.questions
    .map((q) => q.engineQuestion)
    .filter((q): q is EngineQuestion => Boolean(q));

  if (engineQuestions.length < 8) return null;

  const kinds = new Set(engineQuestions.map((q) => q.kind));
  if (kinds.size < 8) return null;

  const now = params.now ?? new Date().toISOString();
  const pack = {
    id: deterministicUuid(NS, `pack:${params.slug}`),
    slug: params.slug,
    title: params.title,
    summary: params.summary,
    questions: engineQuestions.slice(0, 80),
    createdAt: now,
    updatedAt: now,
  };

  try {
    return parseQuestionPack(pack);
  } catch {
    return null;
  }
}

export function buildFlashcardDeckFromGenerated(params: {
  questions: GeneratedQuestion[];
  slug: string;
  title: string;
  summary: string;
  now?: string;
}): FlashcardDeck | null {
  const cards = params.questions
    .map((q) => q.flashcard)
    .filter((c): c is FlashcardItem => Boolean(c));
  if (cards.length < 8) return null;

  const now = params.now ?? new Date().toISOString();
  const deck = {
    id: deterministicUuid(NS, `deck:${params.slug}`),
    slug: params.slug,
    title: params.title,
    summary: params.summary,
    cards: cards.slice(0, 200),
    createdAt: now,
    updatedAt: now,
  };

  const parsed = flashcardDeckSchema.safeParse(deck);
  return parsed.success ? parsed.data : null;
}
