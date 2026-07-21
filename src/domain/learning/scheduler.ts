/**
 * Review scheduler facade (D-006).
 * Internally FSRS-4.5 — keeps ScheduleEntry shape for flashcards / materials.
 * Do not surface algorithm names to students.
 */

import {
  createFsrsCard,
  reviewFsrs,
  reviewGradeToFsrsRatingWithConfidence,
  type FsrsCard,
} from "@/domain/learning/fsrs";

export const reviewGrades = ["dont_know", "almost", "know"] as const;
export type ReviewGrade = (typeof reviewGrades)[number];

/** Legacy quality map (analytics only). */
export const gradeToQuality: Record<ReviewGrade, number> = {
  dont_know: 1,
  almost: 3,
  know: 5,
};

export type ScheduleEntry = {
  cardId: string;
  /**
   * Mapped from FSRS difficulty (lower easiness ≈ harder).
   * Kept for schema compatibility with older books.
   */
  easiness: number;
  /** Last scheduled interval in whole days (≥ 0). */
  intervalDays: number;
  /** FSRS successful reps. */
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt: string | null;
  lastGrade: ReviewGrade | null;
  /** FSRS stability (days). Optional on legacy rows — inferred from interval. */
  stability?: number;
  /** FSRS difficulty 1–10. Optional on legacy rows. */
  difficulty?: number;
};

export type ScheduleUpdate = {
  entry: ScheduleEntry;
  quality: number;
  intervalDays: number;
  easiness: number;
};

function difficultyToEasiness(d: number): number {
  // D 1→5.0 easy, D 10→1.3 hard
  return Math.round(Math.max(1.3, Math.min(5, 5.4 - d * 0.4)) * 100) / 100;
}

function easinessToDifficulty(ef: number): number {
  return Math.max(1, Math.min(10, (5.4 - ef) / 0.4));
}

export function createScheduleEntry(
  cardId: string,
  nowIso: string,
): ScheduleEntry {
  const fsrs = createFsrsCard(nowIso);
  return {
    cardId,
    easiness: difficultyToEasiness(fsrs.difficulty),
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    dueAt: nowIso,
    lastReviewedAt: null,
    lastGrade: null,
    stability: fsrs.stability,
    difficulty: fsrs.difficulty,
  };
}

function toFsrsCard(entry: ScheduleEntry): FsrsCard {
  const difficulty =
    entry.difficulty ?? easinessToDifficulty(entry.easiness);
  const stability =
    entry.stability ??
    Math.max(0.4, entry.intervalDays || 0.4);
  return {
    stability,
    difficulty,
    reps: entry.repetitions,
    lapses: entry.lapses,
    state:
      entry.lastReviewedAt == null
        ? "new"
        : entry.repetitions === 0 && entry.lapses > 0
          ? "relearning"
          : entry.repetitions === 0
            ? "learning"
            : "review",
    lastReviewAt: entry.lastReviewedAt,
    dueAt: entry.dueAt,
  };
}

/**
 * Schedule update via FSRS (replaces classic SM-2 math).
 */
export function applySm2(
  prev: ScheduleEntry,
  grade: ReviewGrade,
  nowIso: string,
  opts?: {
    contentDifficulty?: number;
    confidence?: number;
    repeatedErrors?: number;
  },
): ScheduleUpdate {
  const rating = reviewGradeToFsrsRatingWithConfidence(
    grade,
    opts?.confidence,
  );
  const result = reviewFsrs({
    card: toFsrsCard(prev),
    rating,
    nowIso,
    contentDifficulty: opts?.contentDifficulty,
    confidence: opts?.confidence,
    repeatedErrors: opts?.repeatedErrors,
  });

  const roundedInterval = Math.max(
    0,
    Math.round(result.intervalDays),
  );
  const easiness = difficultyToEasiness(result.card.difficulty);
  const entry: ScheduleEntry = {
    cardId: prev.cardId,
    easiness,
    intervalDays: Math.max(roundedInterval, grade === "dont_know" ? 0 : 1),
    repetitions: result.card.reps,
    lapses: result.card.lapses,
    dueAt: result.card.dueAt,
    lastReviewedAt: nowIso,
    lastGrade: grade,
    stability: result.card.stability,
    difficulty: result.card.difficulty,
  };

  return {
    entry,
    quality: gradeToQuality[grade],
    intervalDays: entry.intervalDays,
    easiness,
  };
}

export function isDue(entry: ScheduleEntry, nowIso: string): boolean {
  return new Date(entry.dueAt).getTime() <= new Date(nowIso).getTime();
}

export function isNew(entry: ScheduleEntry | undefined): boolean {
  return !entry || entry.lastReviewedAt === null;
}

export type QueueLimits = {
  maxDue: number;
  maxNew: number;
};

export function buildReviewQueue(input: {
  cardIds: string[];
  scheduleByCardId: Record<string, ScheduleEntry>;
  nowIso: string;
  limits?: Partial<QueueLimits>;
}): string[] {
  const maxDue = input.limits?.maxDue ?? 20;
  const maxNew = input.limits?.maxNew ?? 8;

  const due: { id: string; dueAt: string; stability: number }[] = [];
  const fresh: string[] = [];

  for (const id of input.cardIds) {
    const entry = input.scheduleByCardId[id];
    if (isNew(entry)) {
      fresh.push(id);
    } else if (entry && isDue(entry, input.nowIso)) {
      due.push({
        id,
        dueAt: entry.dueAt,
        stability: entry.stability ?? (entry.intervalDays || 1),
      });
    }
  }

  // Most overdue / fragile first (low stability + early due)
  due.sort((a, b) => {
    const overdue =
      new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    if (Math.abs(overdue) > 60_000) return overdue;
    return a.stability - b.stability;
  });

  return [
    ...due.slice(0, maxDue).map((d) => d.id),
    ...fresh.slice(0, maxNew),
  ];
}
