/**
 * SM-2-inspired spaced repetition scheduler (D-006).
 * Isolated module — Attempt/grade in, dueAt + params out. Swap-ready for FSRS later.
 */

export const reviewGrades = ["dont_know", "almost", "know"] as const;
export type ReviewGrade = (typeof reviewGrades)[number];

/** Maps self-grade → SM-2 quality 0–5. */
export const gradeToQuality: Record<ReviewGrade, number> = {
  dont_know: 1,
  almost: 3,
  know: 5,
};

export type ScheduleEntry = {
  cardId: string;
  /** SM-2 easiness factor; default 2.5, floor 1.3 */
  easiness: number;
  /** Current interval in whole days (≥ 0). */
  intervalDays: number;
  /** Successful repetitions in a row (resets on fail). */
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt: string | null;
  lastGrade: ReviewGrade | null;
};

export type ScheduleUpdate = {
  entry: ScheduleEntry;
  quality: number;
  intervalDays: number;
  easiness: number;
};

const MIN_EF = 1.3;
const DEFAULT_EF = 2.5;

export function createScheduleEntry(
  cardId: string,
  nowIso: string,
): ScheduleEntry {
  return {
    cardId,
    easiness: DEFAULT_EF,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    dueAt: nowIso,
    lastReviewedAt: null,
    lastGrade: null,
  };
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + Math.max(0, Math.round(days)));
  return d.toISOString();
}

function clampEf(ef: number): number {
  return Math.max(MIN_EF, Math.round(ef * 100) / 100);
}

/**
 * Classic SM-2 update.
 * quality < 3 → reset repetitions, interval = 1 day (error loop).
 * quality ≥ 3 → grow interval by EF.
 */
export function applySm2(
  prev: ScheduleEntry,
  grade: ReviewGrade,
  nowIso: string,
): ScheduleUpdate {
  const quality = gradeToQuality[grade];
  let { easiness, intervalDays, repetitions, lapses } = prev;

  easiness = clampEf(
    easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
    lapses += 1;
  } else {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = grade === "almost" ? 3 : 6;
    } else {
      const factor = grade === "almost" ? Math.max(1.2, easiness * 0.85) : easiness;
      intervalDays = Math.max(1, Math.round(intervalDays * factor));
    }
    repetitions += 1;
  }

  const entry: ScheduleEntry = {
    cardId: prev.cardId,
    easiness,
    intervalDays,
    repetitions,
    lapses,
    dueAt: addDays(nowIso, intervalDays),
    lastReviewedAt: nowIso,
    lastGrade: grade,
  };

  return { entry, quality, intervalDays, easiness };
}

export function isDue(entry: ScheduleEntry, nowIso: string): boolean {
  return new Date(entry.dueAt).getTime() <= new Date(nowIso).getTime();
}

export function isNew(entry: ScheduleEntry | undefined): boolean {
  return !entry || entry.lastReviewedAt === null;
}

export type QueueLimits = {
  /** Max cards already in schedule that are due. */
  maxDue: number;
  /** Max never-reviewed cards to introduce. */
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

  const due: { id: string; dueAt: string }[] = [];
  const fresh: string[] = [];

  for (const id of input.cardIds) {
    const entry = input.scheduleByCardId[id];
    if (isNew(entry)) {
      fresh.push(id);
    } else if (entry && isDue(entry, input.nowIso)) {
      due.push({ id, dueAt: entry.dueAt });
    }
  }

  due.sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  );

  return [
    ...due.slice(0, maxDue).map((d) => d.id),
    ...fresh.slice(0, maxNew),
  ];
}
