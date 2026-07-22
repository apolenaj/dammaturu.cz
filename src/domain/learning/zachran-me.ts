import { z } from "zod";
import {
  cermatCategories,
  cermatCategoryLabelsCs,
  type CermatCategory,
  type CermatCategoryStats,
} from "@/domain/learning/cermat-prep";
import { BETA_TARGET_DATE } from "@/domain/onboarding/schema";

/**
 * Zachraň mě — deadline triage (rebuild).
 * Scope: Moje materiály / CERMAT / both. Never invent unimplemented subjects.
 * Three buckets → concrete Dnes / Zítra / Tento týden plan.
 * No false precision when learning evidence is thin.
 */

export const zachranMeScopes = ["materials", "cermat", "both"] as const;
export type ZachranMeScope = (typeof zachranMeScopes)[number];

export function isZachranMeScope(value: string): value is ZachranMeScope {
  return (zachranMeScopes as readonly string[]).includes(value);
}

export const zachranMeScopeLabelsCs: Record<ZachranMeScope, string> = {
  materials: "Moje materiály",
  cermat: "CERMAT",
  both: "Moje materiály + CERMAT",
};

export const zachranMeScopeHintsCs: Record<ZachranMeScope, string> = {
  materials:
    "Jen tvoje nahrané podklady (PDF/DOCX/TXT). Matematika, AJ a jiné předměty tu nejsou.",
  cermat:
    "Didaktický test ČJL podle katalogu CERMAT — jen to, co app opravdu trénuje.",
  both: "Obě podporované linie: materiály i CERMAT ČJL. Nic dalšího nepřidáváme.",
};

export const zachranMeScopeHrefs: Record<
  Exclude<ZachranMeScope, "both">,
  string
> = {
  materials: "/app/materials",
  cermat: "/app/cermat",
};

/** Product lanes on a triage item — never mix with unimplemented subjects. */
export const zachranMeLanes = ["materials", "cermat"] as const;
export type ZachranMeLane = (typeof zachranMeLanes)[number];

export const zachranMeLaneLabelsCs: Record<ZachranMeLane, string> = {
  materials: "Moje materiály",
  cermat: "CERMAT",
};

export const zachranMeBuckets = [
  "must_know",
  "important",
  "if_time",
] as const;
export type ZachranMeBucket = (typeof zachranMeBuckets)[number];

export const zachranMeBucketLabelsCs: Record<ZachranMeBucket, string> = {
  must_know: "MUSÍM UMĚT",
  important: "DŮLEŽITÉ",
  if_time: "POKUD ZBUDE ČAS",
};

export const zachranMeBucketHintsCs: Record<ZachranMeBucket, string> = {
  must_know:
    "Kritické mezery před termínem — chyby, splatné opakování, vysoká důležitost.",
  important:
    "Silný zisk za čas: slabší místa s dobrou exam vahou. Až po MUSÍM UMĚT.",
  if_time:
    "Až zbude kapacita. Nesmí vytlačit první dvě kategorie.",
};

export const cermatCategoryImportance: Record<CermatCategory, number> = {
  orthography: 0.95,
  morphology: 0.9,
  syntax: 0.9,
  text_comprehension: 0.95,
  work_with_text: 0.85,
  word_meaning: 0.8,
  language: 0.85,
  literary_knowledge: 0.75,
};

export const zachranMeConfig = {
  betaTargetDate: BETA_TARGET_DATE,
  minDailyMinutes: 10,
  maxDailyMinutes: 240,
  defaultDailyMinutes: 30,
  defaultStepMinutes: 15,
  maxTodaySteps: 5,
  maxTomorrowSteps: 5,
  maxWeekThemes: 8,
  /** Soft mastery gate — only when real evidence exists. */
  solidMasteryPct: 72,
  mustImportanceMin: 0.7,
  mustWeaknessMin: 0.4,
  importantScoreMin: 0.22,
  minEvidenceAttempts: 3,
  evidenceSolidAttempts: 12,
} as const;

export const zachranMeInputSchema = z.object({
  examDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const d = new Date(`${value}T12:00:00`);
      return !Number.isNaN(d.getTime());
    }, "Neplatný termín maturity"),
  dailyMinutes: z
    .number()
    .int()
    .min(zachranMeConfig.minDailyMinutes)
    .max(zachranMeConfig.maxDailyMinutes),
  scope: z.enum(zachranMeScopes),
});

export type ZachranMeInput = z.infer<typeof zachranMeInputSchema>;

export type EvidenceLevel = "insufficient" | "partial" | "solid";

export type TriageCandidate = {
  id: string;
  lane: ZachranMeLane;
  titleCs: string;
  detailCs: string;
  href: string;
  /** null = no reliable mastery yet — never invent a %. */
  masteryPct: number | null;
  hasLearningEvidence: boolean;
  /** 0–1 exam / topic weight. */
  importance: number;
  remainingUnits: number;
  repeatedErrors: number;
  overdueReviews: number;
  estimatedMinutes: number;
};

export type AnalysisFactors = {
  masteryPct: number | null;
  weakness: number;
  importance: number;
  errorPressure: number;
  overduePressure: number;
  coveragePressure: number;
  timePressure: number;
  /** Internal ranking only — not shown as false precision. */
  priorityScore: number;
};

export type PriorityItem = {
  id: string;
  lane: ZachranMeLane;
  laneLabelCs: string;
  titleCs: string;
  detailCs: string;
  href: string;
  masteryPct: number | null;
  hasLearningEvidence: boolean;
  importance: number;
  priorityScore: number;
  factors: AnalysisFactors;
  bucket: ZachranMeBucket;
  reasonCs: string;
  estimatedMinutes: number;
  remainingUnits: number;
  repeatedErrors: number;
  overdueReviews: number;
};

export type HorizonStep = {
  order: number;
  titleCs: string;
  reasonCs: string;
  href: string;
  estimatedMinutes: number;
  lane: ZachranMeLane;
  laneLabelCs: string;
  itemId: string;
  bucket: ZachranMeBucket;
};

export type HorizonBlock = {
  key: "today" | "tomorrow" | "this_week";
  titleCs: string;
  minutesBudget: number;
  totalMinutes: number;
  steps: HorizonStep[];
  noteCs: string;
};

export type ZachranMeHorizon = {
  today: HorizonBlock;
  tomorrow: HorizonBlock;
  thisWeek: HorizonBlock;
};

export type ZachranMeAnalysisSummary = {
  daysRemaining: number;
  studyDaysEstimate: number;
  timePressure: number;
  timePressureLabelCs: string;
  dailyMinutes: number;
  totalStudyMinutesLeft: number;
  evidenceLevel: EvidenceLevel;
  evidenceDisclaimerCs: string | null;
  remainingUnitsTotal: number;
  repeatedErrorsTotal: number;
  overdueReviewsTotal: number;
  weakLaneLabelsCs: string[];
};

export type ZachranMePlan = {
  examDate: string;
  examDateLabelCs: string;
  dailyMinutes: number;
  scope: ZachranMeScope;
  scopeLabelCs: string;
  daysRemaining: number;
  analysis: ZachranMeAnalysisSummary;
  mustKnow: PriorityItem[];
  important: PriorityItem[];
  ifTime: PriorityItem[];
  horizon: ZachranMeHorizon;
  startTodayHref: string;
  ctaLabelCs: string;
  manifestoCs: string;
  generatedAt: string;
};

export function formatDeadlineCs(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d}. ${m}. ${y}`;
}

export function daysRemainingTo(deadline: string, now: Date): number {
  const target = new Date(`${deadline}T12:00:00`);
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  return Math.max(
    0,
    Math.ceil((target.getTime() - today.getTime()) / 86_400_000),
  );
}

/** Approximate study days left (weekends soft-discounted). */
export function estimateStudyDays(daysRemaining: number): number {
  if (daysRemaining <= 0) return 0;
  return Math.max(1, Math.round(daysRemaining * (5 / 7)));
}

export function timePressureFromDays(daysRemaining: number): number {
  if (daysRemaining <= 3) return 1;
  if (daysRemaining <= 7) return 0.92;
  if (daysRemaining <= 14) return 0.78;
  if (daysRemaining <= 30) return 0.58;
  if (daysRemaining <= 60) return 0.42;
  return 0.3;
}

export function timePressureLabelCs(pressure: number): string {
  if (pressure >= 0.9) return "Kritický tlak času";
  if (pressure >= 0.75) return "Vysoký tlak času";
  if (pressure >= 0.55) return "Střední tlak času";
  return "Zatím klidnější tempo";
}

export function weaknessFromMastery(masteryPct: number | null): number {
  if (masteryPct == null) return 0.55; // unknown → moderate coverage pressure, not fake %
  const m = Math.max(0, Math.min(100, masteryPct));
  return Math.round((1 - m / 100) * 1000) / 1000;
}

export function computePriorityScore(input: {
  importance: number;
  weakness: number;
  errorPressure: number;
  overduePressure: number;
  coveragePressure: number;
  timePressure: number;
}): number {
  const score =
    input.importance *
    (0.35 * input.weakness +
      0.25 * input.errorPressure +
      0.2 * input.overduePressure +
      0.2 * input.coveragePressure) *
    (0.55 + 0.45 * input.timePressure);
  return Math.round(score * 10_000) / 10_000;
}

export function estimateForgettingRisk(input: {
  isDue: boolean;
  daysOverdue: number;
  lapseCount: number;
  stabilityDays: number | null;
  bandAtRisk: boolean;
}): number {
  let risk = 0.12;
  if (input.isDue) risk = Math.max(risk, 0.55);
  if (input.daysOverdue > 0) {
    risk = Math.max(risk, Math.min(1, 0.55 + input.daysOverdue * 0.08));
  }
  if (input.lapseCount >= 2) risk = Math.max(risk, 0.7);
  if (input.lapseCount >= 4) risk = Math.max(risk, 0.9);
  if (input.stabilityDays != null && input.stabilityDays < 1.5) {
    risk = Math.max(risk, 0.65);
  }
  if (input.bandAtRisk) risk = Math.max(risk, 0.85);
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function resolveEvidenceLevel(input: {
  candidates: TriageCandidate[];
  totalAttemptsHint?: number;
}): EvidenceLevel {
  const withEvidence = input.candidates.filter((c) => c.hasLearningEvidence);
  const attempts = input.totalAttemptsHint ?? withEvidence.length * 2;
  if (withEvidence.length === 0 || attempts < zachranMeConfig.minEvidenceAttempts) {
    return "insufficient";
  }
  if (attempts < zachranMeConfig.evidenceSolidAttempts) return "partial";
  return "solid";
}

export function evidenceDisclaimerCs(level: EvidenceLevel): string | null {
  if (level === "insufficient") {
    return "Zatím máš málo ověřených výsledků. Priorita je zatím podle pokrytí obsahu a důležitosti témat — po testování se zpersonalizuje.";
  }
  if (level === "partial") {
    return "Evidence je zatím částečná. Pořadí bere v úvahu i chyby a splatné opakování, ale ještě to není plně personalizované.";
  }
  return null;
}

function classifyBucket(factors: AnalysisFactors): ZachranMeBucket {
  const mastered =
    factors.masteryPct != null &&
    factors.masteryPct >= zachranMeConfig.solidMasteryPct &&
    factors.errorPressure < 0.25 &&
    factors.overduePressure < 0.25;
  if (mastered) return "if_time";

  const must =
    (factors.importance >= zachranMeConfig.mustImportanceMin &&
      (factors.weakness >= zachranMeConfig.mustWeaknessMin ||
        factors.errorPressure >= 0.45 ||
        factors.overduePressure >= 0.5)) ||
    factors.errorPressure >= 0.7 ||
    (factors.overduePressure >= 0.65 && factors.importance >= 0.55);

  if (must && (factors.timePressure >= 0.42 || factors.priorityScore >= 0.2)) {
    return "must_know";
  }

  if (
    factors.priorityScore >= zachranMeConfig.importantScoreMin ||
    (factors.importance >= 0.55 && factors.weakness >= 0.28)
  ) {
    return "important";
  }

  return "if_time";
}

function reasonFor(
  bucket: ZachranMeBucket,
  item: {
    hasLearningEvidence: boolean;
    repeatedErrors: number;
    overdueReviews: number;
    remainingUnits: number;
    masteryPct: number | null;
    importance: number;
  },
  timePressure: number,
): string {
  const bits: string[] = [];
  if (!item.hasLearningEvidence) {
    bits.push("zatím podle pokrytí obsahu");
  } else if (item.masteryPct != null) {
    bits.push(
      item.masteryPct < 45
        ? "slabší mastery evidence"
        : item.masteryPct < 70
          ? "neúplná mastery evidence"
          : "lepší mastery evidence",
    );
  }
  if (item.repeatedErrors > 0) {
    bits.push(
      item.repeatedErrors === 1
        ? "1 opakovaná chyba"
        : `${item.repeatedErrors} opakovaných chyb`,
    );
  }
  if (item.overdueReviews > 0) {
    bits.push(
      item.overdueReviews === 1
        ? "1 splatné opakování"
        : `${item.overdueReviews} splatných opakování`,
    );
  }
  if (item.remainingUnits > 0) {
    bits.push(
      item.remainingUnits === 1
        ? "zbývá 1 jednotka"
        : `zbývá cca ${item.remainingUnits} jednotek`,
    );
  }
  if (item.importance >= 0.85) bits.push("vysoká exam váha");
  else if (item.importance >= 0.65) bits.push("střední exam váha");

  const pressure = timePressureLabelCs(timePressure).toLowerCase();
  const joined = bits.length > 0 ? bits.join(" · ") : "základní pokrytí";

  switch (bucket) {
    case "must_know":
      return `Musíš umět: ${joined} (${pressure}).`;
    case "important":
      return `Důležité: ${joined}.`;
    case "if_time":
      return `Pokud zbude čas: ${joined}.`;
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function packSteps(
  pool: PriorityItem[],
  budgetMinutes: number,
  maxSteps: number,
): { steps: HorizonStep[]; used: number } {
  const steps: HorizonStep[] = [];
  let used = 0;
  for (const item of pool) {
    if (steps.length >= maxSteps) break;
    const mins = Math.max(
      8,
      Math.min(40, item.estimatedMinutes || zachranMeConfig.defaultStepMinutes),
    );
    if (used + mins > budgetMinutes && steps.length > 0) break;
    const take =
      mins > budgetMinutes && steps.length === 0
        ? Math.min(mins, budgetMinutes)
        : mins;
    if (take > budgetMinutes && steps.length > 0) break;
    steps.push({
      order: steps.length + 1,
      titleCs: item.titleCs,
      reasonCs: item.reasonCs,
      href: item.href,
      estimatedMinutes: take,
      lane: item.lane,
      laneLabelCs: item.laneLabelCs,
      itemId: item.id,
      bucket: item.bucket,
    });
    used += take;
  }
  return { steps, used };
}

export function buildHorizonPlan(input: {
  mustKnow: PriorityItem[];
  important: PriorityItem[];
  ifTime: PriorityItem[];
  dailyMinutes: number;
  daysRemaining: number;
}): ZachranMeHorizon {
  const daily = clamp(input.dailyMinutes, 10, 240);
  const studyDays = estimateStudyDays(input.daysRemaining);
  const ordered = [
    ...input.mustKnow,
    ...input.important,
    ...input.ifTime,
  ];

  const todayPack = packSteps(
    ordered,
    daily,
    zachranMeConfig.maxTodaySteps,
  );
  const usedIds = new Set(todayPack.steps.map((s) => s.itemId));
  const rest = ordered.filter((i) => !usedIds.has(i.id));

  const tomorrowPack = packSteps(
    rest,
    daily,
    zachranMeConfig.maxTomorrowSteps,
  );
  const used2 = new Set([
    ...usedIds,
    ...tomorrowPack.steps.map((s) => s.itemId),
  ]);
  const weekPool = ordered.filter((i) => !used2.has(i.id));
  const weekBudget = Math.min(
    daily * Math.max(1, Math.min(studyDays, 5)),
    daily * 5,
  );
  const weekPack = packSteps(
    weekPool,
    weekBudget,
    zachranMeConfig.maxWeekThemes,
  );

  return {
    today: {
      key: "today",
      titleCs: "Dnes",
      minutesBudget: daily,
      totalMinutes: todayPack.used,
      steps: todayPack.steps,
      noteCs:
        todayPack.steps.length === 0
          ? "Dnes není kritická mezera ve zvoleném rozsahu — drž lehký review."
          : `Dnešní plán cca ${todayPack.used} min z ${daily} min.`,
    },
    tomorrow: {
      key: "tomorrow",
      titleCs: "Zítra",
      minutesBudget: daily,
      totalMinutes: tomorrowPack.used,
      steps: tomorrowPack.steps,
      noteCs:
        tomorrowPack.steps.length === 0
          ? "Zítra naváže na dnešek — přepočítá se podle nových výsledků."
          : `Zítřejší návrh cca ${tomorrowPack.used} min (orientační).`,
    },
    thisWeek: {
      key: "this_week",
      titleCs: "Tento týden",
      minutesBudget: weekBudget,
      totalMinutes: weekPack.used,
      steps: weekPack.steps,
      noteCs:
        weekPack.steps.length === 0
          ? "Týdenní rezerva je prázdná — fokus na Dnes a Zítra."
          : `Orientační týdenní témata (cca ${weekPack.used} min napříč dny). Bez falešné přesnosti na minutu.`,
    },
  };
}

/**
 * Build deadline triage plan from real candidates + inputs.
 */
export function buildZachranMePlan(input: {
  request: ZachranMeInput;
  candidates: TriageCandidate[];
  totalAttemptsHint?: number;
  now?: Date;
}): ZachranMePlan {
  const request = zachranMeInputSchema.parse(input.request);
  const now = input.now ?? new Date();
  const daysRemaining = daysRemainingTo(request.examDate, now);
  const timePressure = timePressureFromDays(daysRemaining);
  const studyDays = estimateStudyDays(daysRemaining);
  const dailyMinutes = request.dailyMinutes;

  const allowedLanes = new Set<ZachranMeLane>(
    request.scope === "both"
      ? ["materials", "cermat"]
      : request.scope === "materials"
        ? ["materials"]
        : ["cermat"],
  );
  const candidates = input.candidates.filter((c) => allowedLanes.has(c.lane));

  const evidenceLevel = resolveEvidenceLevel({
    candidates,
    totalAttemptsHint: input.totalAttemptsHint,
  });

  const scored: PriorityItem[] = candidates.map((c) => {
    const weakness = weaknessFromMastery(c.masteryPct);
    const errorPressure = clamp(c.repeatedErrors / 4, 0, 1);
    const overduePressure = clamp(c.overdueReviews / 6, 0, 1);
    const coveragePressure = clamp(c.remainingUnits / 8, 0.15, 1);
    const factors: AnalysisFactors = {
      masteryPct: c.masteryPct == null ? null : Math.round(c.masteryPct),
      weakness,
      importance: clamp(c.importance, 0.05, 1),
      errorPressure,
      overduePressure,
      coveragePressure,
      timePressure,
      priorityScore: 0,
    };
    factors.priorityScore = computePriorityScore(factors);
    const bucket = classifyBucket(factors);
    return {
      id: c.id,
      lane: c.lane,
      laneLabelCs: zachranMeLaneLabelsCs[c.lane],
      titleCs: c.titleCs,
      detailCs: c.detailCs,
      href: c.href,
      masteryPct: factors.masteryPct,
      hasLearningEvidence: c.hasLearningEvidence,
      importance: factors.importance,
      priorityScore: factors.priorityScore,
      factors,
      bucket,
      reasonCs: reasonFor(bucket, c, timePressure),
      estimatedMinutes: c.estimatedMinutes,
      remainingUnits: c.remainingUnits,
      repeatedErrors: c.repeatedErrors,
      overdueReviews: c.overdueReviews,
    };
  });

  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  const mustKnow = scored.filter((i) => i.bucket === "must_know").slice(0, 10);
  const important = scored
    .filter((i) => i.bucket === "important")
    .slice(0, 12);
  const ifTime = scored.filter((i) => i.bucket === "if_time").slice(0, 10);

  const horizon = buildHorizonPlan({
    mustKnow,
    important,
    ifTime,
    dailyMinutes,
    daysRemaining,
  });

  const laneWeakness = new Map<ZachranMeLane, number[]>();
  for (const c of candidates) {
    const list = laneWeakness.get(c.lane) ?? [];
    list.push(weaknessFromMastery(c.masteryPct));
    laneWeakness.set(c.lane, list);
  }
  const weakLaneLabelsCs = [...allowedLanes]
    .filter((lane) => {
      const vals = laneWeakness.get(lane);
      if (!vals?.length) return true;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return avg >= 0.45;
    })
    .map((l) => zachranMeLaneLabelsCs[l]);

  const remainingUnitsTotal = candidates.reduce(
    (s, c) => s + Math.max(0, c.remainingUnits),
    0,
  );
  const repeatedErrorsTotal = candidates.reduce(
    (s, c) => s + Math.max(0, c.repeatedErrors),
    0,
  );
  const overdueReviewsTotal = candidates.reduce(
    (s, c) => s + Math.max(0, c.overdueReviews),
    0,
  );

  return {
    examDate: request.examDate,
    examDateLabelCs: formatDeadlineCs(request.examDate),
    dailyMinutes,
    scope: request.scope,
    scopeLabelCs: zachranMeScopeLabelsCs[request.scope],
    daysRemaining,
    analysis: {
      daysRemaining,
      studyDaysEstimate: studyDays,
      timePressure,
      timePressureLabelCs: timePressureLabelCs(timePressure),
      dailyMinutes,
      totalStudyMinutesLeft: studyDays * dailyMinutes,
      evidenceLevel,
      evidenceDisclaimerCs: evidenceDisclaimerCs(evidenceLevel),
      remainingUnitsTotal,
      repeatedErrorsTotal,
      overdueReviewsTotal,
      weakLaneLabelsCs,
    },
    mustKnow,
    important,
    ifTime,
    horizon,
    startTodayHref: horizon.today.steps[0]?.href ?? (
      request.scope === "cermat" ? "/app/cermat" : "/app/materials"
    ),
    ctaLabelCs: "Začít dnešní plán",
    manifestoCs:
      "Zachraň mě je triáž podle termínu a rozsahu — ne náhodný cram. Pořadí bere chyby, splatné opakování, důležitost a zbývající dny. Bez falešné přesnosti.",
    generatedAt: now.toISOString(),
  };
}

/** CERMAT category candidates — only implemented drill categories. */
export function buildCermatTriageCandidates(input: {
  byCategory: CermatCategoryStats[];
  overdueByCategory?: Partial<Record<CermatCategory, number>>;
  errorsByCategory?: Partial<Record<CermatCategory, number>>;
}): TriageCandidate[] {
  return cermatCategories.map((category) => {
    const row = input.byCategory.find((r) => r.category === category);
    const attempts = row?.attempts ?? 0;
    const hasLearningEvidence = attempts > 0;
    const masteryPct = hasLearningEvidence
      ? (row?.accuracyPct ?? null)
      : null;
    const remainingUnits = hasLearningEvidence
      ? Math.max(0, Math.round((100 - (masteryPct ?? 40)) / 20))
      : 3;
    const repeatedErrors = input.errorsByCategory?.[category] ?? 0;
    const overdueReviews = input.overdueByCategory?.[category] ?? 0;
    return {
      id: `cermat-${category}`,
      lane: "cermat" as const,
      titleCs: cermatCategoryLabelsCs[category],
      detailCs: hasLearningEvidence
        ? `${attempts} pokusů · úspěšnost okolo ${Math.round(masteryPct ?? 0)} % (orientačně).`
        : "Zatím bez pokusů — priorita podle pokrytí katalogu, ne podle falešného %.",
      href: "/app/cermat",
      masteryPct,
      hasLearningEvidence,
      importance: cermatCategoryImportance[category],
      remainingUnits,
      repeatedErrors,
      overdueReviews,
      estimatedMinutes: 18,
    };
  });
}

/** @deprecated alias — prefer buildCermatTriageCandidates */
export function buildCermatCandidates(input: {
  byCategory: CermatCategoryStats[];
  forgettingBase?: number;
}): TriageCandidate[] {
  void input.forgettingBase;
  return buildCermatTriageCandidates({ byCategory: input.byCategory });
}

export type MaterialsTriageInput = {
  materials: Array<{
    id: string;
    title: string;
    status: string;
    knowledgePointCount: number;
    topicCount: number;
  }>;
  /** Optional mastery 0–100 per material id when known. */
  masteryByMaterialId?: Record<string, number>;
  errorsByMaterialId?: Record<string, number>;
  overdueByMaterialId?: Record<string, number>;
};

/** Moje materiály candidates — only ready materials with extractable content. */
export function buildMaterialsTriageCandidates(
  input: MaterialsTriageInput,
): TriageCandidate[] {
  const ready = input.materials.filter((m) => m.status === "ready");
  if (ready.length === 0) {
    return [
      {
        id: "materials-empty",
        lane: "materials",
        titleCs: "Nahraj materiály k učení",
        detailCs:
          "Bez připravených materiálů nelze triážovat Moje materiály. Matematika/AJ tu nejsou — jen ČJL podklady, které nahraješ.",
        href: "/app/materials",
        masteryPct: null,
        hasLearningEvidence: false,
        importance: 0.9,
        remainingUnits: 1,
        repeatedErrors: 0,
        overdueReviews: 0,
        estimatedMinutes: 15,
      },
    ];
  }

  return ready
    .slice(0, 16)
    .map((m) => {
      const mastery = input.masteryByMaterialId?.[m.id];
      const hasLearningEvidence = mastery != null;
      const kp = Math.max(0, m.knowledgePointCount);
      const remainingUnits =
        mastery != null
          ? Math.max(1, Math.round(kp * (1 - mastery / 100)))
          : Math.max(1, kp || m.topicCount || 2);
      return {
        id: `mat-${m.id}`,
        lane: "materials" as const,
        titleCs: m.title,
        detailCs: hasLearningEvidence
          ? `Cca ${kp} znalostních jednotek · mastery evidence okolo ${Math.round(mastery)} %.`
          : `Cca ${kp || m.topicCount} jednotek k pokrytí — zatím bez mastery evidence.`,
        href: `/app/materials?focus=${encodeURIComponent(m.id)}`,
        masteryPct: hasLearningEvidence ? mastery : null,
        hasLearningEvidence,
        importance: clamp(0.55 + Math.min(0.35, kp / 40), 0.5, 0.95),
        remainingUnits,
        repeatedErrors: input.errorsByMaterialId?.[m.id] ?? 0,
        overdueReviews: input.overdueByMaterialId?.[m.id] ?? 0,
        estimatedMinutes: clamp(12 + Math.min(20, Math.round(kp * 1.2)), 12, 35),
      };
    })
    .sort(
      (a, b) =>
        b.remainingUnits + b.repeatedErrors * 2 - (a.remainingUnits + a.repeatedErrors * 2),
    );
}

/** Repeated mistakes as first-class triage pressure (links to Moje chyby). */
export function buildMistakeTriageCandidates(input: {
  scope: ZachranMeScope;
  activeMistakes: Array<{
    id: string;
    titleCs: string;
    occurrenceCount: number;
    examValue?: number;
    source?: string | null;
  }>;
}): TriageCandidate[] {
  if (input.activeMistakes.length === 0) return [];
  const lane: ZachranMeLane =
    input.scope === "cermat" ? "cermat" : "materials";
  // One aggregated card + top individual mistakes (cap)
  const top = [...input.activeMistakes]
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
    .slice(0, 5);

  const aggregate: TriageCandidate = {
    id: "mistakes-queue",
    lane,
    titleCs: "Opakované chyby",
    detailCs: `${input.activeMistakes.length} aktivních chyb ve frontě Moje chyby.`,
    href: "/app/mistakes",
    masteryPct: null,
    hasLearningEvidence: true,
    importance: 0.95,
    remainingUnits: Math.min(8, input.activeMistakes.length),
    repeatedErrors: input.activeMistakes.reduce(
      (s, m) => s + Math.max(1, m.occurrenceCount),
      0,
    ),
    overdueReviews: 0,
    estimatedMinutes: clamp(10 + top.length * 4, 12, 28),
  };

  const individuals = top.map((m) => ({
    id: `mistake-${m.id}`,
    lane,
    titleCs: m.titleCs,
    detailCs: `Opakování: ${m.occurrenceCount}×`,
    href: "/app/mistakes",
    masteryPct: null as number | null,
    hasLearningEvidence: true,
    importance: clamp((m.examValue ?? 3) / 5, 0.5, 1),
    remainingUnits: 1,
    repeatedErrors: m.occurrenceCount,
    overdueReviews: 0,
    estimatedMinutes: 12,
  }));

  return [aggregate, ...individuals];
}

/** Overdue reviews pressure card when due queue is non-empty. */
export function buildOverdueTriageCandidate(input: {
  scope: ZachranMeScope;
  dueCount: number;
}): TriageCandidate | null {
  if (input.dueCount <= 0) return null;
  const lane: ZachranMeLane =
    input.scope === "cermat" ? "cermat" : "materials";
  return {
    id: "overdue-reviews",
    lane,
    titleCs: "Splatná opakování",
    detailCs: `${input.dueCount} položek po splatnosti — nejdřív to, na čem začínáš zapomínat.`,
    href: "/app/review/mixed",
    masteryPct: null,
    hasLearningEvidence: true,
    importance: 0.88,
    remainingUnits: Math.min(24, input.dueCount),
    repeatedErrors: 0,
    overdueReviews: input.dueCount,
    estimatedMinutes: clamp(Math.round(input.dueCount * 1.2), 10, 25),
  };
}

/** Lanes included by scope — for UI / filtering. */
export function lanesForScope(scope: ZachranMeScope): ZachranMeLane[] {
  if (scope === "both") return ["materials", "cermat"];
  return [scope];
}
