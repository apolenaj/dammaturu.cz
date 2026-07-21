import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

/**
 * Privacy-conscious product analytics (D-062).
 * Funnel + learning outcomes for internal admin — no student content.
 */

export const PRODUCT_ANALYTICS_ALLOWED = [
  "opaque learner key (hashed on export/admin display)",
  "funnel step / milestone from allowlist",
  "plan id / feature flag key",
  "counts, minutes, mastery delta (numbers)",
  "topic slug id (not text content)",
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

/** Acquisition + activation funnel steps. */
export const productFunnelSteps = [
  "homepage",
  "registration",
  "onboarding_completed",
  "first_document_uploaded",
  "first_study_session",
  "first_10_questions",
  "day_2_return",
  "day_7_return",
  "first_mock_exam",
  "upgrade",
] as const;

export type ProductFunnelStep = (typeof productFunnelSteps)[number];

export const productEventNames = [
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

export const productEventSchema = z.object({
  id: z.string().uuid(),
  /** Opaque learner key — null for anonymous homepage. */
  learnerKey: z.string().min(1).max(64).nullable(),
  event: z.enum(productEventNames),
  funnelStep: z.enum(productFunnelSteps).optional(),
  /** Billing plan id if relevant — never payment details. */
  planId: z.string().min(1).max(32).optional(),
  /** Feature / method id — not content. */
  featureId: z.string().min(1).max(80).optional(),
  /** Topic slug only — never excerpt. */
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
  updatedAt: z.string().datetime(),
});

export type ProductLearnerState = z.infer<typeof productLearnerStateSchema>;

export function emptyProductLearnerState(
  learnerKey: string,
  nowIso: string,
): ProductLearnerState {
  return {
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
    updatedAt: nowIso,
  };
}

export function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso.slice(0, 10) + "T12:00:00.000Z").getTime();
  const b = new Date(bIso.slice(0, 10) + "T12:00:00.000Z").getTime();
  return Math.floor((b - a) / 86_400_000);
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
  /** Conversion from previous step (0–100), null for first. */
  conversionFromPrevPct: number | null;
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
  registration: "Registrace",
  onboarding_completed: "Onboarding hotový",
  first_document_uploaded: "První dokument",
  first_study_session: "První studijní session",
  first_10_questions: "Prvních 10 otázek",
  day_2_return: "Návrat den 2",
  day_7_return: "Návrat den 7",
  first_mock_exam: "První maturita nanečisto",
  upgrade: "Upgrade",
};

const FUNNEL_EVENT: Partial<Record<ProductEventName, ProductFunnelStep>> = {
  homepage_viewed: "homepage",
  registration_completed: "registration",
  onboarding_completed: "onboarding_completed",
  first_document_uploaded: "first_document_uploaded",
  first_study_session: "first_study_session",
  first_10_questions: "first_10_questions",
  day_2_return: "day_2_return",
  day_7_return: "day_7_return",
  first_mock_exam: "first_mock_exam",
  upgrade_completed: "upgrade",
};

export function buildProductAnalyticsDashboard(
  events: ProductEvent[],
  states: ProductLearnerState[],
  nowIso = new Date().toISOString(),
): ProductAnalyticsDashboard {
  const stepCounts = Object.fromEntries(
    productFunnelSteps.map((s) => [s, 0]),
  ) as Record<ProductFunnelStep, number>;

  let questionsAnswered = 0;
  let questionsCorrect = 0;
  let questionsWithCorrect = 0;
  let studyMinutes = 0;
  let masteryImprovementSum = 0;
  const weakHits = new Map<string, number>();

  for (const e of events) {
    const step = e.funnelStep ?? FUNNEL_EVENT[e.event];
    if (step) stepCounts[step] += 1;

    if (e.event === "question_answered") {
      questionsAnswered += e.count ?? 1;
      if (typeof e.correct === "boolean") {
        questionsWithCorrect += 1;
        if (e.correct) questionsCorrect += 1;
      }
    }
    if (e.event === "study_minutes" && e.minutes) {
      studyMinutes += e.minutes;
    }
    if (e.event === "mastery_improved" && e.masteryDelta) {
      masteryImprovementSum += e.masteryDelta;
    }
    if (e.event === "weak_topic_seen" && e.topicSlug) {
      weakHits.set(e.topicSlug, (weakHits.get(e.topicSlug) ?? 0) + (e.count ?? 1));
    }
  }

  // Prefer summed learner-state totals when present
  if (states.length > 0) {
    const stateMinutes = states.reduce((n, s) => n + s.studyMinutesTotal, 0);
    const stateMastery = states.reduce((n, s) => n + s.masteryImprovementSum, 0);
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
        prev != null && prev > 0
          ? Math.round((100 * count) / prev)
          : null,
    });
    prev = count;
  }

  const now = nowIso;
  let eligibleForDay2 = 0;
  let eligibleForDay7 = 0;
  let day2Returners = 0;
  let day7Returners = 0;
  for (const s of states) {
    const age = daysBetween(s.firstSeenAt, now);
    if (age >= 2) {
      eligibleForDay2 += 1;
      if (s.day2ReturnAt) day2Returners += 1;
    }
    if (age >= 7) {
      eligibleForDay7 += 1;
      if (s.day7ReturnAt) day7Returners += 1;
    }
  }

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
        day2Pct:
          eligibleForDay2 > 0
            ? Math.round((100 * day2Returners) / eligibleForDay2)
            : null,
        day7Pct:
          eligibleForDay7 > 0
            ? Math.round((100 * day7Returners) / eligibleForDay7)
            : null,
      },
    },
    privacyNoteCs:
      "Product analytics ukládá jen allowlistová metadata. Žádný text odpovědí, obsah dokumentů ani PII. Learner klíče se v exportu hashují.",
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
  let next: ProductLearnerState = {
    ...state,
    lastSeenAt: at > state.lastSeenAt ? at : state.lastSeenAt,
    firstSeenAt: state.firstSeenAt || at,
    updatedAt: at,
    weakTopicHits: { ...state.weakTopicHits },
  };

  switch (event.event) {
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
          funnelStep: "first_document_uploaded",
          at,
        });
      }
      break;
    case "first_document_uploaded":
      if (!next.firstDocumentAt) next.firstDocumentAt = at;
      break;
    case "study_session_started":
      if (!next.firstStudySessionAt) {
        next.firstStudySessionAt = at;
        milestones.push({
          event: "first_study_session",
          funnelStep: "first_study_session",
          featureId: event.featureId,
          at,
        });
      }
      break;
    case "first_study_session":
      if (!next.firstStudySessionAt) next.firstStudySessionAt = at;
      break;
    case "question_answered": {
      const add = event.count ?? 1;
      const before = next.questionsAnswered;
      next.questionsAnswered = before + add;
      if (before < 10 && next.questionsAnswered >= 10 && !next.first10QuestionsAt) {
        next.first10QuestionsAt = at;
        milestones.push({
          event: "first_10_questions",
          funnelStep: "first_10_questions",
          count: next.questionsAnswered,
          at,
        });
      }
      break;
    }
    case "app_opened": {
      const age = daysBetween(next.firstSeenAt, at);
      if (age >= 2 && !next.day2ReturnAt) {
        next.day2ReturnAt = at;
        milestones.push({
          event: "day_2_return",
          funnelStep: "day_2_return",
          at,
        });
      }
      if (age >= 7 && !next.day7ReturnAt) {
        next.day7ReturnAt = at;
        milestones.push({
          event: "day_7_return",
          funnelStep: "day_7_return",
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
          funnelStep: "first_mock_exam",
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

export function buildAnonymizedProductExport(
  events: ProductEvent[],
  states: ProductLearnerState[],
): {
  exportedAt: string;
  privacyNoteCs: string;
  deniedCs: string[];
  events: Array<Omit<ProductEvent, "learnerKey"> & { learnerKeyHash: string | null }>;
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
