import { z } from "zod";
import {
  applySm2,
  buildReviewQueue,
  createScheduleEntry,
  reviewGrades,
  type ReviewGrade,
  type ScheduleEntry,
} from "@/domain/learning/scheduler";

/**
 * Full flashcard engine — typed cards + FSRS schedule + session summary.
 * Not a static card list: queue is computed from due/new + grades update schedule.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const flashcardTypes = [
  "term_definition",
  "author_work",
  "work_author",
  "event_meaning",
  "character_work",
  "description_identify",
  "question_answer",
  "context_concept",
] as const;

export type FlashcardType = (typeof flashcardTypes)[number];

export const flashcardTypeSchema = z.enum(flashcardTypes);

export const flashcardItemSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  type: flashcardTypeSchema,
  /** Prompt shown first (student answers in head). */
  front: z.string().min(1).max(400),
  /** Reveal after flip. */
  back: z.string().min(1).max(800),
  /** Optional cue for context_concept / description cards. */
  context: z.string().max(500).optional(),
  hint: z.string().max(200).optional(),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
});

export type FlashcardItem = z.infer<typeof flashcardItemSchema>;

export const flashcardDeckSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  cards: z.array(flashcardItemSchema).min(8).max(200),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type FlashcardDeck = z.infer<typeof flashcardDeckSchema>;

export const scheduleEntrySchema = z.object({
  cardId: z.string().uuid(),
  easiness: z.number().min(1.3).max(5),
  intervalDays: z.number().int().min(0).max(3650),
  repetitions: z.number().int().min(0).max(500),
  lapses: z.number().int().min(0).max(500),
  dueAt: z.string().datetime(),
  lastReviewedAt: z.string().datetime().nullable(),
  lastGrade: z.enum(reviewGrades).nullable(),
  /** FSRS stability (optional — legacy books omit). */
  stability: z.number().min(0.05).max(365).optional(),
  /** FSRS difficulty 1–10 (optional). */
  difficulty: z.number().min(1).max(10).optional(),
});

export const flashcardScheduleSchema = z.object({
  learnerId: z.string().min(1).max(64),
  deckId: z.string().uuid(),
  deckSlug: z.string().min(1).max(120),
  byCardId: z.record(z.string(), scheduleEntrySchema),
  updatedAt: z.string().datetime(),
});

export type FlashcardSchedule = z.infer<typeof flashcardScheduleSchema>;

export const flashcardSessionSchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().min(1).max(64),
  deckId: z.string().uuid(),
  deckSlug: z.string().min(1).max(120),
  queue: z.array(z.string().uuid()),
  cursor: z.number().int().min(0),
  grades: z.array(
    z.object({
      cardId: z.string().uuid(),
      grade: z.enum(reviewGrades),
      at: z.string().datetime(),
    }),
  ),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  status: z.enum(["active", "completed", "abandoned"]),
});

export type FlashcardSession = z.infer<typeof flashcardSessionSchema>;

export type SessionSummary = {
  total: number;
  know: number;
  almost: number;
  dont_know: number;
  newIntroduced: number;
  reviewed: number;
  nextDueAt: string | null;
  accuracyPct: number | null;
};

export function parseFlashcardDeck(raw: unknown): FlashcardDeck {
  const deck = flashcardDeckSchema.parse(raw);
  const slugs = new Set<string>();
  for (const card of deck.cards) {
    if (slugs.has(card.slug)) {
      throw new Error(`Duplicitní card slug: ${card.slug}`);
    }
    slugs.add(card.slug);
  }
  return deck;
}

export const flashcardTypeLabelsCs: Record<FlashcardType, string> = {
  term_definition: "Termín → definice",
  author_work: "Autor → dílo",
  work_author: "Dílo → autor",
  event_meaning: "Událost → význam",
  character_work: "Postava → dílo",
  description_identify: "Popis → identifikace",
  question_answer: "Otázka → odpověď",
  context_concept: "Kontext → pojem",
};

export const gradeLabelsCs: Record<ReviewGrade, string> = {
  dont_know: "Nevěděl/a jsem",
  almost: "Téměř",
  know: "Věděl/a jsem",
};

export function emptySchedule(
  learnerId: string,
  deck: FlashcardDeck,
  nowIso: string,
): FlashcardSchedule {
  return {
    learnerId,
    deckId: deck.id,
    deckSlug: deck.slug,
    byCardId: {},
    updatedAt: nowIso,
  };
}

export function startSession(input: {
  sessionId: string;
  learnerId: string;
  deck: FlashcardDeck;
  schedule: FlashcardSchedule;
  nowIso: string;
  limits?: { maxDue?: number; maxNew?: number };
}): FlashcardSession {
  const queue = buildReviewQueue({
    cardIds: input.deck.cards.map((c) => c.id),
    scheduleByCardId: input.schedule.byCardId,
    nowIso: input.nowIso,
    limits: input.limits,
  });

  return {
    id: input.sessionId,
    learnerId: input.learnerId,
    deckId: input.deck.id,
    deckSlug: input.deck.slug,
    queue,
    cursor: 0,
    grades: [],
    startedAt: input.nowIso,
    finishedAt: null,
    status: queue.length === 0 ? "completed" : "active",
  };
}

export function applyGradeToSchedule(
  schedule: FlashcardSchedule,
  cardId: string,
  grade: ReviewGrade,
  nowIso: string,
): FlashcardSchedule {
  const prev =
    schedule.byCardId[cardId] ?? createScheduleEntry(cardId, nowIso);
  const { entry } = applySm2(prev, grade, nowIso);
  return {
    ...schedule,
    byCardId: { ...schedule.byCardId, [cardId]: entry },
    updatedAt: nowIso,
  };
}

export function advanceSession(
  session: FlashcardSession,
  cardId: string,
  grade: ReviewGrade,
  nowIso: string,
): FlashcardSession {
  const nextCursor = session.cursor + 1;
  const grades = [...session.grades, { cardId, grade, at: nowIso }];
  const done = nextCursor >= session.queue.length;
  return {
    ...session,
    cursor: nextCursor,
    grades,
    status: done ? "completed" : "active",
    finishedAt: done ? nowIso : null,
  };
}

export function summarizeSession(
  session: FlashcardSession,
  schedule: FlashcardSchedule,
): SessionSummary {
  let know = 0;
  let almost = 0;
  let dont_know = 0;
  for (const g of session.grades) {
    if (g.grade === "know") know += 1;
    else if (g.grade === "almost") almost += 1;
    else dont_know += 1;
  }
  const total = session.grades.length;
  const reviewed = session.grades.filter((g) => {
    const entry = schedule.byCardId[g.cardId];
    return entry && entry.repetitions + entry.lapses > 1;
  }).length;
  const newIntroduced = total - reviewed;

  let nextDueAt: string | null = null;
  for (const entry of Object.values(schedule.byCardId)) {
    if (!nextDueAt || entry.dueAt < nextDueAt) nextDueAt = entry.dueAt;
  }

  const weighted = know * 1 + almost * 0.5;
  const accuracyPct =
    total === 0 ? null : Math.round((weighted / total) * 100);

  return {
    total,
    know,
    almost,
    dont_know,
    newIntroduced: Math.max(0, newIntroduced),
    reviewed: Math.max(0, reviewed),
    nextDueAt,
    accuracyPct,
  };
}

export function countDue(
  deck: FlashcardDeck,
  schedule: FlashcardSchedule,
  nowIso: string,
): { due: number; newCount: number; learning: number } {
  const queue = buildReviewQueue({
    cardIds: deck.cards.map((c) => c.id),
    scheduleByCardId: schedule.byCardId,
    nowIso,
    limits: { maxDue: 999, maxNew: 999 },
  });
  let due = 0;
  let newCount = 0;
  for (const id of queue) {
    const e = schedule.byCardId[id];
    if (!e || e.lastReviewedAt === null) newCount += 1;
    else due += 1;
  }
  const learning = Object.values(schedule.byCardId).filter(
    (e) => e.lastReviewedAt !== null && e.repetitions > 0 && e.intervalDays < 21,
  ).length;
  return { due, newCount, learning };
}

export type { ReviewGrade, ScheduleEntry };
export { reviewGrades, buildReviewQueue, applySm2, createScheduleEntry };
