import { z } from "zod";

/**
 * N=1 beta experiment instrumentation (D-050).
 * Measures whether the product improves knowledge for ONE real learner
 * (target 31 Aug 2026). Not scientific proof of platform efficacy.
 */

export const BETA_EXPERIMENT_FRAMING = {
  design: "N=1 beta validation" as const,
  n: 1,
  claimCs:
    "Cíl je ověřit produktový mechanismus a najít problémy — ne dokázat vědeckou účinnost platformy.",
  noFalseStatsCs:
    "Z jednoho uživatele nevyvozujeme statistickou významnost ani generalizaci na populaci.",
  targetDateDefault: "2026-08-31",
  cohortId: "cjl-private-aug-2026",
} as const;

export const retentionWindows = [
  "immediate",
  "1d",
  "3d",
  "7d",
  "14d",
] as const;
export type RetentionWindow = (typeof retentionWindows)[number];

export const retentionWindowLabelsCs: Record<RetentionWindow, string> = {
  immediate: "Immediate recall (≤2 h)",
  "1d": "1-day recall",
  "3d": "3-day recall",
  "7d": "7-day recall",
  "14d": "14-day recall",
};

/** Days after LEARNED mark — inclusive lower bound for window. */
export const retentionWindowDayBounds: Record<
  RetentionWindow,
  { minDays: number; maxDays: number }
> = {
  immediate: { minDays: 0, maxDays: 0.084 }, // ~2 hours
  "1d": { minDays: 0.5, maxDays: 1.5 },
  "3d": { minDays: 2.5, maxDays: 3.5 },
  "7d": { minDays: 6, maxDays: 8 },
  "14d": { minDays: 12, maxDays: 16 },
};

export const experimentMethods = [
  "microlearning",
  "flashcards",
  "active_recall",
  "matching",
  "story_mode",
  "timeline",
  "teach_back",
  "mixed_test",
  "oral_simulation",
] as const;
export type ExperimentMethod = (typeof experimentMethods)[number];

export const experimentMethodLabelsCs: Record<ExperimentMethod, string> = {
  microlearning: "Reading / microlearning",
  flashcards: "Flashcards",
  active_recall: "Active recall",
  matching: "Matching",
  story_mode: "Story mode",
  timeline: "Timeline",
  teach_back: "Teach-back",
  mixed_test: "Mixed test",
  oral_simulation: "Oral simulation",
};

export const knowledgeStates = ["learned", "retained", "forgotten"] as const;
export type KnowledgeState = (typeof knowledgeStates)[number];

export const assessmentKinds = ["weekly", "final"] as const;
export type AssessmentKind = (typeof assessmentKinds)[number];

/** Prefer these for transfer / non-identical checkpoint items. */
export const transferQuestionKinds = [
  "long_answer",
  "short_answer",
  "error_spotting",
  "identify_from_clues",
  "categorization",
  "matching",
  "ordering",
  "timeline_ordering",
] as const;

export const topicMasterySchema = z.object({
  topicId: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  masteryPct: z.number().min(0).max(100),
});
export type TopicMastery = z.infer<typeof topicMasterySchema>;

export const baselineSnapshotSchema = z.object({
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  /** Wall-clock diagnostic duration in minutes. */
  durationMinutes: z.number().min(0).max(480),
  diagnosticAccuracyPct: z.number().min(0).max(100),
  diagnosticAttempts: z.number().int().min(0),
  diagnosticCorrect: z.number().int().min(0),
  overallMasteryPct: z.number().min(0).max(100).nullable(),
  topicMastery: z.array(topicMasterySchema).max(40),
  /** Self-reported confidence 1–5 from onboarding (not Maturita Score). */
  confidence: z.number().int().min(1).max(5).nullable(),
  packSlug: z.string().min(1).max(120),
  objectiveKuIds: z.array(z.string().min(1).max(120)).max(80),
});
export type BaselineSnapshot = z.infer<typeof baselineSnapshotSchema>;

export const dailySnapshotSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minutesStudied: z.number().min(0).max(720),
  plannedMinutes: z.number().min(0).max(720),
  /** 0–100: minutesStudied / plannedMinutes capped. */
  planAdherencePct: z.number().min(0).max(100),
  lessonsCompleted: z.number().int().min(0).max(50),
  reviewsCompleted: z.number().int().min(0).max(200),
  questionsAnswered: z.number().int().min(0).max(500),
  questionsCorrect: z.number().int().min(0).max(500),
  accuracyPct: z.number().min(0).max(100).nullable(),
  masteryDelta: z.number().min(-100).max(100),
  masteryEndPct: z.number().min(0).max(100).nullable(),
  topicsStudied: z.array(z.string().min(1).max(120)).max(40),
  methodsUsed: z.array(z.enum(experimentMethods)).max(12),
  updatedAt: z.string().datetime(),
});
export type DailySnapshot = z.infer<typeof dailySnapshotSchema>;

export const methodStatsSchema = z.object({
  method: z.enum(experimentMethods),
  attempts: z.number().int().min(0),
  correct: z.number().int().min(0),
  partial: z.number().int().min(0),
  incorrect: z.number().int().min(0),
  scoreSum: z.number().min(0),
  minutes: z.number().min(0).max(10_000),
  /** Average score 0–1 when attempts > 0. */
  avgScore: z.number().min(0).max(1).nullable(),
  accuracyPct: z.number().min(0).max(100).nullable(),
});
export type MethodStats = z.infer<typeof methodStatsSchema>;

export const retentionProbeSchema = z.object({
  id: z.string().uuid(),
  knowledgeUnitId: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  learnedAt: z.string().datetime(),
  learnedMethod: z.enum(experimentMethods).nullable(),
  /** First successful practice after learn → LEARNED. */
  state: z.enum(knowledgeStates),
  probes: z
    .array(
      z.object({
        window: z.enum(retentionWindows),
        at: z.string().datetime(),
        correct: z.boolean(),
        score01: z.number().min(0).max(1),
        method: z.enum(experimentMethods).nullable(),
        itemId: z.string().min(1).max(120).optional(),
      }),
    )
    .max(20),
});
export type RetentionProbe = z.infer<typeof retentionProbeSchema>;

export const assessmentAttemptSchema = z.object({
  questionId: z.string().uuid(),
  correct: z.boolean(),
  score01: z.number().min(0).max(1),
  isTransfer: z.boolean(),
  at: z.string().datetime(),
});

export const experimentAssessmentSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(assessmentKinds),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  weekKey: z.string().min(1).max(16).nullable(),
  packSlug: z.string().min(1).max(120),
  questionIds: z.array(z.string().uuid()).min(1).max(40),
  transferQuestionIds: z.array(z.string().uuid()).max(40),
  topicsCovered: z.array(z.string().min(1).max(120)).max(40),
  objectiveKuIds: z.array(z.string().min(1).max(120)).max(80),
  attempts: z.array(assessmentAttemptSchema).max(80),
  accuracyPct: z.number().min(0).max(100).nullable(),
  noteCs: z.string().max(400).optional(),
});
export type ExperimentAssessment = z.infer<typeof experimentAssessmentSchema>;

export const oralReadinessSchema = z.object({
  simulationCount: z.number().int().min(0),
  lastScore: z.number().min(0).max(100).nullable(),
  avgScore: z.number().min(0).max(100).nullable(),
});

export const experimentBookSchema = z.object({
  learnerId: z.string().min(1).max(64),
  framing: z.literal("N=1 beta validation"),
  cohortId: z.string().min(1).max(80),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  /** First diagnostic attempt — for duration. */
  diagnosticStartedAt: z.string().datetime().nullable(),
  baseline: baselineSnapshotSchema.nullable(),
  dailyByDate: z.record(z.string(), dailySnapshotSchema),
  methodStats: z.array(methodStatsSchema).max(12),
  retention: z.array(retentionProbeSchema).max(200),
  assessments: z.array(experimentAssessmentSchema).max(40),
  seenQuestionIds: z.array(z.string().uuid()).max(500),
  final: experimentAssessmentSchema.nullable(),
  oral: oralReadinessSchema,
});
export type ExperimentBook = z.infer<typeof experimentBookSchema>;

export function emptyMethodStats(method: ExperimentMethod): MethodStats {
  return {
    method,
    attempts: 0,
    correct: 0,
    partial: 0,
    incorrect: 0,
    scoreSum: 0,
    minutes: 0,
    avgScore: null,
    accuracyPct: null,
  };
}

export function createEmptyExperimentBook(input: {
  learnerId: string;
  targetDate?: string;
  nowIso?: string;
}): ExperimentBook {
  const now = input.nowIso ?? new Date().toISOString();
  return {
    learnerId: input.learnerId,
    framing: "N=1 beta validation",
    cohortId: BETA_EXPERIMENT_FRAMING.cohortId,
    targetDate: input.targetDate ?? BETA_EXPERIMENT_FRAMING.targetDateDefault,
    createdAt: now,
    updatedAt: now,
    diagnosticStartedAt: null,
    baseline: null,
    dailyByDate: {},
    methodStats: experimentMethods.map(emptyMethodStats),
    retention: [],
    assessments: [],
    seenQuestionIds: [],
    final: null,
    oral: { simulationCount: 0, lastScore: null, avgScore: null },
  };
}

export function dateKeyFromIso(iso: string): string {
  return iso.slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  return (b - a) / 86_400_000;
}

export function classifyRetentionWindow(
  daysSinceLearned: number,
): RetentionWindow | null {
  for (const w of retentionWindows) {
    const { minDays, maxDays } = retentionWindowDayBounds[w];
    if (daysSinceLearned >= minDays && daysSinceLearned <= maxDays) return w;
  }
  return null;
}

export function planAdherencePct(
  minutesStudied: number,
  plannedMinutes: number,
): number {
  if (plannedMinutes <= 0) return minutesStudied > 0 ? 100 : 0;
  return Math.min(100, Math.round((100 * minutesStudied) / plannedMinutes));
}

export function emptyDaily(
  dateKey: string,
  plannedMinutes: number,
  nowIso: string,
): DailySnapshot {
  return {
    dateKey,
    minutesStudied: 0,
    plannedMinutes,
    planAdherencePct: 0,
    lessonsCompleted: 0,
    reviewsCompleted: 0,
    questionsAnswered: 0,
    questionsCorrect: 0,
    accuracyPct: null,
    masteryDelta: 0,
    masteryEndPct: null,
    topicsStudied: [],
    methodsUsed: [],
    updatedAt: nowIso,
  };
}

export function recomputeMethodStats(s: MethodStats): MethodStats {
  const avgScore =
    s.attempts > 0 ? Math.round((s.scoreSum / s.attempts) * 1000) / 1000 : null;
  const graded = s.correct + s.incorrect + s.partial;
  const accuracyPct =
    graded > 0 ? Math.round((100 * s.correct) / graded) : null;
  return { ...s, avgScore, accuracyPct };
}

export function isTransferKind(kind: string): boolean {
  return (transferQuestionKinds as readonly string[]).includes(kind);
}

export type CheckpointPickInput = {
  questions: Array<{
    id: string;
    kind: string;
    knowledgeUnits: Array<{ id: string }>;
  }>;
  excludeQuestionIds: Set<string>;
  preferKuIds: Set<string>;
  maxQuestions: number;
  preferTransfer: boolean;
};

/**
 * Pick unseen questions for weekly/final — prefer KU overlap + transfer kinds.
 * Never returns only identical previously-seen items (excluded by id).
 */
export function pickCheckpointQuestions(input: CheckpointPickInput): {
  questionIds: string[];
  transferQuestionIds: string[];
} {
  const eligible = input.questions.filter(
    (q) => !input.excludeQuestionIds.has(q.id),
  );
  const score = (q: (typeof eligible)[0]) => {
    let s = 0;
    if (input.preferTransfer && isTransferKind(q.kind)) s += 10;
    const hit = q.knowledgeUnits.some((ku) => input.preferKuIds.has(ku.id));
    if (hit) s += 5;
    return s;
  };
  const ranked = [...eligible].sort((a, b) => score(b) - score(a));
  const selected = ranked.slice(0, input.maxQuestions);
  const questionIds = selected.map((q) => q.id);
  const transferQuestionIds = selected
    .filter((q) => isTransferKind(q.kind))
    .map((q) => q.id);
  return { questionIds, transferQuestionIds };
}

export type ExperimentReport = {
  framing: typeof BETA_EXPERIMENT_FRAMING.design;
  n: 1;
  disclaimerCs: string;
  generatedAt: string;
  targetDate: string;
  displayName: string;
  start: {
    date: string | null;
    diagnosticAccuracyPct: number | null;
    overallMasteryPct: number | null;
    confidence: number | null;
    durationMinutes: number | null;
    topicMastery: TopicMastery[];
  };
  end: {
    overallMasteryPct: number | null;
    accuracyPct: number | null;
    topicMastery: TopicMastery[];
    oralReadiness: z.infer<typeof oralReadinessSchema>;
  };
  retention: {
    byWindow: Array<{
      window: RetentionWindow;
      probes: number;
      retainedPct: number | null;
    }>;
    learnedCount: number;
    retainedCount: number;
    forgottenCount: number;
    noteCs: string;
  };
  studyTimeMinutes: number;
  planAdherencePct: number | null;
  topImprovements: Array<{ title: string; deltaPct: number }>;
  topWeaknesses: Array<{ title: string; masteryPct: number }>;
  mostEffectiveMethods: Array<{
    method: ExperimentMethod;
    labelCs: string;
    accuracyPct: number | null;
    attempts: number;
  }>;
  leastEffectiveMethods: Array<{
    method: ExperimentMethod;
    labelCs: string;
    accuracyPct: number | null;
    attempts: number;
  }>;
  weeklyCheckpoints: Array<{
    id: string;
    weekKey: string | null;
    accuracyPct: number | null;
    transferSharePct: number | null;
  }>;
  finalAssessment: {
    id: string;
    accuracyPct: number | null;
    completedAt: string | null;
  } | null;
  caveatsCs: string[];
};

export function buildExperimentReport(input: {
  book: ExperimentBook;
  displayName: string;
  currentTopicMastery: TopicMastery[];
  currentOverallMasteryPct: number | null;
  recentAccuracyPct: number | null;
  nowIso?: string;
}): ExperimentReport {
  const now = input.nowIso ?? new Date().toISOString();
  const book = input.book;
  const baseline = book.baseline;

  const daily = Object.values(book.dailyByDate);
  const studyTimeMinutes = Math.round(
    daily.reduce((s, d) => s + d.minutesStudied, 0),
  );
  const plannedSum = daily.reduce((s, d) => s + d.plannedMinutes, 0);
  const studiedSum = daily.reduce((s, d) => s + d.minutesStudied, 0);
  const planAdherence =
    plannedSum > 0
      ? Math.min(100, Math.round((100 * studiedSum) / plannedSum))
      : null;

  const startMap = new Map(
    (baseline?.topicMastery ?? []).map((t) => [t.topicId, t]),
  );
  const improvements: Array<{ title: string; deltaPct: number }> = [];
  for (const end of input.currentTopicMastery) {
    const start = startMap.get(end.topicId);
    const startPct = start?.masteryPct ?? 0;
    const delta = Math.round(end.masteryPct - startPct);
    if (delta !== 0) {
      improvements.push({ title: end.title, deltaPct: delta });
    }
  }
  improvements.sort((a, b) => b.deltaPct - a.deltaPct);
  const topImprovements = improvements.filter((i) => i.deltaPct > 0).slice(0, 5);
  const topWeaknesses = [...input.currentTopicMastery]
    .sort((a, b) => a.masteryPct - b.masteryPct)
    .slice(0, 5)
    .map((t) => ({ title: t.title, masteryPct: t.masteryPct }));

  const methodsWithData = book.methodStats
    .filter((m) => m.attempts >= 2)
    .map((m) => ({
      method: m.method,
      labelCs: experimentMethodLabelsCs[m.method],
      accuracyPct: m.accuracyPct,
      attempts: m.attempts,
      sortKey: m.accuracyPct ?? -1,
    }));
  const byBest = [...methodsWithData].sort((a, b) => b.sortKey - a.sortKey);
  const byWorst = [...methodsWithData].sort((a, b) => a.sortKey - b.sortKey);

  const byWindow = retentionWindows.map((window) => {
    let probes = 0;
    let retained = 0;
    for (const item of book.retention) {
      for (const p of item.probes) {
        if (p.window !== window) continue;
        probes += 1;
        if (p.correct) retained += 1;
      }
    }
    return {
      window,
      probes,
      retainedPct: probes > 0 ? Math.round((100 * retained) / probes) : null,
    };
  });

  const learnedCount = book.retention.filter(
    (r) => r.state === "learned" || r.state === "retained",
  ).length;
  const retainedCount = book.retention.filter(
    (r) => r.state === "retained",
  ).length;
  const forgottenCount = book.retention.filter(
    (r) => r.state === "forgotten",
  ).length;

  const weekly = book.assessments
    .filter((a) => a.kind === "weekly")
    .map((a) => ({
      id: a.id,
      weekKey: a.weekKey,
      accuracyPct: a.accuracyPct,
      transferSharePct:
        a.questionIds.length > 0
          ? Math.round(
              (100 * a.transferQuestionIds.length) / a.questionIds.length,
            )
          : null,
    }));

  const caveatsCs = [
    BETA_EXPERIMENT_FRAMING.claimCs,
    BETA_EXPERIMENT_FRAMING.noFalseStatsCs,
    "Retention windows závisí na tom, zda student v intervalu vůbec znovu procvičil stejnou KU — chybějící probe ≠ fail.",
    "Efektivita metod je deskriptivní (accuracy / pokusy) pro tohoto jedince — ne kauzální A/B.",
    methodsWithData.length < 2
      ? "Málo dat podle metod (<2 pokusy u většiny) — žebříček metod je předběžný."
      : "Žebříček metod vyžaduje ≥2 pokusy na metodu.",
  ];

  return {
    framing: BETA_EXPERIMENT_FRAMING.design,
    n: 1,
    disclaimerCs: BETA_EXPERIMENT_FRAMING.noFalseStatsCs,
    generatedAt: now,
    targetDate: book.targetDate,
    displayName: input.displayName,
    start: {
      date: baseline?.startedAt.slice(0, 10) ?? null,
      diagnosticAccuracyPct: baseline?.diagnosticAccuracyPct ?? null,
      overallMasteryPct: baseline?.overallMasteryPct ?? null,
      confidence: baseline?.confidence ?? null,
      durationMinutes: baseline?.durationMinutes ?? null,
      topicMastery: baseline?.topicMastery ?? [],
    },
    end: {
      overallMasteryPct: input.currentOverallMasteryPct,
      accuracyPct: input.recentAccuracyPct,
      topicMastery: input.currentTopicMastery,
      oralReadiness: book.oral,
    },
    retention: {
      byWindow,
      learnedCount,
      retainedCount,
      forgottenCount,
      noteCs:
        "LEARNED = první úspěšné zvládnutí KU. RETAINED = úspěšný probe v časovém okně. FORGOTTEN = neúspěšný delayed probe.",
    },
    studyTimeMinutes,
    planAdherencePct: planAdherence,
    topImprovements,
    topWeaknesses,
    mostEffectiveMethods: byBest.slice(0, 5).map((m) => ({
      method: m.method,
      labelCs: m.labelCs,
      accuracyPct: m.accuracyPct,
      attempts: m.attempts,
    })),
    leastEffectiveMethods: byWorst.slice(0, 5).map((m) => ({
      method: m.method,
      labelCs: m.labelCs,
      accuracyPct: m.accuracyPct,
      attempts: m.attempts,
    })),
    weeklyCheckpoints: weekly,
    finalAssessment: book.final
      ? {
          id: book.final.id,
          accuracyPct: book.final.accuracyPct,
          completedAt: book.final.completedAt,
        }
      : null,
    caveatsCs,
  };
}

export function weekKeyFromDateKey(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const oneJan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - oneJan.getTime()) / 86_400_000 + oneJan.getUTCDay() + 1) /
      7,
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
