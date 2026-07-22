import { z } from "zod";

/**
 * Mastery Engine (D-031) — per KnowledgeUnit score 0–100 + transparent states.
 * Page views, scrolling, and self-declared „Umím“ alone never prove mastery.
 * Evidence: retrieval accuracy, repeated/delayed retrieval, difficulty,
 * recency (decay), exam-like performance, repeated mistakes (via lapses).
 * Not a calibrated P(pass matura) model — see LEARNING_ENGINE.md.
 */

export const masteryBands = [
  "not_seen",
  "introduced",
  "learning",
  "familiar",
  "strong",
  "mastered",
  "at_risk",
] as const;

export type MasteryBand = (typeof masteryBands)[number];

export const masteryBandSchema = z.enum(masteryBands);

export const masteryBandLabelsCs: Record<MasteryBand, string> = {
  not_seen: "Neviděno",
  introduced: "Představeno",
  learning: "Učím se",
  familiar: "Známé",
  strong: "Silné",
  mastered: "Silné",
  at_risk: "Ohrožené",
};

/**
 * Student-facing transparent states (not a scientific probability).
 * Internal bands map onto these five labels.
 */
export const transparentMasteryStates = [
  "new",
  "learning",
  "fragile",
  "stable",
  "mastered",
] as const;

export type TransparentMasteryState =
  (typeof transparentMasteryStates)[number];

export const transparentMasteryStateLabelsCs: Record<
  TransparentMasteryState,
  string
> = {
  new: "Nové",
  learning: "Učím se",
  fragile: "K procvičení",
  stable: "Silné",
  mastered: "Silné",
};

export const transparentMasteryStateDescriptionsCs: Record<
  TransparentMasteryState,
  string
> = {
  new: "Ještě bez reálného vybavení ze zdroje.",
  learning: "Začínáš si vybavovat — potřebuješ opakování.",
  fragile: "Umíš to někdy, ale snadno to vypadne — vrať se k tomu.",
  stable: "Opakovaně správně i s odstupem — drž tempo.",
  mastered: "Dostatek úspěšných vybavení — udržuj krátkým opakováním.",
};

/** Four student-facing visual states (UI chips). */
export const studentVisualStates = [
  "new",
  "learning",
  "needs_review",
  "strong",
] as const;

export type StudentVisualState = (typeof studentVisualStates)[number];

export const studentVisualStateLabelsCs: Record<StudentVisualState, string> = {
  new: "Nové",
  learning: "Učím se",
  needs_review: "K procvičení",
  strong: "Silné",
};

export function toStudentVisualState(
  state: TransparentMasteryState,
): StudentVisualState {
  if (state === "new") return "new";
  if (state === "learning") return "learning";
  if (state === "fragile") return "needs_review";
  return "strong";
}

export const MASTERY_TRANSPARENCY_DISCLAIMER_CS =
  "Stavy od „Nové“ po „Silné“ vycházejí z cvičení — neříkají přesně, jestli maturitu dáš.";

/** Evidence that can move mastery. Passive-only kinds never raise score. */
export const masteryEvidenceKinds = [
  "page_view",
  "diagnostic",
  "practice",
  "review",
  "transfer",
  "speed",
  "self_grade",
  "hint_only",
] as const;

export type MasteryEvidenceKind = (typeof masteryEvidenceKinds)[number];

/** Kinds that count as real retrieval / exam evidence (not self-declared). */
export const retrievalEvidenceKinds: readonly MasteryEvidenceKind[] = [
  "practice",
  "review",
  "diagnostic",
  "transfer",
  "speed",
] as const;

export const masteryCorrectness = ["incorrect", "partial", "correct"] as const;
export type MasteryCorrectness = (typeof masteryCorrectness)[number];

export const correctnessToUnit: Record<MasteryCorrectness, number> = {
  incorrect: 0,
  partial: 0.5,
  correct: 1,
};

/**
 * One graded (or passive) signal about a KU.
 * Passive: page_view / hint_only never increase score.
 */
export const masteryEvidenceSchema = z.object({
  kind: z.enum(masteryEvidenceKinds),
  /** Omit for non-graded signals (page_view, hint_only). */
  correctness: z.enum(masteryCorrectness).optional(),
  /** Item difficulty 1–5 (default 3). */
  difficulty: z.number().int().min(1).max(5).default(3),
  hintsUsed: z.number().int().min(0).max(8).default(0),
  /** Optional 1–5 self-confidence before reveal/grade. */
  selfConfidence: z.number().int().min(1).max(5).optional(),
  /** Response latency; used when `speedRelevant`. */
  responseMs: z.number().int().min(0).max(600_000).optional(),
  /** Expected fluent latency for speed-relevant items. */
  expectedMs: z.number().int().min(200).max(120_000).optional(),
  /** Speed Round / timed drill — apply speed adjustment. */
  speedRelevant: z.boolean().default(false),
  /** Transfer / application item (new context, same KU). */
  isTransfer: z.boolean().default(false),
  at: z.string().datetime(),
});

export type MasteryEvidence = z.infer<typeof masteryEvidenceSchema>;

export const masteryStateSchema = z.object({
  knowledgeUnitId: z.string().min(1).max(120),
  /** Continuous mastery 0–100 — internal signal, not a % chance of passing. */
  score: z.number().min(0).max(100),
  band: masteryBandSchema,
  /** Count of graded evidence events (not page views). */
  evidenceCount: z.number().int().min(0),
  /** Graded retrieval events only (excludes self_grade / passive). */
  retrievalEvidenceCount: z.number().int().min(0).default(0),
  correctStreak: z.number().int().min(0),
  lapses: z.number().int().min(0),
  /** Successful graded recalls (correct or partial) from retrieval kinds. */
  successfulRecalls: z.number().int().min(0),
  /** Successful recalls after ≥1 day gap. */
  delayedSuccessfulRecalls: z.number().int().min(0).default(0),
  transferSuccesses: z.number().int().min(0),
  diagnosticAttempts: z.number().int().min(0),
  examLikeAttempts: z.number().int().min(0).default(0),
  examLikeSuccesses: z.number().int().min(0).default(0),
  introducedAt: z.string().datetime().nullable(),
  lastEvidenceAt: z.string().datetime().nullable(),
  lastSuccessfulRecallAt: z.string().datetime().nullable(),
  /** Highest non-at_risk band reached (for at_risk detection). */
  peakBand: z.enum([
    "not_seen",
    "introduced",
    "learning",
    "familiar",
    "strong",
    "mastered",
  ]),
  updatedAt: z.string().datetime(),
});

export type MasteryState = z.infer<typeof masteryStateSchema>;

/** Tunable constants — documented in LEARNING_ENGINE.md. */
export const masteryConfig = {
  /** Passive kinds never raise score. */
  passiveKinds: ["page_view", "hint_only"] as const satisfies readonly MasteryEvidenceKind[],
  baseGainCorrect: 8,
  baseGainPartial: 3,
  baseLossIncorrect: -12,
  /** Self-declared „Umím“ alone — tiny or no gain; mistakes still hurt. */
  selfGradeCorrectCap: 1.5,
  delayedRetrievalBonus: 2.5,
  delayedRetrievalMinDays: 1,
  diagnosticCorrectFloor: 32,
  diagnosticIncorrectCeiling: 22,
  hintPenaltyPerHint: 1.5,
  transferBonus: 4,
  transferPenalty: -6,
  streakBonusCap: 5,
  streakBonusPer: 0.6,
  /** Days without successful recall before decay starts (if score ≥ familiar). */
  decayGraceDays: 7,
  decayPerDay: 0.9,
  decayCap: 18,
  /** At-risk if was ≥ familiar and overdue this many days, or recent hard lapse. */
  atRiskOverdueDays: 14,
  atRiskMinPeakScore: 40,
  masteredMinScore: 80,
  masteredMinEvidence: 5,
  masteredMinRetrievalEvidence: 4,
  masteredMinDelayedRecalls: 1,
  masteredMinStreakOrTransfer: true,
  /** Score thresholds for non-risk bands. */
  thresholds: {
    introduced: 0,
    learning: 15,
    familiar: 40,
    strong: 60,
    mastered: 80,
  },
} as const;

export function emptyMasteryState(
  knowledgeUnitId: string,
  nowIso: string,
): MasteryState {
  return {
    knowledgeUnitId,
    score: 0,
    band: "not_seen",
    evidenceCount: 0,
    retrievalEvidenceCount: 0,
    correctStreak: 0,
    lapses: 0,
    successfulRecalls: 0,
    delayedSuccessfulRecalls: 0,
    transferSuccesses: 0,
    diagnosticAttempts: 0,
    examLikeAttempts: 0,
    examLikeSuccesses: 0,
    introducedAt: null,
    lastEvidenceAt: null,
    lastSuccessfulRecallAt: null,
    peakBand: "not_seen",
    updatedAt: nowIso,
  };
}

/** Coerce legacy rows missing new counters. */
export function normalizeMasteryState(raw: MasteryState): MasteryState {
  return {
    ...raw,
    retrievalEvidenceCount: raw.retrievalEvidenceCount ?? 0,
    delayedSuccessfulRecalls: raw.delayedSuccessfulRecalls ?? 0,
    examLikeAttempts: raw.examLikeAttempts ?? 0,
    examLikeSuccesses: raw.examLikeSuccesses ?? 0,
  };
}

/**
 * Map internal band → transparent student-facing state.
 * at_risk always surfaces as FRAGILE.
 */
export function toTransparentMasteryState(
  state: Pick<
    MasteryState,
    | "band"
    | "score"
    | "retrievalEvidenceCount"
    | "successfulRecalls"
  >,
): TransparentMasteryState {
  if (state.band === "at_risk") return "fragile";
  if (state.band === "mastered") return "mastered";
  if (state.band === "strong") return "stable";
  if (state.band === "familiar") return "fragile";
  if (state.band === "learning") return "learning";
  if ((state.retrievalEvidenceCount ?? 0) > 0 || state.successfulRecalls > 0) {
    return "learning";
  }
  return "new";
}

function clampScore(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
}

function daysBetween(fromIso: string, toIso: string): number {
  const ms =
    new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Math.max(0, ms / (24 * 60 * 60 * 1000));
}

function isPassive(kind: MasteryEvidenceKind): boolean {
  return (masteryConfig.passiveKinds as readonly string[]).includes(kind);
}

function isRetrievalKind(kind: MasteryEvidenceKind): boolean {
  return (retrievalEvidenceKinds as readonly string[]).includes(kind);
}

const orderedPeak = [
  "not_seen",
  "introduced",
  "learning",
  "familiar",
  "strong",
  "mastered",
] as const;

type PeakBand = (typeof orderedPeak)[number];

function peakRank(b: PeakBand): number {
  return orderedPeak.indexOf(b);
}

function maxPeak(a: PeakBand, b: PeakBand): PeakBand {
  return peakRank(a) >= peakRank(b) ? a : b;
}

/**
 * Band from score + mastery gates (before at_risk overlay).
 * MASTERED requires retrieval evidence + delayed success — not self_grade alone.
 */
export function bandFromScore(
  score: number,
  state: Pick<
    MasteryState,
    | "evidenceCount"
    | "retrievalEvidenceCount"
    | "correctStreak"
    | "transferSuccesses"
    | "introducedAt"
    | "successfulRecalls"
    | "delayedSuccessfulRecalls"
  >,
): PeakBand {
  if (state.introducedAt === null && state.evidenceCount === 0) {
    return "not_seen";
  }
  const t = masteryConfig.thresholds;
  if (score >= t.mastered) {
    const streakOk = state.correctStreak >= 3;
    const transferOk = state.transferSuccesses >= 1;
    const evidenceOk =
      state.evidenceCount >= masteryConfig.masteredMinEvidence;
    const retrievalOk =
      (state.retrievalEvidenceCount ?? 0) >=
      masteryConfig.masteredMinRetrievalEvidence;
    const recallsOk = state.successfulRecalls >= 3;
    const delayedOk =
      (state.delayedSuccessfulRecalls ?? 0) >=
      masteryConfig.masteredMinDelayedRecalls;
    if (
      evidenceOk &&
      retrievalOk &&
      recallsOk &&
      delayedOk &&
      (!masteryConfig.masteredMinStreakOrTransfer || streakOk || transferOk)
    ) {
      return "mastered";
    }
    return "strong";
  }
  if (score >= t.strong) return "strong";
  if (score >= t.familiar) return "familiar";
  if (score >= t.learning) return "learning";
  return "introduced";
}

export function shouldMarkAtRisk(input: {
  score: number;
  peakBand: PeakBand;
  lapses: number;
  lastSuccessfulRecallAt: string | null;
  lastEvidenceAt: string | null;
  nowIso: string;
  justLapsed: boolean;
}): boolean {
  const peakOk =
    peakRank(input.peakBand) >= peakRank("familiar") ||
    input.score >= masteryConfig.atRiskMinPeakScore;

  if (!peakOk) return false;

  if (input.justLapsed && input.score < masteryConfig.thresholds.strong) {
    return true;
  }

  const anchor = input.lastSuccessfulRecallAt ?? input.lastEvidenceAt;
  if (!anchor) return false;
  const overdue = daysBetween(anchor, input.nowIso);
  return overdue >= masteryConfig.atRiskOverdueDays;
}

/** Apply time-based decay before new evidence (forgetting / recency signal). */
export function applyDecay(
  state: MasteryState,
  nowIso: string,
): MasteryState {
  state = normalizeMasteryState(state);
  if (state.band === "not_seen") return state;
  const anchor = state.lastSuccessfulRecallAt ?? state.lastEvidenceAt;
  if (!anchor) return state;
  if (state.score < masteryConfig.thresholds.familiar) return state;

  const days = daysBetween(anchor, nowIso);
  const overdue = days - masteryConfig.decayGraceDays;
  if (overdue <= 0) return state;

  const decay = Math.min(
    masteryConfig.decayCap,
    overdue * masteryConfig.decayPerDay,
  );
  const score = clampScore(state.score - decay);
  const peakBand = state.peakBand;
  let band: MasteryBand = bandFromScore(score, {
    ...state,
  });
  if (
    shouldMarkAtRisk({
      score,
      peakBand,
      lapses: state.lapses,
      lastSuccessfulRecallAt: state.lastSuccessfulRecallAt,
      lastEvidenceAt: state.lastEvidenceAt,
      nowIso,
      justLapsed: false,
    })
  ) {
    band = "at_risk";
  }

  return {
    ...state,
    score,
    band,
    updatedAt: nowIso,
  };
}

function difficultyMultiplier(difficulty: number, correctUnit: number): number {
  const t = (difficulty - 3) * 0.12;
  if (correctUnit >= 0.99) return 1 + Math.max(0, t);
  if (correctUnit <= 0.01) return 1 + Math.max(0, -t) + Math.max(0, t);
  return 1 + t * 0.5;
}

function confidenceAdjustment(
  selfConfidence: number | undefined,
  correctUnit: number,
): number {
  if (selfConfidence == null) return 0;
  if (correctUnit < 0.25 && selfConfidence >= 4) return -3;
  if (correctUnit >= 0.99 && selfConfidence <= 2) return 1;
  return 0;
}

function speedAdjustment(input: {
  speedRelevant: boolean;
  correctUnit: number;
  responseMs?: number;
  expectedMs?: number;
}): number {
  if (!input.speedRelevant || input.responseMs == null) return 0;
  if (input.correctUnit < 0.5) return 0;
  const expected = input.expectedMs ?? 4000;
  if (input.responseMs <= expected * 0.55) return 1.5;
  if (input.responseMs >= expected * 2.8) return -1.5;
  return 0;
}

export type MasteryUpdateResult = {
  state: MasteryState;
  delta: number;
  decayApplied: number;
  reasons: string[];
};

/**
 * Core update. Pure + deterministic.
 * @param knowledgeUnitId required when `prev` is null
 */
export function applyMasteryEvidence(
  prev: MasteryState | null,
  evidence: MasteryEvidence,
  knowledgeUnitId?: string,
): MasteryUpdateResult {
  const ev = masteryEvidenceSchema.parse(evidence);
  const now = ev.at;
  const kuId = prev?.knowledgeUnitId ?? knowledgeUnitId;
  if (!kuId) {
    throw new Error("knowledgeUnitId is required when prev is null");
  }
  let state = normalizeMasteryState(prev ?? emptyMasteryState(kuId, now));

  const scoreAfterDecayStart = state.score;
  state = applyDecay(state, now);
  const decayApplied = clampScore(scoreAfterDecayStart - state.score);

  const reasons: string[] = [];
  if (decayApplied > 0) reasons.push(`decay -${decayApplied}`);

  const scoreBeforeEvidence = state.score;

  if (isPassive(ev.kind)) {
    if (state.band === "not_seen" || state.introducedAt === null) {
      state = {
        ...state,
        band: "introduced",
        introducedAt: state.introducedAt ?? now,
        lastEvidenceAt: now,
        peakBand: maxPeak(state.peakBand, "introduced"),
        updatedAt: now,
      };
      reasons.push("introduced via passive (score unchanged)");
    } else {
      state = { ...state, lastEvidenceAt: now, updatedAt: now };
      reasons.push("passive — no score change");
    }
    return { state, delta: 0, decayApplied, reasons };
  }

  if (ev.correctness == null) {
    if (state.introducedAt === null) {
      state = {
        ...state,
        band: "introduced",
        introducedAt: now,
        lastEvidenceAt: now,
        peakBand: maxPeak(state.peakBand, "introduced"),
        updatedAt: now,
      };
    }
    return {
      state,
      delta: 0,
      decayApplied,
      reasons: [...reasons, "ungraded active — no score change"],
    };
  }

  const unit = correctnessToUnit[ev.correctness];
  const retrieval = isRetrievalKind(ev.kind);
  let delta = 0;

  if (ev.correctness === "correct") {
    delta = masteryConfig.baseGainCorrect;
  } else if (ev.correctness === "partial") {
    delta = masteryConfig.baseGainPartial;
  } else {
    delta = masteryConfig.baseLossIncorrect;
  }

  delta *= difficultyMultiplier(ev.difficulty, unit);
  reasons.push(`base×diff ${delta.toFixed(1)}`);

  if (ev.kind === "self_grade" && unit >= 0.5) {
    delta = Math.min(delta, masteryConfig.selfGradeCorrectCap);
    reasons.push("self_grade capped — alone does not prove retrieval");
  }

  if (unit >= 0.5 && ev.hintsUsed > 0) {
    const pen = ev.hintsUsed * masteryConfig.hintPenaltyPerHint;
    delta -= pen;
    reasons.push(`hints -${pen}`);
  }

  const conf = confidenceAdjustment(ev.selfConfidence, unit);
  if (conf !== 0) {
    delta += conf;
    reasons.push(`confidence ${conf > 0 ? "+" : ""}${conf}`);
  }

  const spd = speedAdjustment({
    speedRelevant: ev.speedRelevant,
    correctUnit: unit,
    responseMs: ev.responseMs,
    expectedMs: ev.expectedMs,
  });
  if (spd !== 0) {
    delta += spd;
    reasons.push(`speed ${spd > 0 ? "+" : ""}${spd}`);
  }

  const transfer = ev.isTransfer || ev.kind === "transfer";
  if (transfer) {
    if (unit >= 0.99) {
      delta += masteryConfig.transferBonus;
      reasons.push(`transfer +${masteryConfig.transferBonus}`);
    } else if (unit <= 0.01) {
      delta += masteryConfig.transferPenalty;
      reasons.push(`transfer ${masteryConfig.transferPenalty}`);
    }
  }

  let correctStreak = state.correctStreak;
  let lapses = state.lapses;
  let successfulRecalls = state.successfulRecalls;
  let delayedSuccessfulRecalls = state.delayedSuccessfulRecalls;
  let transferSuccesses = state.transferSuccesses;
  let retrievalEvidenceCount = state.retrievalEvidenceCount;
  let examLikeAttempts = state.examLikeAttempts;
  let examLikeSuccesses = state.examLikeSuccesses;
  let justLapsed = false;

  if (retrieval) {
    retrievalEvidenceCount += 1;
  }

  const examLike = ev.kind === "diagnostic" || ev.difficulty >= 5;
  if (examLike) {
    examLikeAttempts += 1;
  }

  if (unit >= 0.99) {
    if (retrieval) {
      correctStreak += 1;
      successfulRecalls += 1;
      if (correctStreak > 1) {
        delta += masteryConfig.streakBonusPer;
        reasons.push(`streak +${masteryConfig.streakBonusPer}`);
      }
      const prevRecall = state.lastSuccessfulRecallAt;
      if (
        prevRecall &&
        daysBetween(prevRecall, now) >= masteryConfig.delayedRetrievalMinDays
      ) {
        delayedSuccessfulRecalls += 1;
        delta += masteryConfig.delayedRetrievalBonus;
        reasons.push(
          `delayed retrieval +${masteryConfig.delayedRetrievalBonus}`,
        );
      }
      if (transfer) transferSuccesses += 1;
      if (examLike) examLikeSuccesses += 1;
    } else if (ev.kind === "self_grade") {
      reasons.push("self_grade correct — no retrieval streak credit");
    }
  } else if (unit <= 0.01) {
    correctStreak = 0;
    lapses += 1;
    justLapsed = true;
  } else if (retrieval) {
    successfulRecalls += 1;
  }

  let score = state.score + delta;
  let diagnosticAttempts = state.diagnosticAttempts;
  if (ev.kind === "diagnostic") {
    diagnosticAttempts += 1;
    if (unit >= 0.99) {
      score = Math.max(score, masteryConfig.diagnosticCorrectFloor);
      reasons.push(`diagnostic floor ≥${masteryConfig.diagnosticCorrectFloor}`);
    } else if (unit <= 0.01) {
      score = Math.min(
        Math.max(score, 0),
        masteryConfig.diagnosticIncorrectCeiling,
      );
      if (state.band === "not_seen" || state.evidenceCount === 0) {
        score = Math.min(score, 18);
      }
      reasons.push(
        `diagnostic ceiling ≤${masteryConfig.diagnosticIncorrectCeiling}`,
      );
    }
  }

  score = clampScore(score);
  const introducedAt = state.introducedAt ?? now;

  const nextPartial: MasteryState = {
    ...state,
    score,
    evidenceCount: state.evidenceCount + 1,
    retrievalEvidenceCount,
    correctStreak,
    lapses,
    successfulRecalls,
    delayedSuccessfulRecalls,
    transferSuccesses,
    diagnosticAttempts,
    examLikeAttempts,
    examLikeSuccesses,
    introducedAt,
    lastEvidenceAt: now,
    lastSuccessfulRecallAt:
      unit >= 0.5 && retrieval ? now : state.lastSuccessfulRecallAt,
    updatedAt: now,
    band: state.band,
    peakBand: state.peakBand,
  };

  let peakBand = maxPeak(
    state.peakBand,
    bandFromScore(score, nextPartial),
  );

  let band: MasteryBand = bandFromScore(score, nextPartial);
  peakBand = maxPeak(peakBand, band);

  if (
    shouldMarkAtRisk({
      score,
      peakBand,
      lapses,
      lastSuccessfulRecallAt: nextPartial.lastSuccessfulRecallAt,
      lastEvidenceAt: now,
      nowIso: now,
      justLapsed,
    })
  ) {
    band = "at_risk";
    reasons.push("at_risk overlay");
  }

  const finalState: MasteryState = {
    ...nextPartial,
    score,
    band,
    peakBand,
  };

  return {
    state: finalState,
    delta: clampScore(score - scoreBeforeEvidence),
    decayApplied,
    reasons,
  };
}

/**
 * Aggregate readiness 0–100 from KU weights × score/100.
 * This is a **coverage-weighted mastery average**, NOT P(pass matura).
 */
export function computeMasteryAggregate(input: {
  items: Array<{ score: number; examWeight: number; evidenceCount: number }>;
}): {
  aggregate: number;
  labeledAs: "mastery_aggregate";
  lowEvidence: boolean;
  disclaimer: string;
} {
  let wSum = 0;
  let num = 0;
  let low = false;
  for (const it of input.items) {
    const w = Math.max(0.1, it.examWeight);
    wSum += w;
    num += w * (it.score / 100);
    if (it.evidenceCount < 2) low = true;
  }
  const aggregate =
    wSum === 0 ? 0 : Math.round((num / wSum) * 1000) / 10;
  return {
    aggregate,
    labeledAs: "mastery_aggregate",
    lowEvidence: low,
    disclaimer: MASTERY_TRANSPARENCY_DISCLAIMER_CS,
  };
}

/** Map legacy lesson interaction into mastery evidence (adapter). */
export function evidenceFromLessonInteraction(input: {
  kind: string;
  success?: boolean | null;
  at: string;
}): MasteryEvidence | null {
  switch (input.kind) {
    case "continue":
    case "back":
    case "save":
    case "open_explanation":
      return {
        kind: "page_view",
        at: input.at,
        difficulty: 3,
        hintsUsed: 0,
        speedRelevant: false,
        isTransfer: false,
      };
    case "understand":
      return {
        kind: "page_view",
        at: input.at,
        difficulty: 3,
        hintsUsed: 0,
        speedRelevant: false,
        isTransfer: false,
      };
    case "dont_know":
      return {
        kind: "self_grade",
        correctness: "incorrect",
        at: input.at,
        difficulty: 3,
        hintsUsed: 0,
        selfConfidence: 1,
        speedRelevant: false,
        isTransfer: false,
      };
    case "quiz_answer":
    case "flashcard_grade":
    case "recall_submit":
    case "teach_back_submit":
    case "exit_submit": {
      if (input.success === true) {
        return {
          kind: "practice",
          correctness: "correct",
          at: input.at,
          difficulty: 3,
          hintsUsed: 0,
          speedRelevant: false,
          isTransfer: input.kind === "teach_back_submit",
        };
      }
      if (input.success === false) {
        return {
          kind: "practice",
          correctness: "incorrect",
          at: input.at,
          difficulty: 3,
          hintsUsed: 0,
          speedRelevant: false,
          isTransfer: false,
        };
      }
      return {
        kind: "page_view",
        at: input.at,
        difficulty: 3,
        hintsUsed: 0,
        speedRelevant: false,
        isTransfer: false,
      };
    }
    case "lesson_completed":
      return {
        kind: "page_view",
        at: input.at,
        difficulty: 3,
        hintsUsed: 0,
        speedRelevant: false,
        isTransfer: false,
      };
    default:
      return null;
  }
}
