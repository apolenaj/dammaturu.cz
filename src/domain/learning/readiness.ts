import { z } from "zod";
import {
  computeMasteryAggregate,
  emptyMasteryState,
  masteryStateSchema,
  type MasteryState,
} from "@/domain/learning/mastery-engine";

/**
 * Připravenost (D-036) — centrální metriky z mastery coverage.
 * Není predikce úspěchu u maturity (žádné P(pass)).
 */

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
  /** Curriculum module slugs (documentation / future join). */
  moduleSlugs: string[];
  /** Immediate targeted practice session. */
  sessionHref: string;
  sessionLabelCs: string;
};

/** Fixed ČJL buckets for the readiness dashboard. */
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
    moduleSlugs: [
      "svetovy-realismus",
      "ceska-literatura-a-drama",
      "narodni-obrozeni",
    ],
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
  /** Chronological weekly overall snapshots for week delta. */
  weeklyHistory: z.array(weeklyAggregateSchema).max(52).default([]),
  updatedAt: z.string().datetime(),
});

export type ReadinessBook = z.infer<typeof readinessBookSchema>;

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

export type ReadinessSnapshot = {
  /** Rounded display % — mastery coverage aggregate. */
  overallPct: number;
  /** Change vs last weekly snapshot (e.g. +5). */
  weekDeltaPct: number;
  areas: AreaReadiness[];
  strongAreas: RankedArea[];
  weakAreas: RankedArea[];
  lowEvidence: boolean;
  labeledAs: "mastery_coverage";
  disclaimerCs: string;
  computedAt: string;
};

export const readinessDisclaimerCs =
  "Připravenost = vážené mastery coverage učiva. Není to predikce úspěchu u maturity ani „šance složit“.";

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
): { pct: number; lowEvidence: boolean } {
  const agg = computeMasteryAggregate({ items: units });
  return {
    pct: Math.round(agg.aggregate),
    lowEvidence: agg.lowEvidence,
  };
}

/**
 * Build UI snapshot from learner mastery book.
 * Strong / weak = top / bottom areas by coverage (up to 3).
 */
export function buildReadinessSnapshot(
  book: ReadinessBook,
  nowIso: string,
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

  const overall = aggregateUnits(
    book.units.map((u) => ({
      score: u.state.score,
      examWeight: u.examWeight,
      evidenceCount: u.state.evidenceCount,
    })),
  );

  const history = [...book.weeklyHistory].sort(
    (a, b) =>
      new Date(a.weekStartIso).getTime() - new Date(b.weekStartIso).getTime(),
  );
  const lastWeek = history.length >= 1 ? history[history.length - 1] : null;
  // Prefer previous week if current week already recorded as last entry matching overall
  const prev =
    history.length >= 2
      ? history[history.length - 2]
      : lastWeek && lastWeek.overallPct !== overall.pct
        ? lastWeek
        : history.length >= 1
          ? history[0]
          : null;
  const weekDeltaPct = prev ? overall.pct - Math.round(prev.overallPct) : 0;

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
    overallPct: overall.pct,
    weekDeltaPct,
    areas,
    strongAreas,
    weakAreas,
    lowEvidence: overall.lowEvidence,
    labeledAs: "mastery_coverage",
    disclaimerCs: readinessDisclaimerCs,
    computedAt: nowIso,
  };
}

export function formatWeekDeltaCs(delta: number): string {
  if (delta > 0) return `+${delta} % tento týden`;
  if (delta < 0) return `${delta} % tento týden`;
  return "0 % tento týden";
}

/** Score ring mastery hint for UI Score component. */
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
