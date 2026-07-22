import { z } from "zod";
import { createHash } from "node:crypto";

/**
 * Learning analytics (D-049).
 * Answers real learning questions — not vanity metrics.
 * Privacy-first: opaque keys, no free-text answers, no PII.
 */

export const LEARNING_ANALYTICS_ALLOWED = [
  "opaque learner key (hashed on export)",
  "event name from allowlist",
  "method / feature id",
  "topic / item slug",
  "boolean correct / rating enum",
  "durationMs / minutes",
  "mastery delta (number)",
  "dateKey + timestamp",
] as const;

export const LEARNING_ANALYTICS_DENIED = [
  "email / phone / name",
  "free-text answers",
  "voice / photos",
  "IP / device fingerprint",
  "school address",
  "payment data",
] as const;

/** Explicit learning events (product vocabulary). */
export const learningEventNames = [
  "lesson_started",
  "lesson_completed",
  "question_answered",
  "answer_correct",
  "answer_incorrect",
  "hint_used",
  "flashcard_rating",
  "review_completed",
  "mastery_changed",
  "study_plan_completed",
  "simulation_completed",
  "session_drop_off",
] as const;

export type LearningEventName = (typeof learningEventNames)[number];

export const learningMethods = [
  "lesson",
  "question_engine",
  "flashcards",
  "spaced_review",
  "teach_it_back",
  "active_recall",
  "simulation",
  "daily_mission",
  "other",
] as const;

export type LearningMethod = (typeof learningMethods)[number];

export const learningEventSchema = z.object({
  id: z.string().uuid(),
  /** Opaque learner id — never displayName/email. */
  learnerKey: z.string().min(1).max(64),
  event: z.enum(learningEventNames),
  method: z.enum(learningMethods),
  topicSlug: z.string().min(1).max(120).optional(),
  itemId: z.string().min(1).max(120).optional(),
  /** For question quality / accuracy. */
  correct: z.boolean().optional(),
  /** Flashcard SM-2 grade 0–5 or self-rating. */
  rating: z.number().int().min(0).max(5).optional(),
  hintsUsed: z.number().int().min(0).max(20).optional(),
  durationMs: z.number().int().min(0).max(3_600_000).optional(),
  minutes: z.number().int().min(0).max(480).optional(),
  /** Mastery score after change (0–100). */
  masteryScore: z.number().min(0).max(100).optional(),
  masteryDelta: z.number().min(-100).max(100).optional(),
  /** Simulation rubric score 0–100. */
  simulationScore: z.number().int().min(0).max(100).optional(),
  /** Drop-off route/step. */
  dropOffAt: z.string().min(1).max(160).optional(),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  at: z.string().datetime(),
});

export type LearningEvent = z.infer<typeof learningEventSchema>;

export function parseLearningEvent(raw: unknown): LearningEvent {
  return learningEventSchema.parse(raw);
}

export function dateKeyFromIso(iso: string): string {
  return iso.slice(0, 10);
}

/** Map mastery level enum → 0–100 proxy for trends. */
export function masteryLevelToScore(level: string): number {
  const map: Record<string, number> = {
    unknown: 0,
    exposed: 20,
    recall_fragile: 40,
    recall_stable: 60,
    proficient: 80,
    mastered: 100,
  };
  return map[level] ?? 0;
}

/** Flashcard / review grade → 0–5 rating. */
export function flashcardGradeToRating(
  grade: "dont_know" | "almost" | "know",
): number {
  if (grade === "know") return 5;
  if (grade === "almost") return 3;
  return 1;
}

export function spacedGradeToRating(
  grade: "again" | "hard" | "good" | "easy",
): number {
  if (grade === "easy") return 5;
  if (grade === "good") return 4;
  if (grade === "hard") return 2;
  return 1;
}

/** Hash learner key for anonymized export (one-way). */
export function anonymizeLearnerKey(learnerKey: string, salt = "dammaturu-la"): string {
  return createHash("sha256")
    .update(`${salt}:${learnerKey}`)
    .digest("hex")
    .slice(0, 16);
}

export type MethodEffectiveness = {
  method: LearningMethod;
  events: number;
  accuracyPct: number | null;
  avgRating: number | null;
  completions: number;
  labelCs: string;
  verdictCs: string;
};

export type QuestionQualityRow = {
  itemId: string;
  topicSlug: string | null;
  attempts: number;
  correctPct: number;
  flag: "too_easy" | "too_hard" | "ok";
  flagCs: string;
};

export type WeakTopicRow = {
  topicSlug: string;
  incorrect: number;
  correct: number;
  accuracyPct: number;
};

export type DropOffRow = {
  at: string;
  count: number;
};

export type ContentErrorSignal = {
  id: string;
  titleCs: string;
  bodyCs: string;
  severity: "watch" | "act";
};

export type LearningAnalyticsDashboard = {
  privacyNoteCs: string;
  questionsAnswered: {
    actuallyLearningCs: string;
    activeLearners: number;
    lessonsCompleted: number;
    reviewsCompleted: number;
    simulationsCompleted: number;
    studyPlansCompleted: number;
  };
  learningTimeMinutes: number;
  retentionProxy: {
    /** Share of review events with rating ≥ 3 (recall held). */
    pct: number | null;
    labelCs: string;
  };
  accuracyTrend: Array<{ dateKey: string; accuracyPct: number }>;
  masteryTrend: Array<{ dateKey: string; avgScore: number }>;
  completion: {
    lessonStartToCompletePct: number | null;
    labelCs: string;
  };
  methodEffectiveness: MethodEffectiveness[];
  weakTopics: WeakTopicRow[];
  questionQuality: QuestionQualityRow[];
  dropOffs: DropOffRow[];
  contentErrorSignals: ContentErrorSignal[];
  forgettingSignals: {
    lowReviewRatings: number;
    labelCs: string;
  };
  eventCount: number;
  generatedAt: string;
};

export const learningAnalyticsPrivacyNoteCs =
  "Privacy-first: opaque learner keys, žádné free-text odpovědi ani PII. Export je anonymizovaný (hashed keys).";

const methodLabelsCs: Record<LearningMethod, string> = {
  lesson: "Lekce",
  question_engine: "Question Engine",
  flashcards: "Flashcards",
  spaced_review: "Spaced review",
  teach_it_back: "Teach It Back",
  active_recall: "Active recall",
  simulation: "Zkouška nanečisto",
  daily_mission: "Denní mise",
  other: "Jiné",
};

/**
 * Build dashboard answering:
 * - Učí se skutečně?
 * - Která metoda funguje?
 * - Kde odpadá?
 * - Co se naučil / zapomíná?
 * - Lehké/těžké otázky?
 * - Chyby v obsahu?
 */
export function buildLearningAnalyticsDashboard(
  events: LearningEvent[],
  nowIso = new Date().toISOString(),
): LearningAnalyticsDashboard {
  const learners = new Set(events.map((e) => e.learnerKey));
  const lessonsStarted = events.filter((e) => e.event === "lesson_started").length;
  const lessonsCompleted = events.filter(
    (e) => e.event === "lesson_completed",
  ).length;
  const reviewsCompleted = events.filter(
    (e) => e.event === "review_completed",
  ).length;
  const simulationsCompleted = events.filter(
    (e) => e.event === "simulation_completed",
  ).length;
  const studyPlansCompleted = events.filter(
    (e) => e.event === "study_plan_completed",
  ).length;

  const learningTimeMinutes = events.reduce(
    (s, e) => s + (e.minutes ?? 0) + Math.round((e.durationMs ?? 0) / 60_000),
    0,
  );

  const reviewRatings = events.filter(
    (e) => e.event === "flashcard_rating" || e.event === "review_completed",
  );
  const held = reviewRatings.filter((e) => (e.rating ?? 0) >= 3);
  const retentionPct =
    reviewRatings.length === 0
      ? null
      : Math.round((100 * held.length) / reviewRatings.length);

  const lowReviewRatings = reviewRatings.filter(
    (e) => e.rating != null && e.rating <= 1,
  ).length;

  // Accuracy trend by day
  const byDay = new Map<string, { c: number; n: number }>();
  for (const e of events) {
    if (
      e.event !== "answer_correct" &&
      e.event !== "answer_incorrect" &&
      e.event !== "question_answered"
    ) {
      continue;
    }
    if (e.correct == null && e.event === "question_answered") continue;
    const correct =
      e.event === "answer_correct"
        ? true
        : e.event === "answer_incorrect"
          ? false
          : Boolean(e.correct);
    const row = byDay.get(e.dateKey) ?? { c: 0, n: 0 };
    row.n += 1;
    if (correct) row.c += 1;
    byDay.set(e.dateKey, row);
  }
  const accuracyTrend = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, v]) => ({
      dateKey,
      accuracyPct: v.n === 0 ? 0 : Math.round((100 * v.c) / v.n),
    }));

  // Mastery trend
  const masteryByDay = new Map<string, number[]>();
  for (const e of events) {
    if (e.event !== "mastery_changed" || e.masteryScore == null) continue;
    const arr = masteryByDay.get(e.dateKey) ?? [];
    arr.push(e.masteryScore);
    masteryByDay.set(e.dateKey, arr);
  }
  const masteryTrend = [...masteryByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, scores]) => ({
      dateKey,
      avgScore: Math.round(
        scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length),
      ),
    }));

  const completionPct =
    lessonsStarted === 0
      ? null
      : Math.round((100 * lessonsCompleted) / lessonsStarted);

  // Method effectiveness
  const methodEffectiveness = learningMethods
    .map((method) => {
      const subset = events.filter((e) => e.method === method);
      if (subset.length === 0) return null;
      const graded = subset.filter((e) => e.correct != null);
      const correctN = graded.filter((e) => e.correct).length;
      const ratings = subset
        .map((e) => e.rating)
        .filter((r): r is number => r != null);
      const accuracyPct =
        graded.length === 0
          ? null
          : Math.round((100 * correctN) / graded.length);
      const avgRating =
        ratings.length === 0
          ? null
          : Math.round(
              (10 * ratings.reduce((a, b) => a + b, 0)) / ratings.length,
            ) / 10;
      const completions = subset.filter((e) =>
        [
          "lesson_completed",
          "review_completed",
          "simulation_completed",
          "study_plan_completed",
        ].includes(e.event),
      ).length;
      let verdictCs = "Málo dat.";
      if (accuracyPct != null && accuracyPct >= 70 && completions > 0) {
        verdictCs = "Funguje — solidní accuracy + dokončení.";
      } else if (accuracyPct != null && accuracyPct < 45) {
        verdictCs = "Slabé výsledky — zkontroluj obtížnost nebo obsah.";
      } else if (completions === 0 && subset.length >= 5) {
        verdictCs = "Startuje, ale nedokončuje — drop-off riziko.";
      } else if (avgRating != null && avgRating >= 3.5) {
        verdictCs = "Dobrá retence (rating).";
      }
      return {
        method,
        events: subset.length,
        accuracyPct,
        avgRating,
        completions,
        labelCs: methodLabelsCs[method],
        verdictCs,
      } satisfies MethodEffectiveness;
    })
    .filter(Boolean) as MethodEffectiveness[];

  methodEffectiveness.sort((a, b) => b.events - a.events);

  // Weak topics
  const topicMap = new Map<string, { c: number; i: number }>();
  for (const e of events) {
    if (!e.topicSlug) continue;
    if (e.correct == null && e.event !== "answer_correct" && e.event !== "answer_incorrect") {
      continue;
    }
    const correct =
      e.event === "answer_correct"
        ? true
        : e.event === "answer_incorrect"
          ? false
          : e.correct;
    if (correct == null) continue;
    const row = topicMap.get(e.topicSlug) ?? { c: 0, i: 0 };
    if (correct) row.c += 1;
    else row.i += 1;
    topicMap.set(e.topicSlug, row);
  }
  const weakTopics: WeakTopicRow[] = [...topicMap.entries()]
    .map(([topicSlug, v]) => {
      const total = v.c + v.i;
      return {
        topicSlug,
        incorrect: v.i,
        correct: v.c,
        accuracyPct: total === 0 ? 0 : Math.round((100 * v.c) / total),
      };
    })
    .filter((t) => t.incorrect + t.correct >= 3)
    .sort((a, b) => a.accuracyPct - b.accuracyPct)
    .slice(0, 8);

  // Question quality
  const qMap = new Map<
    string,
    { topicSlug: string | null; c: number; n: number }
  >();
  for (const e of events) {
    if (!e.itemId) continue;
    if (
      e.event !== "question_answered" &&
      e.event !== "answer_correct" &&
      e.event !== "answer_incorrect"
    ) {
      continue;
    }
    const correct =
      e.event === "answer_correct"
        ? true
        : e.event === "answer_incorrect"
          ? false
          : e.correct;
    if (correct == null) continue;
    const row = qMap.get(e.itemId) ?? {
      topicSlug: e.topicSlug ?? null,
      c: 0,
      n: 0,
    };
    row.n += 1;
    if (correct) row.c += 1;
    if (e.topicSlug) row.topicSlug = e.topicSlug;
    qMap.set(e.itemId, row);
  }
  const questionQuality: QuestionQualityRow[] = [...qMap.entries()]
    .map(([itemId, v]) => {
      const correctPct = Math.round((100 * v.c) / Math.max(1, v.n));
      let flag: QuestionQualityRow["flag"] = "ok";
      let flagCs = "OK";
      if (v.n >= 5 && correctPct >= 95) {
        flag = "too_easy";
        flagCs = "Příliš lehká (≥95 % při ≥5 pokusech)";
      } else if (v.n >= 5 && correctPct <= 20) {
        flag = "too_hard";
        flagCs = "Příliš těžká / podezřelá (≤20 % při ≥5 pokusech)";
      }
      return {
        itemId,
        topicSlug: v.topicSlug,
        attempts: v.n,
        correctPct,
        flag,
        flagCs,
      };
    })
    .filter((q) => q.flag !== "ok" || q.attempts >= 8)
    .sort((a, b) => {
      if (a.flag !== b.flag) {
        if (a.flag === "too_hard") return -1;
        if (b.flag === "too_hard") return 1;
      }
      return b.attempts - a.attempts;
    })
    .slice(0, 12);

  const dropMap = new Map<string, number>();
  for (const e of events) {
    if (e.event !== "session_drop_off" || !e.dropOffAt) continue;
    dropMap.set(e.dropOffAt, (dropMap.get(e.dropOffAt) ?? 0) + 1);
  }
  const dropOffs: DropOffRow[] = [...dropMap.entries()]
    .map(([at, count]) => ({ at, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const contentErrorSignals: ContentErrorSignal[] = [];
  const tooHard = questionQuality.filter((q) => q.flag === "too_hard");
  if (tooHard.length > 0) {
    contentErrorSignals.push({
      id: "content-too-hard",
      severity: "act",
      titleCs: "Možné chyby v obsahu / klíčích",
      bodyCs: `${tooHard.length} otázek s ≤20 % úspěšností — zkontroluj správnou odpověď a wording v Content Studio.`,
    });
  }
  const tooEasy = questionQuality.filter((q) => q.flag === "too_easy");
  if (tooEasy.length > 0) {
    contentErrorSignals.push({
      id: "content-too-easy",
      severity: "watch",
      titleCs: "Otázky bez diagnostické hodnoty",
      bodyCs: `${tooEasy.length} otázek s ≥95 % — zvaž obtížnější distraktory.`,
    });
  }
  if (dropOffs[0] && dropOffs[0].count >= 3) {
    contentErrorSignals.push({
      id: "dropoff-hotspot",
      severity: "act",
      titleCs: "Hotspot odpadu",
      bodyCs: `Nejčastější drop-off: ${dropOffs[0].at} (${dropOffs[0].count}×).`,
    });
  }

  const actuallyLearning =
    lessonsCompleted + reviewsCompleted + studyPlansCompleted > 0 ||
    accuracyTrend.some((d) => d.accuracyPct >= 55)
      ? `Ano — ${learners.size} aktivních learnerů, ${lessonsCompleted} lekcí dokončeno, ${reviewsCompleted} review.`
      : events.length === 0
        ? "Zatím bez learning eventů — začni učením nebo testem."
        : "Aktivita je, ale málo dokončení / slabá accuracy — riziko povrchního klikání.";

  return {
    privacyNoteCs: learningAnalyticsPrivacyNoteCs,
    questionsAnswered: {
      actuallyLearningCs: actuallyLearning,
      activeLearners: learners.size,
      lessonsCompleted,
      reviewsCompleted,
      simulationsCompleted,
      studyPlansCompleted,
    },
    learningTimeMinutes,
    retentionProxy: {
      pct: retentionPct,
      labelCs:
        retentionPct == null
          ? "Retention proxy: málo review ratingů"
          : `Retention proxy: ${retentionPct} % review s rating ≥ 3`,
    },
    accuracyTrend,
    masteryTrend,
    completion: {
      lessonStartToCompletePct: completionPct,
      labelCs:
        completionPct == null
          ? "Completion: žádné lesson_started"
          : `Lesson completion: ${completionPct} % (start→complete)`,
    },
    methodEffectiveness,
    weakTopics,
    questionQuality,
    dropOffs,
    contentErrorSignals,
    forgettingSignals: {
      lowReviewRatings,
      labelCs:
        lowReviewRatings === 0
          ? "Zapomínání: bez low ratings"
          : `Zapomínání: ${lowReviewRatings}× rating ≤ 1 na review/flashcard`,
    },
    eventCount: events.length,
    generatedAt: nowIso,
  };
}

export type AnonymizedLearningExport = {
  exportedAt: string;
  privacy: {
    allowed: readonly string[];
    denied: readonly string[];
    noteCs: string;
  };
  events: Array<
    Omit<LearningEvent, "learnerKey"> & { learnerKeyHash: string }
  >;
};

export function buildAnonymizedLearningExport(
  events: LearningEvent[],
  nowIso = new Date().toISOString(),
): AnonymizedLearningExport {
  return {
    exportedAt: nowIso,
    privacy: {
      allowed: LEARNING_ANALYTICS_ALLOWED,
      denied: LEARNING_ANALYTICS_DENIED,
      noteCs: learningAnalyticsPrivacyNoteCs,
    },
    events: events.map((e) => {
      const { learnerKey, ...rest } = e;
      return {
        ...rest,
        learnerKeyHash: anonymizeLearnerKey(learnerKey),
      };
    }),
  };
}
