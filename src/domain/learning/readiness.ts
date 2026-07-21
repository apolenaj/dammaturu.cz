import { z } from "zod";
import {
  computeMasteryAggregate,
  emptyMasteryState,
  masteryStateSchema,
  type MasteryState,
} from "@/domain/learning/mastery-engine";

/**
 * Evidence-based readiness (D-036 rebuild).
 * Not P(pass). Never show a confident % without enough evidence.
 * Formula version documented in docs/READINESS_FORMULA.md.
 */

export const READINESS_FORMULA_VERSION = "2026.07-evidence-v1";

export const readinessAreaIds = [
  "literarni-smery",
  "autori-dila",
  "rozbory",
  "jazyk",
] as const;

export type ReadinessAreaId = (typeof readinessAreaIds)[number];
export const readinessAreaIdSchema = z.enum(readinessAreaIds);

export type ReadinessAreaDef = {
  id: ReadinessAreaId;
  labelCs: string;
  moduleSlugs: string[];
  sessionHref: string;
  sessionLabelCs: string;
};

export const READINESS_AREAS: ReadinessAreaDef[] = [
  {
    id: "literarni-smery",
    labelCs: "Literární směry",
    moduleSlugs: ["literarni-smery"],
    sessionHref: "/app/learn/nauc-zpatky/cjl-teach-back",
    sessionLabelCs: "Teach It Back — směry",
  },
  {
    id: "autori-dila",
    labelCs: "Autoři a díla",
    moduleSlugs: ["svetovy-realismus", "ceska-literatura-a-drama", "narodni-obrozeni"],
    sessionHref: "/app/learn/kdo-jsem/literarni-osobnosti",
    sessionLabelCs: "Kdo jsem? — autoři",
  },
  {
    id: "rozbory",
    labelCs: "Rozbory",
    moduleSlugs: ["rozbory-del"],
    sessionHref: "/app/learn/rekonstrukce-pribehu/literarni-dej",
    sessionLabelCs: "Rekonstrukce příběhu",
  },
  {
    id: "jazyk",
    labelCs: "Jazyk",
    moduleSlugs: ["jazyk"],
    sessionHref: "/app/tests/otazky/cjl-otazky",
    sessionLabelCs: "Otázky — jazyk",
  },
];

export function readinessAreaById(
  id: ReadinessAreaId,
): ReadinessAreaDef | undefined {
  return READINESS_AREAS.find((a) => a.id === id);
}

/** Exam-part / behaviour dimensions for Maturita Score. */
export const readinessDimensionIds = [
  "didactic_test",
  "oral",
  "writing",
  "materials_mastery",
  "retention",
  "consistency",
] as const;

export type ReadinessDimensionId = (typeof readinessDimensionIds)[number];

export const readinessDimensionLabelsCs: Record<ReadinessDimensionId, string> = {
  didactic_test: "Didaktický test",
  oral: "Ústní zkouška",
  writing: "Písemná práce",
  materials_mastery: "Moje materiály",
  retention: "Retence",
  consistency: "Konzistence",
};

/** Weights for overall blend (must sum to 1). */
export const readinessDimensionWeights: Record<ReadinessDimensionId, number> = {
  didactic_test: 0.25,
  oral: 0.2,
  writing: 0.15,
  materials_mastery: 0.15,
  retention: 0.15,
  consistency: 0.1,
};

/**
 * Minimum graded signals before we show a point estimate for that dimension.
 * Below → confidence "insufficient" and no confident %.
 */
export const dimensionEvidenceThresholds: Record<
  ReadinessDimensionId,
  { min: number; moderate: number; high: number }
> = {
  didactic_test: { min: 8, moderate: 16, high: 32 },
  oral: { min: 3, moderate: 6, high: 12 },
  writing: { min: 4, moderate: 8, high: 16 },
  materials_mastery: { min: 5, moderate: 10, high: 20 },
  retention: { min: 6, moderate: 12, high: 24 },
  consistency: { min: 4, moderate: 8, high: 14 },
};

/** Overall needs at least this many dimension evidence points (sum) + 2 scored dims. */
export const overallEvidenceConfig = {
  minTotalEvidence: 12,
  minScoredDimensions: 2,
  moderateTotalEvidence: 28,
  highTotalEvidence: 56,
} as const;

export const confidenceLevels = [
  "insufficient",
  "low",
  "moderate",
  "high",
] as const;
export type ConfidenceLevel = (typeof confidenceLevels)[number];

export const confidenceLabelsCs: Record<ConfidenceLevel, string> = {
  insufficient: "Nedostatek dat",
  low: "Nízká jistota",
  moderate: "Střední jistota",
  high: "Vysoká jistota",
};

export const readinessTrends = [
  "improving",
  "stable",
  "declining",
  "unknown",
] as const;
export type ReadinessTrend = (typeof readinessTrends)[number];

export const readinessTrendLabelsCs: Record<ReadinessTrend, string> = {
  improving: "Zlepšuje se",
  stable: "Stabilní",
  declining: "Klesá",
  unknown: "Zatím bez trendu",
};

export const readinessUnitSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  areaId: readinessAreaIdSchema,
  examWeight: z.number().min(0.1).max(10),
  state: masteryStateSchema,
});

export type ReadinessUnit = z.infer<typeof readinessUnitSchema>;

export const weeklyAggregateSchema = z.object({
  weekStartIso: z.string().datetime(),
  overallPct: z.number().min(0).max(100),
});

export type WeeklyAggregate = z.infer<typeof weeklyAggregateSchema>;

export const readinessBookSchema = z.object({
  learnerId: z.string().min(1).max(64),
  units: z.array(readinessUnitSchema).min(0).max(500),
  weeklyHistory: z.array(weeklyAggregateSchema).max(52).default([]),
  updatedAt: z.string().datetime(),
});

export type ReadinessBook = z.infer<typeof readinessBookSchema>;

export const readinessHistoryPointSchema = z.object({
  at: z.string().datetime(),
  formulaVersion: z.string().min(1).max(40),
  /** Provisional blend (may be shown only when confident). */
  provisionalPct: z.number().min(0).max(100).nullable(),
  /** Confident overall — null when withheld. */
  overallPct: z.number().min(0).max(100).nullable(),
  confidence: z.enum(confidenceLevels),
  trend: z.enum(readinessTrends),
  dimensions: z.record(z.string(), z.number().min(0).max(100).nullable()),
  totalEvidence: z.number().int().min(0),
});

export type ReadinessHistoryPoint = z.infer<typeof readinessHistoryPointSchema>;

export type AreaReadiness = {
  id: ReadinessAreaId;
  labelCs: string;
  pct: number;
  kuCount: number;
  evidenceKuCount: number;
  sessionHref: string;
  sessionLabelCs: string;
};

export type RankedArea = {
  id: ReadinessAreaId;
  labelCs: string;
  pct: number;
  reasonCs: string;
  sessionHref: string;
  sessionLabelCs: string;
};

export type DimensionReadiness = {
  id: ReadinessDimensionId;
  labelCs: string;
  /** Point estimate — null when confidence is insufficient. */
  scorePct: number | null;
  /** Always computed when any signal exists; never shown as “confident Maturita %”. */
  provisionalPct: number | null;
  evidenceCount: number;
  evidenceRequired: number;
  attemptsNeeded: number;
  confidence: ConfidenceLevel;
  messageCs: string;
  weight: number;
  sessionHref: string;
};

export type OverallReadiness = {
  scorePct: number | null;
  provisionalPct: number | null;
  confidence: ConfidenceLevel;
  attemptsNeeded: number;
  messageCs: string;
  scoredDimensionCount: number;
  totalEvidence: number;
};

export type ReadinessSnapshot = {
  overall: OverallReadiness;
  dimensions: DimensionReadiness[];
  trend: ReadinessTrend;
  trendLabelCs: string;
  trendDeltaPct: number | null;
  areas: AreaReadiness[];
  strongAreas: RankedArea[];
  weakAreas: RankedArea[];
  history: ReadinessHistoryPoint[];
  formulaVersion: string;
  /** @deprecated use overall.scorePct / overall.provisionalPct */
  overallPct: number;
  weekDeltaPct: number;
  lowEvidence: boolean;
  labeledAs: "evidence_readiness";
  disclaimerCs: string;
  computedAt: string;
};

export const readinessDisclaimerCs =
  "Připravenost je evidence-based odhad z cvičení, opakování a materiálů. Není to predikce úspěchu u maturity ani „šance složit“.";

/** Raw signals gathered server-side — never invent. */
export type ReadinessEvidenceInput = {
  book: ReadinessBook;
  nowIso: string;
  /** Graded QE / test attempts (didactic). */
  didacticEvidenceCount: number;
  didacticAccuracyPct: number | null;
  /** Mock oral / free-recall oral-like. */
  oralEvidenceCount: number;
  oralScorePct: number | null;
  /** Long answers / writing-like. */
  writingEvidenceCount: number;
  writingScorePct: number | null;
  /** Materials study practice. */
  materialsEvidenceCount: number;
  materialsScorePct: number | null;
  /** FSRS / review retention proxy 0–100. */
  retentionEvidenceCount: number;
  retentionScorePct: number | null;
  /** Active days in window / streak proxy 0–100. */
  consistencyEvidenceCount: number;
  consistencyScorePct: number | null;
  /** Prior saved history points (oldest → newest). */
  history?: ReadinessHistoryPoint[];
};

export function stateWithScore(
  knowledgeUnitId: string,
  score: number,
  nowIso: string,
  evidenceCount = 3,
): MasteryState {
  const base = emptyMasteryState(knowledgeUnitId, nowIso);
  const s = Math.max(0, Math.min(100, score));
  let band: MasteryState["band"] = "not_seen";
  if (s <= 0 && evidenceCount === 0) band = "not_seen";
  else if (s < 15) band = "introduced";
  else if (s < 40) band = "learning";
  else if (s < 60) band = "familiar";
  else if (s < 80) band = "strong";
  else band = evidenceCount >= 5 ? "mastered" : "strong";

  return {
    ...base,
    score: s,
    band,
    peakBand:
      band === "mastered" ||
      band === "strong" ||
      band === "familiar" ||
      band === "learning" ||
      band === "introduced" ||
      band === "not_seen"
        ? band
        : "familiar",
    evidenceCount,
    successfulRecalls: Math.min(evidenceCount, Math.floor(s / 20)),
    correctStreak: s >= 60 ? 2 : 0,
    introducedAt: nowIso,
    lastEvidenceAt: nowIso,
    lastSuccessfulRecallAt: s >= 40 ? nowIso : null,
    updatedAt: nowIso,
  };
}

function aggregateUnits(
  units: Array<{ score: number; examWeight: number; evidenceCount: number }>,
): { pct: number; lowEvidence: boolean; evidenceSum: number } {
  const agg = computeMasteryAggregate({ items: units });
  return {
    pct: Math.round(agg.aggregate),
    lowEvidence: agg.lowEvidence,
    evidenceSum: units.reduce((s, u) => s + u.evidenceCount, 0),
  };
}

export function confidenceFromEvidence(
  evidenceCount: number,
  thresholds: { min: number; moderate: number; high: number },
): ConfidenceLevel {
  if (evidenceCount < thresholds.min) return "insufficient";
  if (evidenceCount < thresholds.moderate) return "low";
  if (evidenceCount < thresholds.high) return "moderate";
  return "high";
}

export function attemptsNeededCs(needed: number): string {
  if (needed <= 0) return "Máme dost podkladů pro opatrný odhad.";
  return `Potřebujeme ještě ${needed} ${
    needed === 1 ? "pokus" : needed < 5 ? "pokusy" : "pokusů"
  } pro spolehlivější odhad.`;
}

function blendMasteryWithSignal(
  masteryPct: number | null,
  signalPct: number | null,
  masteryWeight = 0.55,
): number | null {
  if (masteryPct == null && signalPct == null) return null;
  if (masteryPct == null) return signalPct;
  if (signalPct == null) return masteryPct;
  return Math.round(
    masteryPct * masteryWeight + signalPct * (1 - masteryWeight),
  );
}

function dimensionSessionHref(id: ReadinessDimensionId): string {
  switch (id) {
    case "didactic_test":
      return "/app/tests/otazky/cjl-otazky";
    case "oral":
      return "/app/tests";
    case "writing":
      return "/app/learn/nauc-zpatky/cjl-teach-back";
    case "materials_mastery":
      return "/app/materials/study";
    case "retention":
      return "/app/review";
    case "consistency":
      return "/app/dashboard";
    default:
      return "/app/progress";
  }
}

function buildDimension(input: {
  id: ReadinessDimensionId;
  evidenceCount: number;
  provisionalPct: number | null;
}): DimensionReadiness {
  const thresholds = dimensionEvidenceThresholds[input.id];
  const confidence = confidenceFromEvidence(input.evidenceCount, thresholds);
  const attemptsNeeded = Math.max(0, thresholds.min - input.evidenceCount);
  const scorePct =
    confidence === "insufficient" ? null : input.provisionalPct;

  return {
    id: input.id,
    labelCs: readinessDimensionLabelsCs[input.id],
    scorePct,
    provisionalPct: input.provisionalPct,
    evidenceCount: input.evidenceCount,
    evidenceRequired: thresholds.min,
    attemptsNeeded,
    confidence,
    messageCs:
      confidence === "insufficient"
        ? attemptsNeededCs(attemptsNeeded)
        : confidence === "low"
          ? `Odhad s nízkou jistotou — ${attemptsNeededCs(
              Math.max(0, thresholds.moderate - input.evidenceCount),
            )}`
          : "Odhad podložený cvičením.",
    weight: readinessDimensionWeights[input.id],
    sessionHref: dimensionSessionHref(input.id),
  };
}

function computeOverall(
  dimensions: DimensionReadiness[],
): OverallReadiness {
  const scored = dimensions.filter((d) => d.scorePct != null);
  const withProvisional = dimensions.filter((d) => d.provisionalPct != null);
  const totalEvidence = dimensions.reduce((s, d) => s + d.evidenceCount, 0);

  let provisionalPct: number | null = null;
  if (withProvisional.length > 0) {
    let num = 0;
    let den = 0;
    for (const d of withProvisional) {
      num += d.weight * (d.provisionalPct ?? 0);
      den += d.weight;
    }
    provisionalPct = den > 0 ? Math.round(num / den) : null;
  }

  const overallConfidence = confidenceFromEvidence(totalEvidence, {
    min: overallEvidenceConfig.minTotalEvidence,
    moderate: overallEvidenceConfig.moderateTotalEvidence,
    high: overallEvidenceConfig.highTotalEvidence,
  });

  const enoughDims =
    scored.length >= overallEvidenceConfig.minScoredDimensions;
  const showOverall =
    enoughDims && overallConfidence !== "insufficient" && provisionalPct != null;

  const attemptsNeeded = Math.max(
    0,
    overallEvidenceConfig.minTotalEvidence - totalEvidence,
    ...dimensions.map((d) => d.attemptsNeeded),
  );

  return {
    scorePct: showOverall ? provisionalPct : null,
    provisionalPct,
    confidence: showOverall ? overallConfidence : "insufficient",
    attemptsNeeded,
    messageCs: showOverall
      ? overallConfidence === "low"
        ? "Odhad je předběžný — přidej ještě cvičení pro vyšší jistotu."
        : "Odhad z dostupných dimenzí (ne predikce maturity)."
      : attemptsNeededCs(
          Math.max(
            attemptsNeeded,
            scored.length < overallEvidenceConfig.minScoredDimensions
              ? overallEvidenceConfig.minScoredDimensions - scored.length
              : 0,
          ),
        ),
    scoredDimensionCount: scored.length,
    totalEvidence,
  };
}

export function computeTrend(
  history: ReadinessHistoryPoint[],
  currentProvisional: number | null,
): { trend: ReadinessTrend; deltaPct: number | null } {
  const series = history
    .map((h) => h.overallPct ?? h.provisionalPct)
    .filter((n): n is number => n != null);
  if (currentProvisional != null) series.push(currentProvisional);
  if (series.length < 2) return { trend: "unknown", deltaPct: null };

  const recent = series.slice(-4);
  const first = recent[0]!;
  const last = recent[recent.length - 1]!;
  const delta = Math.round((last - first) * 10) / 10;
  if (delta >= 3) return { trend: "improving", deltaPct: delta };
  if (delta <= -3) return { trend: "declining", deltaPct: delta };
  return { trend: "stable", deltaPct: delta };
}

/**
 * Build evidence-based readiness snapshot.
 * Curriculum area bars remain as secondary coverage view.
 */
export function buildReadinessSnapshot(
  book: ReadinessBook,
  nowIso: string,
  evidence?: Omit<ReadinessEvidenceInput, "book" | "nowIso">,
): ReadinessSnapshot {
  const areas: AreaReadiness[] = READINESS_AREAS.map((def) => {
    const units = book.units.filter((u) => u.areaId === def.id);
    const { pct } = aggregateUnits(
      units.map((u) => ({
        score: u.state.score,
        examWeight: u.examWeight,
        evidenceCount: u.state.evidenceCount,
      })),
    );
    return {
      id: def.id,
      labelCs: def.labelCs,
      pct: units.length === 0 ? 0 : pct,
      kuCount: units.length,
      evidenceKuCount: units.filter((u) => u.state.evidenceCount >= 2).length,
      sessionHref: def.sessionHref,
      sessionLabelCs: def.sessionLabelCs,
    };
  });

  const masteryAgg = aggregateUnits(
    book.units.map((u) => ({
      score: u.state.score,
      examWeight: u.examWeight,
      evidenceCount: u.state.evidenceCount,
    })),
  );

  const areaMastery = (ids: ReadinessAreaId[]) => {
    const units = book.units.filter((u) => ids.includes(u.areaId));
    if (units.length === 0) return null;
    return aggregateUnits(
      units.map((u) => ({
        score: u.state.score,
        examWeight: u.examWeight,
        evidenceCount: u.state.evidenceCount,
      })),
    ).pct;
  };

  const ev = evidence ?? {
    didacticEvidenceCount: masteryAgg.evidenceSum,
    didacticAccuracyPct: masteryAgg.pct,
    oralEvidenceCount: 0,
    oralScorePct: null,
    writingEvidenceCount: 0,
    writingScorePct: null,
    materialsEvidenceCount: 0,
    materialsScorePct: null,
    retentionEvidenceCount: 0,
    retentionScorePct: null,
    consistencyEvidenceCount: 0,
    consistencyScorePct: null,
    history: [],
  };

  const didacticMastery = areaMastery(["jazyk", "literarni-smery", "autori-dila"]);
  const oralMastery = areaMastery(["rozbory", "autori-dila", "literarni-smery"]);
  const writingMastery = areaMastery(["rozbory", "jazyk"]);

  const dimensions: DimensionReadiness[] = [
    buildDimension({
      id: "didactic_test",
      evidenceCount: ev.didacticEvidenceCount,
      provisionalPct: blendMasteryWithSignal(
        didacticMastery,
        ev.didacticAccuracyPct,
        0.5,
      ),
    }),
    buildDimension({
      id: "oral",
      evidenceCount: ev.oralEvidenceCount,
      provisionalPct: blendMasteryWithSignal(
        oralMastery,
        ev.oralScorePct,
        0.4,
      ),
    }),
    buildDimension({
      id: "writing",
      evidenceCount: ev.writingEvidenceCount,
      provisionalPct: blendMasteryWithSignal(
        writingMastery,
        ev.writingScorePct,
        0.45,
      ),
    }),
    buildDimension({
      id: "materials_mastery",
      evidenceCount: ev.materialsEvidenceCount,
      provisionalPct: ev.materialsScorePct,
    }),
    buildDimension({
      id: "retention",
      evidenceCount: ev.retentionEvidenceCount,
      provisionalPct: ev.retentionScorePct,
    }),
    buildDimension({
      id: "consistency",
      evidenceCount: ev.consistencyEvidenceCount,
      provisionalPct: ev.consistencyScorePct,
    }),
  ];

  const overall = computeOverall(dimensions);
  const history = [...(ev.history ?? [])].slice(-40);
  const { trend, deltaPct } = computeTrend(history, overall.provisionalPct);

  const historyForWeek = [...book.weeklyHistory].sort(
    (a, b) =>
      new Date(a.weekStartIso).getTime() - new Date(b.weekStartIso).getTime(),
  );
  const prevWeek =
    historyForWeek.length >= 2
      ? historyForWeek[historyForWeek.length - 2]
      : historyForWeek[0] ?? null;
  const weekDeltaPct = prevWeek
    ? Math.round((overall.provisionalPct ?? masteryAgg.pct) - prevWeek.overallPct)
    : deltaPct != null
      ? Math.round(deltaPct)
      : 0;

  const ranked = [...areas].sort((a, b) => b.pct - a.pct);
  const strongAreas: RankedArea[] = ranked.slice(0, 3).map((a) => ({
    id: a.id,
    labelCs: a.labelCs,
    pct: a.pct,
    reasonCs:
      a.pct >= 75
        ? "Stabilní pokrytí mastery v této oblasti."
        : "Relativně nejsilnější oblast (stále má prostor).",
    sessionHref: a.sessionHref,
    sessionLabelCs: a.sessionLabelCs,
  }));

  const weakAreas: RankedArea[] = [...areas]
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3)
    .map((a) => ({
      id: a.id,
      labelCs: a.labelCs,
      pct: a.pct,
      reasonCs:
        a.pct < 55
          ? "Nejnižší mastery coverage — ideální na cílenou session."
          : "Slabší než ostatní oblasti.",
      sessionHref: a.sessionHref,
      sessionLabelCs: a.sessionLabelCs,
    }));

  return {
    overall,
    dimensions,
    trend,
    trendLabelCs: readinessTrendLabelsCs[trend],
    trendDeltaPct: deltaPct,
    areas,
    strongAreas,
    weakAreas,
    history,
    formulaVersion: READINESS_FORMULA_VERSION,
    overallPct: overall.scorePct ?? overall.provisionalPct ?? 0,
    weekDeltaPct,
    lowEvidence: overall.confidence === "insufficient" || masteryAgg.lowEvidence,
    labeledAs: "evidence_readiness",
    disclaimerCs: readinessDisclaimerCs,
    computedAt: nowIso,
  };
}

export function formatWeekDeltaCs(delta: number): string {
  if (delta > 0) return `+${delta} % tento týden`;
  if (delta < 0) return `${delta} % tento týden`;
  return "0 % tento týden";
}

export function readinessToScoreMastery(
  pct: number,
): "unknown" | "exposed" | "fragile" | "stable" | "proficient" | "mastered" {
  if (pct < 15) return "unknown";
  if (pct < 40) return "fragile";
  if (pct < 60) return "exposed";
  if (pct < 75) return "stable";
  if (pct < 90) return "proficient";
  return "mastered";
}

/** Build a history point from a live snapshot (for persistence). */
export function snapshotToHistoryPoint(
  snap: ReadinessSnapshot,
): ReadinessHistoryPoint {
  const dimensions: Record<string, number | null> = {};
  for (const d of snap.dimensions) {
    dimensions[d.id] = d.scorePct ?? d.provisionalPct;
  }
  return readinessHistoryPointSchema.parse({
    at: snap.computedAt,
    formulaVersion: snap.formulaVersion,
    provisionalPct: snap.overall.provisionalPct,
    overallPct: snap.overall.scorePct,
    confidence: snap.overall.confidence,
    trend: snap.trend,
    dimensions,
    totalEvidence: snap.overall.totalEvidence,
  });
}

/** Monday 00:00 UTC for weekly aggregate. */
export function weekStartIso(nowIso: string): string {
  const d = new Date(nowIso);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export function upsertWeeklyHistory(
  book: ReadinessBook,
  overallPct: number,
  nowIso: string,
): ReadinessBook {
  const start = weekStartIso(nowIso);
  const history = [...book.weeklyHistory];
  const idx = history.findIndex((h) => h.weekStartIso === start);
  if (idx >= 0) {
    history[idx] = { weekStartIso: start, overallPct };
  } else {
    history.push({ weekStartIso: start, overallPct });
  }
  return {
    ...book,
    weeklyHistory: history.slice(-52),
    updatedAt: nowIso,
  };
}
