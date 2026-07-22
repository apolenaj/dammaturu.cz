/**
 * Privacy-conscious product analytics — learning funnel (extends D-062).
 * Allowlisted metadata only. No student content / PII.
 *
 * Spec: docs/PRODUCT_ANALYTICS.md
 */

import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

export const PRODUCT_ANALYTICS_ALLOWED = [
  "opaque learner key (hashed on export/admin display)",
  "funnel step / milestone from allowlist",
  "plan id / feature flag key",
  "counts, minutes, mastery delta (numbers)",
  "topic slug id (not text content)",
  "answer result enum (correct/partial/wrong) — never free text",
  "dateKey + timestamp",
] as const;

export const PRODUCT_ANALYTICS_DENIED = [
  "email / name / phone",
  "uploaded document text / filenames with PII",
  "free-text answers / voice transcripts",
  "IP / user-agent / device fingerprint",
  "payment card data",
  "raw school documents",
] as const;

/**
 * Primary learning conversion funnel:
 * Homepage → Start → First material → First answer → First lesson completed → Return next day
 */
export const productFunnelSteps = [
  "homepage",
  "start",
  "first_material",
  "first_answer",
  "first_lesson_complete",
  "return_next_day",
] as const;

export type ProductFunnelStep = (typeof productFunnelSteps)[number];

/** Primary learning-funnel events + legacy product events (still accepted). */
export const productEventNames = [
  // Learning funnel
  "homepage_view",
  "guest_start",
  "czech_hub_view",
  "material_open",
  "lesson_start",
  "retrieval_attempt",
  "answer_correct",
  "answer_partial",
  "answer_wrong",
  "feedback_view",
  "lesson_complete",
  "test_start",
  "test_complete",
  "review_start",
  "review_complete",
  "mistake_relearned",
  "simulation_start",
  "simulation_complete",
  // Legacy (back-compat)
  "homepage_viewed",
  "registration_completed",
  "onboarding_completed",
  "document_uploaded",
  "first_document_uploaded",
  "study_session_started",
  "first_study_session",
  "question_answered",
  "first_10_questions",
  "app_opened",
  "day_2_return",
  "day_7_return",
  "mock_exam_completed",
  "first_mock_exam",
  "upgrade_started",
  "upgrade_completed",
  "mastery_improved",
  "weak_topic_seen",
  "study_minutes",
] as const;

export type ProductEventName = (typeof productEventNames)[number];

/** Events safe to accept from the anonymous client beacon. */
export const clientBeaconEventNames = [
  "homepage_view",
  "homepage_viewed",
  "guest_start",
  "czech_hub_view",
  "feedback_view",
  "lesson_complete",
] as const;

export type ClientBeaconEventName = (typeof clientBeaconEventNames)[number];

export const productEventSchema = z.object({
  id: z.string().uuid(),
  /** Opaque learner key — null for anonymous homepage. */
  learnerKey: z.string().min(1).max(64).nullable(),
  event: z.enum(productEventNames),
  funnelStep: z.enum(productFunnelSteps).optional(),
  planId: z.string().min(1).max(32).optional(),
  featureId: z.string().min(1).max(80).optional(),
  topicSlug: z.string().min(1).max(120).optional(),
  correct: z.boolean().optional(),
  count: z.number().int().min(0).max(100_000).optional(),
  minutes: z.number().int().min(0).max(480).optional(),
  masteryDelta: z.number().min(-100).max(100).optional(),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  at: z.string().datetime(),
});

export type ProductEvent = z.infer<typeof productEventSchema>;

export function parseProductEvent(raw: unknown): ProductEvent {
  return productEventSchema.parse(raw);
}

export function dateKeyFromIso(iso: string): string {
  return iso.slice(0, 10);
}

export function anonymizeLearnerKey(
  learnerKey: string,
  salt = process.env.ANALYTICS_EXPORT_SALT ?? "dammaturu-analytics",
): string {
  return createHash("sha256")
    .update(`${salt}:${learnerKey}`)
    .digest("hex")
    .slice(0, 16);
}

/** Per-learner milestone / retention state — no content. */
export const productLearnerStateSchema = z.object({
  learnerKey: z.string().min(1).max(64),
  firstSeenAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  registeredAt: z.string().datetime().nullable().default(null),
  onboardingCompletedAt: z.string().datetime().nullable().default(null),
  firstDocumentAt: z.string().datetime().nullable().default(null),
  firstStudySessionAt: z.string().datetime().nullable().default(null),
  questionsAnswered: z.number().int().min(0).max(1_000_000).default(0),
  first10QuestionsAt: z.string().datetime().nullable().default(null),
  day2ReturnAt: z.string().datetime().nullable().default(null),
  day7ReturnAt: z.string().datetime().nullable().default(null),
  firstMockExamAt: z.string().datetime().nullable().default(null),
  upgradedAt: z.string().datetime().nullable().default(null),
  studyMinutesTotal: z.number().int().min(0).max(1_000_000).default(0),
  masteryImprovementSum: z.number().min(-100_000).max(100_000).default(0),
  weakTopicHits: z.record(z.string(), z.number().int().min(0)).default({}),
  // Learning funnel
  guestStartedAt: z.string().datetime().nullable().default(null),
  firstMaterialAt: z.string().datetime().nullable().default(null),
  firstAnswerAt: z.string().datetime().nullable().default(null),
  firstLessonCompleteAt: z.string().datetime().nullable().default(null),
  firstLearningInteractionAt: z.string().datetime().nullable().default(null),
  returnNextDayAt: z.string().datetime().nullable().default(null),
  lessonsStarted: z.number().int().min(0).max(1_000_000).default(0),
  lessonsCompleted: z.number().int().min(0).max(1_000_000).default(0),
  reviewsStarted: z.number().int().min(0).max(1_000_000).default(0),
  reviewsCompleted: z.number().int().min(0).max(1_000_000).default(0),
  mistakesLogged: z.number().int().min(0).max(1_000_000).default(0),
  mistakesRelearned: z.number().int().min(0).max(1_000_000).default(0),
  topicOpens: z.record(z.string(), z.number().int().min(0)).default({}),
  topicCompletes: z.record(z.string(), z.number().int().min(0)).default({}),
  updatedAt: z.string().datetime(),
});

export type ProductLearnerState = z.infer<typeof productLearnerStateSchema>;

export function emptyProductLearnerState(
  learnerKey: string,
  nowIso: string,
): ProductLearnerState {
  return productLearnerStateSchema.parse({
    learnerKey,
    firstSeenAt: nowIso,
    lastSeenAt: nowIso,
    registeredAt: null,
    onboardingCompletedAt: null,
    firstDocumentAt: null,
    firstStudySessionAt: null,
    questionsAnswered: 0,
    first10QuestionsAt: null,
    day2ReturnAt: null,
    day7ReturnAt: null,
    firstMockExamAt: null,
    upgradedAt: null,
    studyMinutesTotal: 0,
    masteryImprovementSum: 0,
    weakTopicHits: {},
    guestStartedAt: null,
    firstMaterialAt: null,
    firstAnswerAt: null,
    firstLessonCompleteAt: null,
    firstLearningInteractionAt: null,
    returnNextDayAt: null,
    lessonsStarted: 0,
    lessonsCompleted: 0,
    reviewsStarted: 0,
    reviewsCompleted: 0,
    mistakesLogged: 0,
    mistakesRelearned: 0,
    topicOpens: {},
    topicCompletes: {},
    updatedAt: nowIso,
  });
}

export function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso.slice(0, 10) + "T12:00:00.000Z").getTime();
  const b = new Date(bIso.slice(0, 10) + "T12:00:00.000Z").getTime();
  return Math.floor((b - a) / 86_400_000);
}

export function secondsBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.max(0, Math.round((b - a) / 1000));
}

export type ProductEventInput = {
  learnerKey?: string | null;
  event: ProductEventName;
  funnelStep?: ProductFunnelStep;
  planId?: string;
  featureId?: string;
  topicSlug?: string;
  correct?: boolean;
  count?: number;
  minutes?: number;
  masteryDelta?: number;
  at?: string;
};

export function buildProductEvent(input: ProductEventInput): ProductEvent {
  const at = input.at ?? new Date().toISOString();
  return productEventSchema.parse({
    id: randomUUID(),
    learnerKey: input.learnerKey ?? null,
    event: input.event,
    funnelStep: input.funnelStep,
    planId: input.planId,
    featureId: input.featureId,
    topicSlug: input.topicSlug,
    correct: input.correct,
    count: input.count,
    minutes: input.minutes,
    masteryDelta: input.masteryDelta,
    dateKey: dateKeyFromIso(at),
    at,
  });
}

export type FunnelStepStats = {
  step: ProductFunnelStep;
  labelCs: string;
  count: number;
  conversionFromPrevPct: number | null;
};

export type TopicAbandonmentRow = {
  topicSlug: string;
  opens: number;
  completes: number;
  abandonPct: number;
};

export type LearningFunnelMetrics = {
  /** Median seconds from firstSeen → first learning interaction. */
  timeToFirstInteractionSecMedian: number | null;
  lessonCompletionPct: number | null;
  returnNextDayPct: number | null;
  returnNextDayEligible: number;
  returnNextDayCount: number;
  mistakesCorrectedPct: number | null;
  reviewCompletionPct: number | null;
  topicAbandonment: TopicAbandonmentRow[];
};

export type ProductOutcomesSummary = {
  questionsAnswered: number;
  questionsCorrectPct: number | null;
  studyMinutes: number;
  masteryImprovementSum: number;
  weakTopics: Array<{ topicSlug: string; hits: number }>;
  retention: {
    day2Returners: number;
    day7Returners: number;
    eligibleForDay2: number;
    eligibleForDay7: number;
    day2Pct: number | null;
    day7Pct: number | null;
  };
  learning: LearningFunnelMetrics;
};

export type ProductAnalyticsDashboard = {
  generatedAt: string;
  eventCount: number;
  learnerCount: number;
  funnel: FunnelStepStats[];
  outcomes: ProductOutcomesSummary;
  privacyNoteCs: string;
  deniedCs: string[];
};

const FUNNEL_LABELS: Record<ProductFunnelStep, string> = {
  homepage: "Homepage",
  start: "Start (guest)",
  first_material: "První materiál",
  first_answer: "První odpověď",
  first_lesson_complete: "První lekce hotová",
  return_next_day: "Návrat další den",
};

const FUNNEL_EVENT: Partial<Record<ProductEventName, ProductFunnelStep>> = {
  homepage_view: "homepage",
  homepage_viewed: "homepage",
  guest_start: "start",
  material_open: "first_material",
  retrieval_attempt: "first_answer",
  answer_correct: "first_answer",
  answer_partial: "first_answer",
  answer_wrong: "first_answer",
  lesson_complete: "first_lesson_complete",
  // Legacy maps into closest learning step where useful
  study_session_started: "first_material",
  first_study_session: "first_material",
  question_answered: "first_answer",
  day_2_return: "return_next_day",
};

function touchLearningInteraction(
  next: ProductLearnerState,
  at: string,
): void {
  if (!next.firstLearningInteractionAt) {
    next.firstLearningInteractionAt = at;
  }
}

function maybeReturnNextDay(
  next: ProductLearnerState,
  at: string,
  milestones: ProductEventInput[],
): void {
  const age = daysBetween(next.firstSeenAt, at);
  if (age >= 1 && !next.returnNextDayAt) {
    next.returnNextDayAt = at;
    milestones.push({
      event: "day_2_return",
      funnelStep: "return_next_day",
      at,
    });
  }
}

function bumpTopic(
  map: Record<string, number>,
  topicSlug: string | undefined,
  by = 1,
): void {
  if (!topicSlug) return;
  map[topicSlug] = (map[topicSlug] ?? 0) + by;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

export function buildProductAnalyticsDashboard(
  events: ProductEvent[],
  states: ProductLearnerState[],
  nowIso = new Date().toISOString(),
): ProductAnalyticsDashboard {
  const stepCounts = Object.fromEntries(
    productFunnelSteps.map((s) => [s, 0]),
  ) as Record<ProductFunnelStep, number>;

  // Prefer unique learners per funnel milestone from state when available
  const stateStepLearners: Partial<Record<ProductFunnelStep, Set<string>>> = {
    start: new Set(),
    first_material: new Set(),
    first_answer: new Set(),
    first_lesson_complete: new Set(),
    return_next_day: new Set(),
  };

  let questionsAnswered = 0;
  let questionsCorrect = 0;
  let questionsWithCorrect = 0;
  let studyMinutes = 0;
  let masteryImprovementSum = 0;
  const weakHits = new Map<string, number>();

  let lessonsStarted = 0;
  let lessonsCompleted = 0;
  let reviewsStarted = 0;
  let reviewsCompleted = 0;
  let mistakesLogged = 0;
  let mistakesRelearned = 0;

  for (const e of events) {
    const step = e.funnelStep ?? FUNNEL_EVENT[e.event];
    if (step === "homepage") stepCounts.homepage += 1;

    if (e.event === "question_answered" || e.event === "retrieval_attempt") {
      questionsAnswered += e.count ?? 1;
    }
    if (
      e.event === "answer_correct" ||
      e.event === "answer_partial" ||
      e.event === "answer_wrong" ||
      e.event === "question_answered"
    ) {
      if (typeof e.correct === "boolean") {
        questionsWithCorrect += 1;
        if (e.correct) questionsCorrect += 1;
      } else if (e.event === "answer_correct") {
        questionsWithCorrect += 1;
        questionsCorrect += 1;
      } else if (
        e.event === "answer_partial" ||
        e.event === "answer_wrong"
      ) {
        questionsWithCorrect += 1;
      }
    }
    if (e.event === "study_minutes" && e.minutes) {
      studyMinutes += e.minutes;
    }
    if (e.event === "mastery_improved" && e.masteryDelta) {
      masteryImprovementSum += e.masteryDelta;
    }
    if (e.event === "weak_topic_seen" && e.topicSlug) {
      weakHits.set(
        e.topicSlug,
        (weakHits.get(e.topicSlug) ?? 0) + (e.count ?? 1),
      );
    }
    if (e.event === "lesson_start") lessonsStarted += e.count ?? 1;
    if (e.event === "lesson_complete") lessonsCompleted += e.count ?? 1;
    if (e.event === "review_start") reviewsStarted += e.count ?? 1;
    if (e.event === "review_complete") reviewsCompleted += e.count ?? 1;
    if (e.event === "answer_wrong" || e.event === "answer_partial") {
      mistakesLogged += e.count ?? 1;
    }
    if (e.event === "mistake_relearned") {
      mistakesRelearned += e.count ?? 1;
    }
  }

  for (const s of states) {
    if (s.guestStartedAt) stateStepLearners.start?.add(s.learnerKey);
    if (s.firstMaterialAt) stateStepLearners.first_material?.add(s.learnerKey);
    if (s.firstAnswerAt) stateStepLearners.first_answer?.add(s.learnerKey);
    if (s.firstLessonCompleteAt) {
      stateStepLearners.first_lesson_complete?.add(s.learnerKey);
    }
    if (s.returnNextDayAt) {
      stateStepLearners.return_next_day?.add(s.learnerKey);
    }
    lessonsStarted = Math.max(lessonsStarted, 0);
    // Prefer state totals when richer
    if (s.lessonsStarted) lessonsStarted += 0; // summed below
  }

  const stateLessonsStarted = states.reduce((n, s) => n + s.lessonsStarted, 0);
  const stateLessonsCompleted = states.reduce(
    (n, s) => n + s.lessonsCompleted,
    0,
  );
  const stateReviewsStarted = states.reduce((n, s) => n + s.reviewsStarted, 0);
  const stateReviewsCompleted = states.reduce(
    (n, s) => n + s.reviewsCompleted,
    0,
  );
  const stateMistakesLogged = states.reduce((n, s) => n + s.mistakesLogged, 0);
  const stateMistakesRelearned = states.reduce(
    (n, s) => n + s.mistakesRelearned,
    0,
  );

  if (stateLessonsStarted > 0) lessonsStarted = stateLessonsStarted;
  if (stateLessonsCompleted > 0) lessonsCompleted = stateLessonsCompleted;
  if (stateReviewsStarted > 0) reviewsStarted = stateReviewsStarted;
  if (stateReviewsCompleted > 0) reviewsCompleted = stateReviewsCompleted;
  if (stateMistakesLogged > 0) mistakesLogged = stateMistakesLogged;
  if (stateMistakesRelearned > 0) mistakesRelearned = stateMistakesRelearned;

  stepCounts.start = stateStepLearners.start?.size ?? 0;
  stepCounts.first_material = stateStepLearners.first_material?.size ?? 0;
  stepCounts.first_answer = stateStepLearners.first_answer?.size ?? 0;
  stepCounts.first_lesson_complete =
    stateStepLearners.first_lesson_complete?.size ?? 0;
  stepCounts.return_next_day = stateStepLearners.return_next_day?.size ?? 0;

  // Fall back to event counts when no learner states yet
  if (states.length === 0) {
    for (const e of events) {
      const step = e.funnelStep ?? FUNNEL_EVENT[e.event];
      if (step && step !== "homepage") stepCounts[step] += 1;
    }
  }

  if (states.length > 0) {
    const stateMinutes = states.reduce((n, s) => n + s.studyMinutesTotal, 0);
    const stateMastery = states.reduce(
      (n, s) => n + s.masteryImprovementSum,
      0,
    );
    if (stateMinutes > 0) studyMinutes = stateMinutes;
    if (stateMastery !== 0) masteryImprovementSum = stateMastery;
    for (const s of states) {
      for (const [slug, hits] of Object.entries(s.weakTopicHits)) {
        weakHits.set(slug, Math.max(weakHits.get(slug) ?? 0, hits));
      }
    }
  }

  const funnel: FunnelStepStats[] = [];
  let prev: number | null = null;
  for (const step of productFunnelSteps) {
    const count = stepCounts[step];
    funnel.push({
      step,
      labelCs: FUNNEL_LABELS[step],
      count,
      conversionFromPrevPct:
        prev != null && prev > 0 ? Math.round((100 * count) / prev) : null,
    });
    prev = count;
  }

  const now = nowIso;
  let eligibleForDay2 = 0;
  let eligibleForDay7 = 0;
  let day2Returners = 0;
  let day7Returners = 0;
  let returnEligible = 0;
  let returnCount = 0;
  const ttfi: number[] = [];

  for (const s of states) {
    const age = daysBetween(s.firstSeenAt, now);
    if (age >= 2) {
      eligibleForDay2 += 1;
      if (s.day2ReturnAt || s.returnNextDayAt) day2Returners += 1;
    }
    if (age >= 7) {
      eligibleForDay7 += 1;
      if (s.day7ReturnAt) day7Returners += 1;
    }
    if (age >= 1) {
      returnEligible += 1;
      if (s.returnNextDayAt) returnCount += 1;
    }
    if (s.firstLearningInteractionAt) {
      ttfi.push(
        secondsBetween(s.firstSeenAt, s.firstLearningInteractionAt),
      );
    }
  }

  const topicOpenAgg = new Map<string, number>();
  const topicCompleteAgg = new Map<string, number>();
  for (const s of states) {
    for (const [slug, n] of Object.entries(s.topicOpens)) {
      topicOpenAgg.set(slug, (topicOpenAgg.get(slug) ?? 0) + n);
    }
    for (const [slug, n] of Object.entries(s.topicCompletes)) {
      topicCompleteAgg.set(slug, (topicCompleteAgg.get(slug) ?? 0) + n);
    }
  }
  const topicAbandonment: TopicAbandonmentRow[] = [...topicOpenAgg.entries()]
    .map(([topicSlug, opens]) => {
      const completes = topicCompleteAgg.get(topicSlug) ?? 0;
      const abandonPct =
        opens > 0
          ? Math.round((100 * Math.max(0, opens - completes)) / opens)
          : 0;
      return { topicSlug, opens, completes, abandonPct };
    })
    .filter((r) => r.opens > r.completes)
    .sort((a, b) => b.abandonPct - a.abandonPct || b.opens - a.opens)
    .slice(0, 12);

  const weakTopics = [...weakHits.entries()]
    .map(([topicSlug, hits]) => ({ topicSlug, hits }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 12);

  const learnerKeys = new Set(
    [
      ...events.map((e) => e.learnerKey).filter(Boolean),
      ...states.map((s) => s.learnerKey),
    ] as string[],
  );

  const pct = (num: number, den: number): number | null =>
    den > 0 ? Math.round((100 * num) / den) : null;

  return {
    generatedAt: nowIso,
    eventCount: events.length,
    learnerCount: learnerKeys.size,
    funnel,
    outcomes: {
      questionsAnswered:
        questionsAnswered ||
        states.reduce((n, s) => n + s.questionsAnswered, 0),
      questionsCorrectPct:
        questionsWithCorrect > 0
          ? Math.round((100 * questionsCorrect) / questionsWithCorrect)
          : null,
      studyMinutes,
      masteryImprovementSum: Math.round(masteryImprovementSum * 10) / 10,
      weakTopics,
      retention: {
        day2Returners,
        day7Returners,
        eligibleForDay2,
        eligibleForDay7,
        day2Pct: pct(day2Returners, eligibleForDay2),
        day7Pct: pct(day7Returners, eligibleForDay7),
      },
      learning: {
        timeToFirstInteractionSecMedian: median(ttfi),
        lessonCompletionPct: pct(lessonsCompleted, lessonsStarted),
        returnNextDayPct: pct(returnCount, returnEligible),
        returnNextDayEligible: returnEligible,
        returnNextDayCount: returnCount,
        mistakesCorrectedPct: pct(mistakesRelearned, mistakesLogged),
        reviewCompletionPct: pct(reviewsCompleted, reviewsStarted),
        topicAbandonment,
      },
    },
    privacyNoteCs:
      "Product analytics ukládá jen allowlistová metadata (funnel, slugy, výsledky správnosti). Žádný text odpovědí, obsah dokumentů ani PII. Learner klíče se v exportu hashují.",
    deniedCs: [...PRODUCT_ANALYTICS_DENIED],
  };
}

export function newEventId(): string {
  return randomUUID();
}

/**
 * Apply a product event to learner state; return milestone events to emit.
 * Never stores content — only counts, timestamps, topic slugs.
 */
export function applyProductEventToState(
  state: ProductLearnerState,
  event: ProductEvent,
): { state: ProductLearnerState; milestones: ProductEventInput[] } {
  const at = event.at;
  const milestones: ProductEventInput[] = [];
  const next: ProductLearnerState = {
    ...state,
    lastSeenAt: at > state.lastSeenAt ? at : state.lastSeenAt,
    firstSeenAt: state.firstSeenAt || at,
    updatedAt: at,
    weakTopicHits: { ...state.weakTopicHits },
    topicOpens: { ...state.topicOpens },
    topicCompletes: { ...state.topicCompletes },
  };

  switch (event.event) {
    case "homepage_view":
    case "homepage_viewed":
      break;

    case "guest_start":
      if (!next.guestStartedAt) next.guestStartedAt = at;
      maybeReturnNextDay(next, at, milestones);
      break;

    case "czech_hub_view":
      touchLearningInteraction(next, at);
      maybeReturnNextDay(next, at, milestones);
      break;

    case "material_open":
      touchLearningInteraction(next, at);
      bumpTopic(next.topicOpens, event.topicSlug);
      if (!next.firstMaterialAt) {
        next.firstMaterialAt = at;
      }
      maybeReturnNextDay(next, at, milestones);
      break;

    case "lesson_start":
    case "study_session_started":
      touchLearningInteraction(next, at);
      next.lessonsStarted += event.count ?? 1;
      bumpTopic(next.topicOpens, event.topicSlug);
      if (!next.firstMaterialAt) next.firstMaterialAt = at;
      if (!next.firstStudySessionAt) {
        next.firstStudySessionAt = at;
        milestones.push({
          event: "first_study_session",
          featureId: event.featureId,
          at,
        });
      }
      maybeReturnNextDay(next, at, milestones);
      break;

    case "retrieval_attempt":
      touchLearningInteraction(next, at);
      next.questionsAnswered += event.count ?? 1;
      if (!next.firstAnswerAt) next.firstAnswerAt = at;
      maybeReturnNextDay(next, at, milestones);
      break;

    case "answer_correct":
    case "answer_partial":
    case "answer_wrong":
    case "question_answered": {
      touchLearningInteraction(next, at);
      const add = event.count ?? 1;
      const before = next.questionsAnswered;
      if (event.event === "question_answered") {
        next.questionsAnswered = before + add;
      } else {
        // answer_* usually paired with retrieval_attempt; still count for legacy-only paths
        if (before === 0) next.questionsAnswered = add;
      }
      if (!next.firstAnswerAt) next.firstAnswerAt = at;
      if (
        event.event === "answer_wrong" ||
        event.event === "answer_partial" ||
        (event.event === "question_answered" && event.correct === false)
      ) {
        next.mistakesLogged += add;
      }
      if (
        before < 10 &&
        next.questionsAnswered >= 10 &&
        !next.first10QuestionsAt
      ) {
        next.first10QuestionsAt = at;
        milestones.push({
          event: "first_10_questions",
          count: next.questionsAnswered,
          at,
        });
      }
      maybeReturnNextDay(next, at, milestones);
      break;
    }

    case "feedback_view":
      break;

    case "lesson_complete":
      next.lessonsCompleted += event.count ?? 1;
      bumpTopic(next.topicCompletes, event.topicSlug);
      if (!next.firstLessonCompleteAt) next.firstLessonCompleteAt = at;
      maybeReturnNextDay(next, at, milestones);
      break;

    case "test_start":
      touchLearningInteraction(next, at);
      maybeReturnNextDay(next, at, milestones);
      break;

    case "test_complete":
      maybeReturnNextDay(next, at, milestones);
      break;

    case "review_start":
      next.reviewsStarted += event.count ?? 1;
      touchLearningInteraction(next, at);
      maybeReturnNextDay(next, at, milestones);
      break;

    case "review_complete":
      next.reviewsCompleted += event.count ?? 1;
      maybeReturnNextDay(next, at, milestones);
      break;

    case "mistake_relearned":
      next.mistakesRelearned += event.count ?? 1;
      maybeReturnNextDay(next, at, milestones);
      break;

    case "simulation_start":
    case "simulation_complete":
      touchLearningInteraction(next, at);
      maybeReturnNextDay(next, at, milestones);
      break;

    case "registration_completed":
      if (!next.registeredAt) next.registeredAt = at;
      break;
    case "onboarding_completed":
      if (!next.onboardingCompletedAt) next.onboardingCompletedAt = at;
      break;
    case "document_uploaded":
      if (!next.firstDocumentAt) {
        next.firstDocumentAt = at;
        milestones.push({
          event: "first_document_uploaded",
          at,
        });
      }
      if (!next.firstMaterialAt) next.firstMaterialAt = at;
      break;
    case "first_document_uploaded":
      if (!next.firstDocumentAt) next.firstDocumentAt = at;
      break;
    case "first_study_session":
      if (!next.firstStudySessionAt) next.firstStudySessionAt = at;
      break;
    case "app_opened": {
      const age = daysBetween(next.firstSeenAt, at);
      maybeReturnNextDay(next, at, milestones);
      if (age >= 2 && !next.day2ReturnAt) {
        next.day2ReturnAt = at;
      }
      if (age >= 7 && !next.day7ReturnAt) {
        next.day7ReturnAt = at;
        milestones.push({
          event: "day_7_return",
          at,
        });
      }
      break;
    }
    case "mock_exam_completed":
      if (!next.firstMockExamAt) {
        next.firstMockExamAt = at;
        milestones.push({
          event: "first_mock_exam",
          topicSlug: event.topicSlug,
          at,
        });
      }
      break;
    case "first_mock_exam":
      if (!next.firstMockExamAt) next.firstMockExamAt = at;
      break;
    case "first_10_questions":
      if (!next.first10QuestionsAt) next.first10QuestionsAt = at;
      break;
    case "day_2_return":
      if (!next.day2ReturnAt) next.day2ReturnAt = at;
      if (!next.returnNextDayAt) next.returnNextDayAt = at;
      break;
    case "day_7_return":
      if (!next.day7ReturnAt) next.day7ReturnAt = at;
      break;
    case "upgrade_completed":
      if (!next.upgradedAt) next.upgradedAt = at;
      break;
    case "study_minutes":
      next.studyMinutesTotal += event.minutes ?? 0;
      break;
    case "mastery_improved":
      next.masteryImprovementSum += event.masteryDelta ?? 0;
      break;
    case "weak_topic_seen":
      if (event.topicSlug) {
        const hits = event.count ?? 1;
        next.weakTopicHits[event.topicSlug] =
          (next.weakTopicHits[event.topicSlug] ?? 0) + hits;
      }
      break;
    default:
      break;
  }

  return { state: productLearnerStateSchema.parse(next), milestones };
}

export function funnelStepForEvent(
  event: ProductEventName,
): ProductFunnelStep | undefined {
  return FUNNEL_EVENT[event];
}

export function answerEventForResult(
  result: "correct" | "partial" | "incorrect" | "wrong",
): Extract<
  ProductEventName,
  "answer_correct" | "answer_partial" | "answer_wrong"
> {
  if (result === "correct") return "answer_correct";
  if (result === "partial") return "answer_partial";
  return "answer_wrong";
}

export function buildAnonymizedProductExport(
  events: ProductEvent[],
  states: ProductLearnerState[],
): {
  exportedAt: string;
  privacyNoteCs: string;
  deniedCs: string[];
  events: Array<
    Omit<ProductEvent, "learnerKey"> & { learnerKeyHash: string | null }
  >;
  states: Array<
    Omit<ProductLearnerState, "learnerKey"> & { learnerKeyHash: string }
  >;
} {
  return {
    exportedAt: new Date().toISOString(),
    privacyNoteCs:
      "Anonymizovaný export product analytics — learner klíče hashované, bez obsahu.",
    deniedCs: [...PRODUCT_ANALYTICS_DENIED],
    events: events.map(({ learnerKey, ...rest }) => ({
      ...rest,
      learnerKeyHash: learnerKey ? anonymizeLearnerKey(learnerKey) : null,
    })),
    states: states.map(({ learnerKey, ...rest }) => ({
      ...rest,
      learnerKeyHash: anonymizeLearnerKey(learnerKey),
    })),
  };
}
