/**
 * FSRS-4.5 (Free Spaced Repetition Scheduler) — evidence-based scheduling.
 * Based on open-spaced-repetition / FSRS-4.5 default weights.
 * Pure functions: grade + history in → next due + stability/difficulty out.
 *
 * Student-facing surfaces must NOT expose “FSRS / stability / weights”.
 */

export const fsrsRatings = [1, 2, 3, 4] as const;
export type FsrsRating = (typeof fsrsRatings)[number];

/** again=1, hard=2, good=3, easy=4 */
export type FsrsGradeName = "again" | "hard" | "good" | "easy";

export const gradeNameToRating: Record<FsrsGradeName, FsrsRating> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

export const fsrsCardStates = [
  "new",
  "learning",
  "review",
  "relearning",
] as const;
export type FsrsCardState = (typeof fsrsCardStates)[number];

/** Default FSRS-4.5 weights (w0…w18). */
export const FSRS_DEFAULT_WEIGHTS: readonly number[] = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655,
  0.6621,
] as const;

export const FSRS_REQUEST_RETENTION = 0.9;
export const FSRS_MAX_INTERVAL_DAYS = 365;

export type FsrsCard = {
  /** Stability S (days until R≈0.9). */
  stability: number;
  /** Difficulty D in [1, 10]. */
  difficulty: number;
  /** Successful reviews in a row (resets on fail). */
  reps: number;
  lapses: number;
  state: FsrsCardState;
  lastReviewAt: string | null;
  dueAt: string;
};

export type FsrsReviewInput = {
  card: FsrsCard;
  rating: FsrsRating;
  nowIso: string;
  /**
   * Content difficulty 1–5 (question hardness).
   * Biases initial / ongoing D upward for harder items.
   */
  contentDifficulty?: number;
  /**
   * Self-confidence 1–5 before/after reveal.
   * Low confidence nudges rating down; high nudges up (within band).
   */
  confidence?: number;
  /**
   * How many times this item recently failed (ErrorMemory / lapses).
   * Raises difficulty and shortens next interval.
   */
  repeatedErrors?: number;
  weights?: readonly number[];
  requestRetention?: number;
};

export type FsrsReviewResult = {
  card: FsrsCard;
  /** Scheduled interval in days (may be fractional). */
  intervalDays: number;
  /** Retrievability just before this review (0–1). */
  retrievability: number;
  rating: FsrsRating;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setTime(d.getTime() + Math.max(0, days) * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

export function daysBetween(fromIso: string, toIso: string): number {
  const ms =
    new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24));
}

/** R = exp(ln(0.9) * t / S) */
export function retrievability(
  stability: number,
  elapsedDays: number,
): number {
  if (stability <= 0) return 0;
  return Math.exp((Math.log(0.9) * elapsedDays) / stability);
}

function constrainingStability(d: number, s: number, r: number, w: readonly number[]): number {
  return (
    w[11]! *
    Math.pow(d, -w[12]!) *
    (Math.pow(s + 1, w[13]!) - 1) *
    Math.exp(w[14]! * (1 - r))
  );
}

function nextDifficulty(d: number, rating: FsrsRating, w: readonly number[]): number {
  const next = d - w[6]! * (rating - 3);
  // Mean reversion toward initial difficulty weight w[4]
  const reverted = w[7]! * w[4]! + (1 - w[7]!) * next;
  return clamp(reverted, 1, 10);
}

function initialDifficulty(rating: FsrsRating, w: readonly number[]): number {
  return clamp(w[4]! - Math.exp(w[5]! * (rating - 1)) + 1, 1, 10);
}

function initialStability(rating: FsrsRating, w: readonly number[]): number {
  return Math.max(0.1, w[rating - 1]!);
}

function nextStabilitySuccess(input: {
  d: number;
  s: number;
  r: number;
  rating: FsrsRating;
  w: readonly number[];
}): number {
  const { d, s, r, rating, w } = input;
  const hardPenalty = rating === 2 ? w[15]! : 1;
  const easyBonus = rating === 4 ? w[16]! : 1;
  const growth =
    Math.exp(w[8]!) *
    (11 - d) *
    Math.pow(s, -w[9]!) *
    (Math.exp(w[10]! * (1 - r)) - 1) *
    hardPenalty *
    easyBonus;
  return s * (1 + growth);
}

function nextIntervalDays(
  stability: number,
  requestRetention: number,
): number {
  // I = S * ln(R) / ln(0.9)
  const interval =
    (stability * Math.log(requestRetention)) / Math.log(0.9);
  return clamp(interval, 0.05, FSRS_MAX_INTERVAL_DAYS);
}

/**
 * Soft-adjust rating from confidence (1–5) without inventing grades.
 * confidence ≤2 → nudge down; ≥4 → nudge up; stays in 1–4.
 */
export function adjustRatingForConfidence(
  rating: FsrsRating,
  confidence?: number,
): FsrsRating {
  if (confidence == null) return rating;
  if (confidence <= 2 && rating > 1) return (rating - 1) as FsrsRating;
  if (confidence >= 4 && rating < 4) return (rating + 1) as FsrsRating;
  return rating;
}

export function createFsrsCard(nowIso: string): FsrsCard {
  return {
    stability: 0.4,
    difficulty: 5,
    reps: 0,
    lapses: 0,
    state: "new",
    lastReviewAt: null,
    dueAt: nowIso,
  };
}

/**
 * Apply one FSRS review. Incorporates content difficulty + repeated errors.
 */
export function reviewFsrs(input: FsrsReviewInput): FsrsReviewResult {
  const w = input.weights ?? FSRS_DEFAULT_WEIGHTS;
  const requestRetention = input.requestRetention ?? FSRS_REQUEST_RETENTION;
  const rating = adjustRatingForConfidence(input.rating, input.confidence);

  const card = input.card;
  const elapsed =
    card.lastReviewAt != null
      ? daysBetween(card.lastReviewAt, input.nowIso)
      : 0;
  const r =
    card.state === "new" || card.lastReviewAt == null
      ? 1
      : retrievability(card.stability, elapsed);

  let difficulty: number;
  let stability: number;
  let reps = card.reps;
  let lapses = card.lapses;
  let state: FsrsCardState = card.state;

  const contentBias =
    input.contentDifficulty != null
      ? clamp((input.contentDifficulty - 3) * 0.35, -0.7, 0.7)
      : 0;
  const errorBias = clamp((input.repeatedErrors ?? 0) * 0.45, 0, 2.5);

  if (card.state === "new" || card.reps === 0) {
    difficulty = clamp(
      initialDifficulty(rating, w) + contentBias + errorBias * 0.3,
      1,
      10,
    );
    stability = initialStability(rating, w);
    // Harder content → slightly lower initial S
    if (contentBias > 0) stability *= 1 - contentBias * 0.15;
    if (errorBias > 0) stability *= 1 - Math.min(0.4, errorBias * 0.12);
    reps = rating === 1 ? 0 : 1;
    if (rating === 1) {
      lapses += 1;
      state = "relearning";
    } else {
      state = "learning";
    }
  } else if (rating === 1) {
    difficulty = clamp(
      nextDifficulty(card.difficulty, rating, w) + errorBias * 0.25,
      1,
      10,
    );
    stability = constrainingStability(difficulty, card.stability, r, w);
    if (errorBias > 0) {
      stability *= 1 - Math.min(0.5, errorBias * 0.1);
    }
    reps = 0;
    lapses += 1;
    state = "relearning";
  } else {
    difficulty = clamp(
      nextDifficulty(card.difficulty, rating, w) + contentBias * 0.15,
      1,
      10,
    );
    stability = nextStabilitySuccess({
      d: difficulty,
      s: card.stability,
      r,
      rating,
      w,
    });
    // Repeated prior errors: dampen growth until recovered
    if ((input.repeatedErrors ?? 0) > 0 || card.lapses > 0) {
      const damp = 1 - Math.min(0.35, (input.repeatedErrors ?? 0) * 0.08 + (card.lapses > 2 ? 0.1 : 0));
      stability *= damp;
    }
    reps = card.reps + 1;
    state = "review";
  }

  stability = clamp(stability, 0.1, FSRS_MAX_INTERVAL_DAYS);
  let intervalDays = nextIntervalDays(stability, requestRetention);

  // Again → same-day / next-day short loop
  if (rating === 1) {
    intervalDays = Math.min(intervalDays, Math.max(0.05, stability * 0.35));
  }

  // Hard → slightly shorter than good
  if (rating === 2) {
    intervalDays *= 0.9;
  }

  intervalDays = clamp(intervalDays, 0.05, FSRS_MAX_INTERVAL_DAYS);

  const next: FsrsCard = {
    stability: Math.round(stability * 1000) / 1000,
    difficulty: Math.round(difficulty * 100) / 100,
    reps,
    lapses,
    state,
    lastReviewAt: input.nowIso,
    dueAt: addDays(input.nowIso, intervalDays),
  };

  return {
    card: next,
    intervalDays: Math.round(intervalDays * 1000) / 1000,
    retrievability: Math.round(r * 1000) / 1000,
    rating,
  };
}

/** Map flashcard self-grades onto FSRS ratings. */
export function reviewGradeToFsrsRating(
  grade: "dont_know" | "almost" | "know",
): FsrsRating {
  if (grade === "dont_know") return 1;
  if (grade === "almost") return 2;
  return 3;
}

/** Map 3-way know grades; treat strong know as good (3). Use easy via confidence. */
export function reviewGradeToFsrsRatingWithConfidence(
  grade: "dont_know" | "almost" | "know",
  confidence?: number,
): FsrsRating {
  if (grade === "dont_know") return 1;
  if (grade === "almost") return 2;
  if (confidence != null && confidence >= 5) return 4;
  return 3;
}

export function performanceGradeToFsrsRating(
  grade: FsrsGradeName,
): FsrsRating {
  return gradeNameToRating[grade];
}

/**
 * Sort key for “what you're starting to forget”:
 * lower retrievability first; new cards after due review items.
 */
export function forgettingPriority(
  card: Pick<FsrsCard, "stability" | "lastReviewAt" | "state">,
  nowIso: string,
): number {
  if (card.state === "new" || card.lastReviewAt == null) return 0.55;
  const elapsed = daysBetween(card.lastReviewAt, nowIso);
  return retrievability(card.stability, elapsed);
}
