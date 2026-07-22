import { z } from "zod";
import {
  applySm2,
  createScheduleEntry,
  type ReviewGrade,
  type ScheduleEntry,
} from "@/domain/learning/scheduler";
import { planTodayLoad } from "@/domain/learning/deadline-planner";

/**
 * Adaptive exam-aware learning planner.
 * Maximizes durable recall: mistakes + forgotten first, exam deadline aware,
 * expanding intervals by performance, successive relearning before “stable”,
 * time modes 15/30/60/required, gentle auto-replan (never punish missed days).
 */

export const adaptiveAttemptResults = [
  "correct",
  "partial",
  "incorrect",
  "forgotten",
] as const;
export type AdaptiveAttemptResult = (typeof adaptiveAttemptResults)[number];

export const adaptivePlannerModes = [
  "min_15",
  "min_30",
  "min_60",
  "required",
] as const;
export type AdaptivePlannerMode = (typeof adaptivePlannerModes)[number];

export const adaptivePlannerModeLabelsCs: Record<AdaptivePlannerMode, string> =
  {
    min_15: "15 min",
    min_30: "30 min",
    min_60: "60 min",
    required: "Kolik bude potřeba",
  };

export const adaptivePlannerModeHintsCs: Record<AdaptivePlannerMode, string> = {
  min_15: "Krátká mise — nejdřív splatné a chyby.",
  min_30: "Standardní denní sezení.",
  min_60: "Delší blok — víc opakování i nové látky.",
  required:
    "Odhad podle termínu maturity a fronty — bez nereálného dohánění.",
};

/** Mission composition buckets (priority order). */
export const adaptiveMissionBuckets = [
  "overdue",
  "mistakes",
  "fragile",
  "new",
  "mixed",
] as const;
export type AdaptiveMissionBucket = (typeof adaptiveMissionBuckets)[number];

export const adaptiveMissionBucketLabelsCs: Record<
  AdaptiveMissionBucket,
  string
> = {
  overdue: "Po splatnosti",
  mistakes: "Opakované chyby",
  fragile: "Křehké priority",
  new: "Nové učení",
  mixed: "Krátký mix",
};

export const adaptiveReviewHistoryEntrySchema = z.object({
  at: z.string().datetime(),
  result: z.enum(adaptiveAttemptResults),
  grade: z.enum(["dont_know", "almost", "know"]).optional(),
  intervalDaysAfter: z.number().min(0).max(400),
  sessionKey: z.string().min(1).max(40).optional(),
});

export type AdaptiveReviewHistoryEntry = z.infer<
  typeof adaptiveReviewHistoryEntrySchema
>;

export const adaptiveUnitStateSchema = z.object({
  knowledgeUnitId: z.string().min(1).max(120),
  lastAttempt: z.string().datetime().nullable(),
  result: z.enum(adaptiveAttemptResults).nullable(),
  /** Content / felt difficulty 1–5. */
  difficulty: z.number().int().min(1).max(5).default(3),
  consecutiveSuccessfulRetrievals: z.number().int().min(0).max(10_000),
  mistakeCount: z.number().int().min(0).max(10_000),
  nextReview: z.string().datetime(),
  reviewHistory: z.array(adaptiveReviewHistoryEntrySchema).max(80).default([]),
  /** Successful retrievals in distinct sessions (successive relearning). */
  separatedSuccessfulSessions: z.number().int().min(0).max(10_000).default(0),
  lastSuccessSessionKey: z.string().max(40).nullable().optional(),
  examPriority: z.number().int().min(1).max(5).default(3),
  titleCs: z.string().max(200).optional(),
  /** Underlying FSRS-compatible schedule snapshot. */
  schedule: z
    .object({
      easiness: z.number(),
      intervalDays: z.number(),
      repetitions: z.number().int(),
      lapses: z.number().int(),
      dueAt: z.string(),
      lastReviewedAt: z.string().nullable(),
      lastGrade: z.enum(["dont_know", "almost", "know"]).nullable(),
      stability: z.number().optional(),
      difficulty: z.number().optional(),
    })
    .optional(),
  updatedAt: z.string().datetime(),
});

export type AdaptiveUnitState = z.infer<typeof adaptiveUnitStateSchema>;

export const adaptivePlannerBookSchema = z.object({
  learnerId: z.string().min(1).max(64),
  preferredMode: z.enum(adaptivePlannerModes).default("min_30"),
  units: z.record(z.string(), adaptiveUnitStateSchema).default({}),
  updatedAt: z.string().datetime(),
});

export type AdaptivePlannerBook = z.infer<typeof adaptivePlannerBookSchema>;

export const adaptivePlannerConfig = {
  /** Sessions with successful delayed retrieval before “stable”. */
  successiveSessionsForStable: 3,
  /** Min hours between sessions counting as successive. */
  minSessionSeparationHours: 8,
  /** Cap history length. */
  maxHistory: 40,
  /** Minutes per planned item by bucket (capacity estimate). */
  minutesPerItem: {
    overdue: 1.4,
    mistakes: 2.8,
    fragile: 2.2,
    new: 4.5,
    mixed: 1.6,
  } as Record<AdaptiveMissionBucket, number>,
  /** Soft max items per day even in “required” mode. */
  hardMaxItemsPerDay: 48,
  /** Cap required-mode inflation after missed days. */
  missedDayCatchUpFraction: 0.35,
} as const;

export function emptyAdaptiveBook(
  learnerId: string,
  nowIso: string,
): AdaptivePlannerBook {
  return {
    learnerId,
    preferredMode: "min_30",
    units: {},
    updatedAt: nowIso,
  };
}

export function createAdaptiveUnit(
  knowledgeUnitId: string,
  nowIso: string,
  opts?: { titleCs?: string; difficulty?: number; examPriority?: number },
): AdaptiveUnitState {
  const schedule = createScheduleEntry(knowledgeUnitId, nowIso);
  return {
    knowledgeUnitId,
    lastAttempt: null,
    result: null,
    difficulty: opts?.difficulty ?? 3,
    consecutiveSuccessfulRetrievals: 0,
    mistakeCount: 0,
    nextReview: nowIso,
    reviewHistory: [],
    separatedSuccessfulSessions: 0,
    lastSuccessSessionKey: null,
    examPriority: opts?.examPriority ?? 3,
    titleCs: opts?.titleCs,
    schedule: {
      easiness: schedule.easiness,
      intervalDays: schedule.intervalDays,
      repetitions: schedule.repetitions,
      lapses: schedule.lapses,
      dueAt: schedule.dueAt,
      lastReviewedAt: schedule.lastReviewedAt,
      lastGrade: schedule.lastGrade,
      stability: schedule.stability,
      difficulty: schedule.difficulty,
    },
    updatedAt: nowIso,
  };
}

export function attemptResultToReviewGrade(
  result: AdaptiveAttemptResult,
): ReviewGrade {
  if (result === "correct") return "know";
  if (result === "partial") return "almost";
  return "dont_know";
}

function sessionKeyFromIso(iso: string): string {
  return iso.slice(0, 13); // YYYY-MM-DDTHH — hour bucket as session proxy
}

function hoursBetween(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
}

/**
 * Is this unit stable for durable recall?
 * Requires successive relearning across separated sessions — not one lucky hit.
 */
export function isUnitStable(unit: AdaptiveUnitState): boolean {
  return (
    unit.separatedSuccessfulSessions >=
      adaptivePlannerConfig.successiveSessionsForStable &&
    unit.consecutiveSuccessfulRetrievals >= 2 &&
    unit.result === "correct"
  );
}

export function isUnitFragile(unit: AdaptiveUnitState, nowIso: string): boolean {
  if (isUnitStable(unit)) return false;
  if (unit.mistakeCount >= 2) return true;
  if (unit.consecutiveSuccessfulRetrievals === 0 && unit.lastAttempt) {
    return true;
  }
  if (
    unit.result === "partial" ||
    unit.result === "incorrect" ||
    unit.result === "forgotten"
  ) {
    return true;
  }
  // Not yet successively relearned across enough sessions
  if (
    unit.lastAttempt &&
    unit.separatedSuccessfulSessions <
      adaptivePlannerConfig.successiveSessionsForStable
  ) {
    return true;
  }
  // Due soon and never stabilized
  if (unit.nextReview <= nowIso && unit.separatedSuccessfulSessions < 2) {
    return true;
  }
  return false;
}

/**
 * Record an attempt: expands/contracts intervals via FSRS facade,
 * enforces successive relearning caps, appends history.
 */
export function recordAdaptiveAttempt(input: {
  unit: AdaptiveUnitState;
  result: AdaptiveAttemptResult;
  nowIso: string;
  sessionKey?: string;
  contentDifficulty?: number;
}): AdaptiveUnitState {
  const nowIso = input.nowIso;
  const grade = attemptResultToReviewGrade(input.result);
  const prevSchedule: ScheduleEntry = input.unit.schedule
    ? {
        cardId: input.unit.knowledgeUnitId,
        easiness: input.unit.schedule.easiness,
        intervalDays: input.unit.schedule.intervalDays,
        repetitions: input.unit.schedule.repetitions,
        lapses: input.unit.schedule.lapses,
        dueAt: input.unit.schedule.dueAt,
        lastReviewedAt: input.unit.schedule.lastReviewedAt,
        lastGrade: input.unit.schedule.lastGrade,
        stability: input.unit.schedule.stability,
        difficulty: input.unit.schedule.difficulty,
      }
    : createScheduleEntry(input.unit.knowledgeUnitId, nowIso);

  const { entry, intervalDays } = applySm2(prevSchedule, grade, nowIso, {
    contentDifficulty: input.contentDifficulty ?? input.unit.difficulty,
    repeatedErrors:
      input.result === "incorrect" || input.result === "forgotten"
        ? Math.max(1, input.unit.mistakeCount)
        : input.unit.mistakeCount,
  });

  let consecutive = input.unit.consecutiveSuccessfulRetrievals;
  let mistakes = input.unit.mistakeCount;
  let separated = input.unit.separatedSuccessfulSessions;
  let lastSuccessSession = input.unit.lastSuccessSessionKey ?? null;
  const sk = input.sessionKey ?? sessionKeyFromIso(nowIso);

  if (input.result === "correct") {
    consecutive += 1;
    const lastAt = input.unit.lastAttempt;
    const separatedEnough =
      !lastAt ||
      hoursBetween(lastAt, nowIso) >=
        adaptivePlannerConfig.minSessionSeparationHours;
    if (separatedEnough && lastSuccessSession !== sk) {
      separated += 1;
      lastSuccessSession = sk;
    }
  } else if (input.result === "partial") {
    consecutive = Math.max(0, consecutive - 1);
  } else {
    consecutive = 0;
    mistakes += 1;
    // Failures reset successive streak progress (must relearn again)
    separated = Math.max(0, separated - 1);
  }

  // Successive relearning: until stable, never schedule farther than a short horizon
  let dueAt = entry.dueAt;
  let usedInterval = intervalDays;
  if (
    separated < adaptivePlannerConfig.successiveSessionsForStable ||
    consecutive < 2
  ) {
    const maxDays =
      input.result === "correct"
        ? Math.min(2.5, Math.max(0.35, intervalDays))
        : input.result === "partial"
          ? Math.min(0.75, Math.max(0.15, intervalDays))
          : Math.min(0.25, Math.max(0.05, intervalDays));
    const d = new Date(nowIso);
    d.setTime(d.getTime() + maxDays * 86_400_000);
    dueAt = d.toISOString();
    usedInterval = maxDays;
  }

  const historyEntry: AdaptiveReviewHistoryEntry = {
    at: nowIso,
    result: input.result,
    grade,
    intervalDaysAfter: usedInterval,
    sessionKey: sk,
  };
  const reviewHistory = [
    ...input.unit.reviewHistory,
    historyEntry,
  ].slice(-adaptivePlannerConfig.maxHistory);

  return {
    ...input.unit,
    lastAttempt: nowIso,
    result: input.result,
    difficulty: input.contentDifficulty ?? input.unit.difficulty,
    consecutiveSuccessfulRetrievals: consecutive,
    mistakeCount: mistakes,
    nextReview: dueAt,
    reviewHistory,
    separatedSuccessfulSessions: separated,
    lastSuccessSessionKey: lastSuccessSession,
    schedule: {
      easiness: entry.easiness,
      intervalDays: entry.intervalDays,
      repetitions: entry.repetitions,
      lapses: entry.lapses,
      dueAt,
      lastReviewedAt: entry.lastReviewedAt,
      lastGrade: entry.lastGrade,
      stability: entry.stability,
      difficulty: entry.difficulty,
    },
    updatedAt: nowIso,
  };
}

function phaseFromDaysRemaining(daysRemaining: number):
  | "coverage"
  | "consolidation"
  | "exam_readiness"
  | "final_review" {
  if (daysRemaining <= 10) return "final_review";
  if (daysRemaining <= 28) return "exam_readiness";
  if (daysRemaining <= 60) return "consolidation";
  return "coverage";
}

export function resolvePlannerModeMinutes(
  mode: AdaptivePlannerMode,
  input: {
    dailyMinutes: number;
    daysRemaining: number;
    overdueCount: number;
    openMistakesCount: number;
    fragileCount: number;
    newAvailable: number;
    missedDays?: number;
  },
): number {
  if (mode === "min_15") return 15;
  if (mode === "min_30") return 30;
  if (mode === "min_60") return 60;

  // “Kolik bude potřeba” — deadline-aware soft estimate, backlog-capped.
  const load = planTodayLoad({
    phase: phaseFromDaysRemaining(input.daysRemaining),
    dailyMinutes: Math.max(15, input.dailyMinutes),
    missedDays: input.missedDays ?? 0,
    dueReviews: input.overdueCount + input.fragileCount,
    contentUnits: Math.max(1, input.newAvailable + input.openMistakesCount),
    masteryPct: 50,
    difficultyIndex: 3,
  });
  return Math.min(
    Math.max(15, load.scheduledMinutes),
    Math.round(Math.max(15, input.dailyMinutes) * 1.2),
  );
}

export type AdaptiveQueueCounts = {
  overdue: number;
  mistakes: number;
  fragile: number;
  newUnits: number;
  mixed: number;
};

export function countAdaptiveQueues(
  units: AdaptiveUnitState[],
  nowIso: string,
): AdaptiveQueueCounts {
  let overdue = 0;
  let mistakes = 0;
  let fragile = 0;
  let newUnits = 0;
  for (const u of units) {
    if (u.lastAttempt == null && u.reviewHistory.length === 0) {
      newUnits += 1;
      continue;
    }
    if (u.nextReview <= nowIso) overdue += 1;
    if (u.mistakeCount > 0 && !isUnitStable(u)) mistakes += 1;
    if (isUnitFragile(u, nowIso)) fragile += 1;
  }
  const mixed = Math.min(8, overdue + fragile);
  return { overdue, mistakes, fragile, newUnits, mixed };
}

/**
 * Estimate how many items fit in the time budget (realistic, not aspirational).
 */
export function estimateItemsForBudget(
  budgetMinutes: number,
  queues: AdaptiveQueueCounts,
): {
  estimatedItems: number;
  estimateCs: string;
  allocation: Record<AdaptiveMissionBucket, number>;
} {
  let remaining = Math.max(5, budgetMinutes);
  const allocation: Record<AdaptiveMissionBucket, number> = {
    overdue: 0,
    mistakes: 0,
    fragile: 0,
    new: 0,
    mixed: 0,
  };

  const order: AdaptiveMissionBucket[] = [
    "overdue",
    "mistakes",
    "fragile",
    "new",
    "mixed",
  ];
  const available: Record<AdaptiveMissionBucket, number> = {
    overdue: queues.overdue,
    mistakes: queues.mistakes,
    fragile: Math.max(0, queues.fragile - queues.mistakes),
    new: queues.newUnits,
    mixed: queues.mixed,
  };

  for (const bucket of order) {
    const cost = adaptivePlannerConfig.minutesPerItem[bucket];
    const maxByTime = Math.floor(remaining / cost);
    const take = Math.min(
      available[bucket],
      maxByTime,
      bucket === "new" ? 2 : 20,
    );
    allocation[bucket] = Math.max(0, take);
    remaining -= take * cost;
    if (remaining < 4) break;
  }

  let estimatedItems = Object.values(allocation).reduce((a, b) => a + b, 0);
  estimatedItems = Math.min(
    estimatedItems,
    adaptivePlannerConfig.hardMaxItemsPerDay,
  );
  if (estimatedItems === 0) estimatedItems = Math.max(1, Math.floor(budgetMinutes / 5));

  const estimateCs =
    estimatedItems === 1
      ? "Dnes zvládneš přibližně 1 položku."
      : estimatedItems >= 2 && estimatedItems <= 4
        ? `Dnes zvládneš přibližně ${estimatedItems} položky.`
        : `Dnes zvládneš přibližně ${estimatedItems} položek.`;

  return { estimatedItems, estimateCs, allocation };
}

export type AdaptiveDayPlanInput = {
  mode: AdaptivePlannerMode;
  dailyMinutes: number;
  daysRemaining: number;
  queues: AdaptiveQueueCounts;
  missedDays?: number;
  /** Soft note when replanning after a gap — never guilt. */
  replannedAfterMiss?: boolean;
};

export type AdaptiveDayPlanMeta = {
  mode: AdaptivePlannerMode;
  budgetMinutes: number;
  estimatedItems: number;
  estimateCs: string;
  allocation: Record<AdaptiveMissionBucket, number>;
  replanNoteCs: string | null;
  compositionCs: string;
};

export function buildAdaptiveDayPlanMeta(
  input: AdaptiveDayPlanInput,
): AdaptiveDayPlanMeta {
  const budgetMinutes = resolvePlannerModeMinutes(input.mode, {
    dailyMinutes: input.dailyMinutes,
    daysRemaining: input.daysRemaining,
    overdueCount: input.queues.overdue,
    openMistakesCount: input.queues.mistakes,
    fragileCount: input.queues.fragile,
    newAvailable: input.queues.newUnits,
    missedDays: input.missedDays,
  });
  const { estimatedItems, estimateCs, allocation } = estimateItemsForBudget(
    budgetMinutes,
    input.queues,
  );

  const parts: string[] = [];
  if (allocation.overdue) parts.push(`${allocation.overdue} splatných`);
  if (allocation.mistakes) parts.push(`${allocation.mistakes} chyb`);
  if (allocation.fragile) parts.push(`${allocation.fragile} křehkých`);
  if (allocation.new) parts.push(`${allocation.new} nových`);
  if (allocation.mixed) parts.push(`${allocation.mixed} mix`);

  const replanNoteCs = input.replannedAfterMiss
    ? "Mise je znovu sestavená podle dnešního času a fronty — vynechaný den se nepočítá jako trest."
    : null;

  return {
    mode: input.mode,
    budgetMinutes,
    estimatedItems,
    estimateCs,
    allocation,
    replanNoteCs,
    compositionCs:
      parts.length > 0
        ? `Skladba: ${parts.join(" · ")}.`
        : "Skladba: krátká studijní session.",
  };
}

/** Convert allocation into mission signal counts for the daily dashboard. */
export function adaptiveMetaToMissionSignals(meta: AdaptiveDayPlanMeta): {
  overdueCount: number;
  openMistakesCount: number;
  fragileCount: number;
  plannedNewCount: number;
  mixedCount: number;
  estimatedItems: number;
  estimateCs: string;
  budgetMinutes: number;
  plannerMode: AdaptivePlannerMode;
  replanNoteCs: string | null;
  compositionCs: string;
} {
  return {
    overdueCount: meta.allocation.overdue,
    openMistakesCount: meta.allocation.mistakes,
    fragileCount: meta.allocation.fragile,
    plannedNewCount: meta.allocation.new,
    mixedCount: meta.allocation.mixed,
    estimatedItems: meta.estimatedItems,
    estimateCs: meta.estimateCs,
    budgetMinutes: meta.budgetMinutes,
    plannerMode: meta.mode,
    replanNoteCs: meta.replanNoteCs,
    compositionCs: meta.compositionCs,
  };
}

export function missedDaysFromStreak(
  lastCompletedDateKey: string | null,
  todayKey: string,
): number {
  if (!lastCompletedDateKey) return 0;
  const prev = new Date(`${lastCompletedDateKey}T12:00:00`);
  const cur = new Date(`${todayKey}T12:00:00`);
  const diff = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
  return Math.max(0, diff - 1);
}
