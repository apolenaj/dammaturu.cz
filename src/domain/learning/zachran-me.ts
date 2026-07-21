import { z } from "zod";
import type { CurriculumPackLike } from "@/domain/learning/beta-learning-path";
import { flattenPackTopics } from "@/domain/learning/beta-learning-path";
import {
  cermatCategories,
  cermatCategoryLabelsCs,
  type CermatCategory,
  type CermatCategoryStats,
} from "@/domain/learning/cermat-prep";
import type { LiteratureBook } from "@/domain/learning/literature-maturity";
import { BETA_TARGET_DATE } from "@/domain/onboarding/schema";

/**
 * Zachraň mě — emergency study planner (D-041 / D-056).
 * Triage by readiness × weakness × importance × time remaining.
 * Only surfaces exam components the product actually supports.
 */

/** Components with a real practice path in the app. */
export const zachranMeComponents = [
  "cermat_didactic",
  "oral_literature",
  "language_topics",
] as const;

export type ZachranMeComponent = (typeof zachranMeComponents)[number];

export const zachranMeComponentLabelsCs: Record<ZachranMeComponent, string> = {
  cermat_didactic: "Didaktický test CERMAT",
  oral_literature: "Ústní — literatura",
  language_topics: "Jazyk a literární znalosti",
};

export const zachranMeComponentHintsCs: Record<ZachranMeComponent, string> = {
  cermat_didactic:
    "Cvičný modul CERMAT ČJL — kategorie didaktického testu (/app/cermat).",
  oral_literature:
    "Seznam knih, karty a ústní simulace (/app/literature, /app/simulation).",
  language_topics:
    "Kurikulum ČJL — témata s exam relevance (/app/topics, rozbory).",
};

export const zachranMeComponentHrefs: Record<ZachranMeComponent, string> = {
  cermat_didactic: "/app/cermat",
  oral_literature: "/app/literature",
  language_topics: "/app/topics",
};

/** Default importance when component is selected (0–1). */
export const zachranMeComponentImportance: Record<ZachranMeComponent, number> =
  {
    cermat_didactic: 0.95,
    oral_literature: 0.9,
    language_topics: 0.7,
  };

export const zachranMeBuckets = [
  "must_know",
  "high_impact",
  "should_know",
  "if_time",
  "already_knows",
] as const;

export type ZachranMeBucket = (typeof zachranMeBuckets)[number];

export const zachranMeBucketLabelsCs: Record<ZachranMeBucket, string> = {
  must_know: "MUSÍŠ UMĚT",
  high_impact: "HIGH IMPACT",
  should_know: "MĚL/A BYS UMĚT",
  if_time: "POKUD ZBUDE ČAS",
  already_knows: "UŽ UMÍŠ — NEPLÝTVEJ ČASEM",
};

export const zachranMeBucketHintsCs: Record<ZachranMeBucket, string> = {
  must_know:
    "Kritické mezery před termínem — bez toho maturitu neudržíš. Priorita číslo 1.",
  high_impact:
    "Nejvyšší poměr slabina × důležitost. Po must-know jdi sem — největší zisk za čas.",
  should_know:
    "Mělo by sedět, ale není to akutní propad. Zařaď po high impact.",
  if_time:
    "Až zbude kapacita. Nesmí vytlačit must-know ani high impact.",
  already_knows:
    "Držíš to. Neplýtvej časem na opakování „pro jistotu“.",
};

export const examRelevanceWeights: Record<string, number> = {
  none: 0.05,
  low: 0.25,
  medium: 0.5,
  high: 0.8,
  critical: 1,
};

/** Relative importance inside CERMAT category drills. */
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
  knowsThreshold: 75,
  knowsForgetMax: 0.4,
  mustImportanceMin: 0.72,
  mustWeaknessMin: 0.35,
  highImpactScoreMin: 0.28,
  shouldImportanceMin: 0.4,
  shouldWeaknessMin: 0.18,
  /** Minutes assumed per packed session step when candidate has none. */
  defaultStepMinutes: 15,
  maxSessionSteps: 6,
  minAvailableHours: 0.5,
  maxAvailableHours: 12,
} as const;

export const zachranMeInputSchema = z.object({
  examDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const d = new Date(`${value}T12:00:00`);
      return !Number.isNaN(d.getTime());
    }, "Neplatný termín maturity"),
  availableHours: z
    .number()
    .min(zachranMeConfig.minAvailableHours)
    .max(zachranMeConfig.maxAvailableHours),
  components: z
    .array(z.enum(zachranMeComponents))
    .min(1, "Vyber alespoň jednu složku maturity")
    .max(zachranMeComponents.length),
});

export type ZachranMeInput = z.infer<typeof zachranMeInputSchema>;

export type EmergencyCandidate = {
  id: string;
  component: ZachranMeComponent;
  titleCs: string;
  detailCs: string;
  href: string;
  /** 0–100 observed or provisional readiness. */
  readinessPct: number;
  /** 0–1 exam-component importance for this item. */
  importance: number;
  /** 0–1 forgetting / due pressure. */
  forgettingRisk: number;
  estimatedMinutes: number;
};

export type AnalysisFactors = {
  readinessPct: number;
  weakness: number;
  importance: number;
  forgettingRisk: number;
  timePressure: number;
  impactScore: number;
};

export type PriorityItem = {
  id: string;
  component: ZachranMeComponent;
  componentLabelCs: string;
  titleCs: string;
  detailCs: string;
  href: string;
  readinessPct: number;
  importance: number;
  impactScore: number;
  factors: AnalysisFactors;
  bucket: ZachranMeBucket;
  reasonCs: string;
  estimatedMinutes: number;
};

export type NextStudySessionStep = {
  order: number;
  titleCs: string;
  reasonCs: string;
  href: string;
  estimatedMinutes: number;
  component: ZachranMeComponent;
  componentLabelCs: string;
  itemId: string;
};

export type NextStudySession = {
  titleCs: string;
  directiveCs: string;
  totalMinutes: number;
  availableMinutes: number;
  steps: NextStudySessionStep[];
  startHref: string;
};

export type ZachranMeAnalysisSummary = {
  daysRemaining: number;
  timePressure: number;
  timePressureLabelCs: string;
  totalAvailableMinutes: number;
  overallReadinessPct: number | null;
  weakComponentLabelsCs: string[];
};

export type ZachranMePlan = {
  examDate: string;
  examDateLabelCs: string;
  availableHours: number;
  components: ZachranMeComponent[];
  componentLabelsCs: string[];
  daysRemaining: number;
  analysis: ZachranMeAnalysisSummary;
  mustKnow: PriorityItem[];
  highImpact: PriorityItem[];
  shouldKnow: PriorityItem[];
  ifTime: PriorityItem[];
  alreadyKnows: PriorityItem[];
  nextSession: NextStudySession;
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

/** 0–1 urgency from calendar pressure. */
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

export function weaknessFromMastery(masteryPct: number): number {
  const m = Math.max(0, Math.min(100, masteryPct));
  return Math.round((1 - m / 100) * 1000) / 1000;
}

export function computeImpactScore(input: {
  importance: number;
  weakness: number;
  forgettingRisk: number;
  timePressure: number;
}): number {
  const forget = Math.max(0.08, Math.min(1, input.forgettingRisk));
  const score =
    input.importance *
    Math.max(0.05, input.weakness) *
    (0.45 + 0.55 * forget) *
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

function reasonFor(
  bucket: ZachranMeBucket,
  factors: AnalysisFactors,
): string {
  const base = `Připravenost ${factors.readinessPct} % · důležitost ${(factors.importance * 100).toFixed(0)} % · dopad ${factors.impactScore.toFixed(2)}`;
  switch (bucket) {
    case "must_know":
      return `${base} — kritická mezera při ${timePressureLabelCs(factors.timePressure).toLowerCase()}.`;
    case "high_impact":
      return `${base} — největší zisk za studijní minutu.`;
    case "should_know":
      return `${base} — mělo by sedět před termínem, nejdřív must/high.`;
    case "if_time":
      return `${base} — až zbude kapacita.`;
    case "already_knows":
      return `${base} — držíš; neplýtvej časem.`;
  }
}

function classifyBucket(
  factors: AnalysisFactors,
): ZachranMeBucket {
  const knows =
    factors.readinessPct >= zachranMeConfig.knowsThreshold &&
    factors.forgettingRisk < zachranMeConfig.knowsForgetMax;
  if (knows) return "already_knows";

  if (
    factors.importance >= zachranMeConfig.mustImportanceMin &&
    factors.weakness >= zachranMeConfig.mustWeaknessMin &&
    (factors.timePressure >= 0.55 || factors.impactScore >= 0.32)
  ) {
    return "must_know";
  }

  if (
    factors.impactScore >= zachranMeConfig.highImpactScoreMin ||
    (factors.importance >= 0.65 && factors.weakness >= 0.28)
  ) {
    return "high_impact";
  }

  if (
    factors.importance >= zachranMeConfig.shouldImportanceMin &&
    factors.weakness >= zachranMeConfig.shouldWeaknessMin
  ) {
    return "should_know";
  }

  return "if_time";
}

export function buildNextStudySession(input: {
  mustKnow: PriorityItem[];
  highImpact: PriorityItem[];
  shouldKnow: PriorityItem[];
  availableMinutes: number;
  daysRemaining: number;
}): NextStudySession {
  const pool = [
    ...input.mustKnow,
    ...input.highImpact,
    ...input.shouldKnow,
  ];
  const steps: NextStudySessionStep[] = [];
  let used = 0;
  for (const item of pool) {
    if (steps.length >= zachranMeConfig.maxSessionSteps) break;
    const mins = Math.max(
      8,
      Math.min(45, item.estimatedMinutes || zachranMeConfig.defaultStepMinutes),
    );
    if (used + mins > input.availableMinutes && steps.length > 0) break;
    if (mins > input.availableMinutes && steps.length === 0) {
      steps.push({
        order: 1,
        titleCs: item.titleCs,
        reasonCs: item.reasonCs,
        href: item.href,
        estimatedMinutes: Math.min(mins, input.availableMinutes),
        component: item.component,
        componentLabelCs: item.componentLabelCs,
        itemId: item.id,
      });
      used = Math.min(mins, input.availableMinutes);
      break;
    }
    steps.push({
      order: steps.length + 1,
      titleCs: item.titleCs,
      reasonCs: item.reasonCs,
      href: item.href,
      estimatedMinutes: mins,
      component: item.component,
      componentLabelCs: item.componentLabelCs,
      itemId: item.id,
    });
    used += mins;
  }

  const titles = steps.map((s) => s.titleCs).slice(0, 3);
  const directiveCs =
    steps.length === 0
      ? "Teď není kritická mezera v vybraných složkách — udrž lehký review, ať se forgetting nevrátí."
      : `Příští session (${used} min): ${titles.join(" → ")}${steps.length > 3 ? "…" : ""}. Nic dalšího nepřidávej.`;

  return {
    titleCs:
      input.daysRemaining <= 7
        ? "Nouzová session do maturity"
        : "Přesná příští studijní session",
    directiveCs,
    totalMinutes: used,
    availableMinutes: input.availableMinutes,
    steps,
    startHref: steps[0]?.href ?? "/app/dashboard",
  };
}

/**
 * Build emergency plan from candidate signals + inputs.
 */
export function buildZachranMePlan(input: {
  request: ZachranMeInput;
  candidates: EmergencyCandidate[];
  overallReadinessPct?: number | null;
  now?: Date;
}): ZachranMePlan {
  const request = zachranMeInputSchema.parse(input.request);
  const now = input.now ?? new Date();
  const daysRemaining = daysRemainingTo(request.examDate, now);
  const timePressure = timePressureFromDays(daysRemaining);
  const availableMinutes = Math.round(request.availableHours * 60);

  // Never invent unsupported components — filter strictly
  const allowed = new Set(request.components);
  const candidates = input.candidates.filter((c) => allowed.has(c.component));

  const scored: PriorityItem[] = candidates.map((c) => {
    const weakness = weaknessFromMastery(c.readinessPct);
    const factors: AnalysisFactors = {
      readinessPct: Math.round(c.readinessPct),
      weakness,
      importance: Math.max(0.05, Math.min(1, c.importance)),
      forgettingRisk: Math.max(0.08, Math.min(1, c.forgettingRisk)),
      timePressure,
      impactScore: 0,
    };
    factors.impactScore = computeImpactScore(factors);
    const bucket = classifyBucket(factors);
    return {
      id: c.id,
      component: c.component,
      componentLabelCs: zachranMeComponentLabelsCs[c.component],
      titleCs: c.titleCs,
      detailCs: c.detailCs,
      href: c.href,
      readinessPct: factors.readinessPct,
      importance: factors.importance,
      impactScore: factors.impactScore,
      factors,
      bucket,
      reasonCs: reasonFor(bucket, factors),
      estimatedMinutes: c.estimatedMinutes,
    };
  });

  scored.sort((a, b) => b.impactScore - a.impactScore);

  const mustKnow = scored.filter((i) => i.bucket === "must_know");
  const highImpact = scored.filter((i) => i.bucket === "high_impact");
  const shouldKnow = scored.filter((i) => i.bucket === "should_know");
  const ifTime = scored.filter((i) => i.bucket === "if_time");
  const alreadyKnows = scored.filter((i) => i.bucket === "already_knows");

  // Cap must_know display to avoid dumping everything when pressure is high
  const mustKnowCapped = mustKnow.slice(0, 8);
  const highImpactCapped = highImpact.slice(0, 10);
  const shouldKnowCapped = shouldKnow.slice(0, 10);
  const ifTimeCapped = ifTime.slice(0, 8);
  const alreadyKnowsCapped = alreadyKnows.slice(0, 8);

  const nextSession = buildNextStudySession({
    mustKnow: mustKnowCapped,
    highImpact: highImpactCapped,
    shouldKnow: shouldKnowCapped,
    availableMinutes,
    daysRemaining,
  });

  const componentReadiness = new Map<ZachranMeComponent, number[]>();
  for (const c of candidates) {
    const list = componentReadiness.get(c.component) ?? [];
    list.push(c.readinessPct);
    componentReadiness.set(c.component, list);
  }
  const weakComponentLabelsCs = request.components
    .filter((comp) => {
      const vals = componentReadiness.get(comp);
      if (!vals?.length) return true;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return avg < 55;
    })
    .map((c) => zachranMeComponentLabelsCs[c]);

  const analysis: ZachranMeAnalysisSummary = {
    daysRemaining,
    timePressure,
    timePressureLabelCs: timePressureLabelCs(timePressure),
    totalAvailableMinutes: availableMinutes,
    overallReadinessPct:
      input.overallReadinessPct == null
        ? null
        : Math.round(input.overallReadinessPct),
    weakComponentLabelsCs,
  };

  return {
    examDate: request.examDate,
    examDateLabelCs: formatDeadlineCs(request.examDate),
    availableHours: request.availableHours,
    components: request.components,
    componentLabelsCs: request.components.map(
      (c) => zachranMeComponentLabelsCs[c],
    ),
    daysRemaining,
    analysis,
    mustKnow: mustKnowCapped,
    highImpact: highImpactCapped,
    shouldKnow: shouldKnowCapped,
    ifTime: ifTimeCapped,
    alreadyKnows: alreadyKnowsCapped,
    nextSession,
    manifestoCs:
      "Zachraň mě je nouzový plánovač: termín × hodiny × složky maturity → triáž. Ne „nauč se náhodně všechno rychleji“. Příští session je přesný balíček — nic dalšího nepřidávej.",
    generatedAt: now.toISOString(),
  };
}

/** Candidates from CERMAT category performance. */
export function buildCermatCandidates(input: {
  byCategory: CermatCategoryStats[];
  forgettingBase?: number;
}): EmergencyCandidate[] {
  const forget = input.forgettingBase ?? 0.25;
  return cermatCategories.map((category) => {
    const row = input.byCategory.find((r) => r.category === category);
    const attempts = row?.attempts ?? 0;
    const readinessPct =
      row?.accuracyPct != null
        ? row.accuracyPct
        : attempts === 0
          ? 32
          : 40;
    const importance =
      zachranMeComponentImportance.cermat_didactic *
      cermatCategoryImportance[category];
    return {
      id: `cermat-${category}`,
      component: "cermat_didactic" as const,
      titleCs: cermatCategoryLabelsCs[category],
      detailCs:
        attempts === 0
          ? "Zatím bez pokusů v CERMAT tréninku — ber jako mezeru."
          : `${attempts} pokusů · úspěšnost ${readinessPct} %.`,
      href: "/app/cermat",
      readinessPct,
      importance: Math.min(1, importance),
      forgettingRisk: attempts === 0 ? Math.max(forget, 0.45) : forget,
      estimatedMinutes: 18,
    };
  });
}

/** Candidates from literature book mastery. */
export function buildOralLiteratureCandidates(input: {
  books: LiteratureBook[];
  forgettingBase?: number;
}): EmergencyCandidate[] {
  const forget = input.forgettingBase ?? 0.3;
  if (input.books.length === 0) {
    return [
      {
        id: "oral-no-books",
        component: "oral_literature",
        titleCs: "Doplň seznam knih k ústní",
        detailCs:
          "Bez vybraných knih nelze plánovat ústní. Přidej je v Literatuře nebo Profilu maturity.",
        href: "/app/literature",
        readinessPct: 10,
        importance: zachranMeComponentImportance.oral_literature,
        forgettingRisk: 0.5,
        estimatedMinutes: 20,
      },
    ];
  }

  return [...input.books]
    .sort((a, b) => a.mastery.scorePct - b.mastery.scorePct)
    .slice(0, 12)
    .map((book) => ({
      id: `oral-${book.id}`,
      component: "oral_literature" as const,
      titleCs: book.titleCs,
      detailCs: `Mastery ${book.mastery.scorePct} % · ${book.mastery.fieldsFilled}/12 polí · ${book.fields.author.valueCs?.trim() || "autor?"}`,
      href: `/app/literature?book=${encodeURIComponent(book.id)}`,
      readinessPct: book.mastery.scorePct,
      importance:
        book.mastery.scorePct < 45
          ? 0.95
          : book.mastery.scorePct < 70
            ? 0.85
            : 0.7,
      forgettingRisk:
        book.mastery.practiceCount === 0
          ? Math.max(forget, 0.55)
          : forget,
      estimatedMinutes: 22,
    }));
}

export function countDependents(
  pack: CurriculumPackLike,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const mod of pack.modules) {
    for (const t of mod.topics) {
      for (const pre of t.prerequisiteSlugs ?? []) {
        counts.set(pre, (counts.get(pre) ?? 0) + 1);
      }
    }
  }
  return counts;
}

/** Curriculum topic candidates (language_topics component). */
export function buildLanguageTopicCandidates(input: {
  pack: CurriculumPackLike;
  masteryBySlug?: Record<string, number>;
  masteryByModule?: Record<string, number>;
  forgettingBySlug?: Record<string, number>;
}): EmergencyCandidate[] {
  const dependents = countDependents(input.pack);
  const maxDep = Math.max(1, ...[...dependents.values()], 1);
  const topics = flattenPackTopics(input.pack);

  return topics.map((t) => {
    const readinessPct =
      input.masteryBySlug?.[t.slug] ??
      input.masteryByModule?.[t.moduleSlug] ??
      40;
    const examW = examRelevanceWeights[t.examRelevance] ?? 0.5;
    const prereqBoost = 0.25 + 0.75 * ((dependents.get(t.slug) ?? 0) / maxDep);
    const importance = Math.min(
      1,
      zachranMeComponentImportance.language_topics * examW * (0.7 + 0.3 * prereqBoost),
    );
    return {
      id: `topic-${t.slug}`,
      component: "language_topics" as const,
      titleCs: t.title,
      detailCs: `${t.moduleTitle} · exam ${t.examRelevance}`,
      href: `/app/topics?focus=${encodeURIComponent(t.slug)}`,
      readinessPct,
      importance,
      forgettingRisk: input.forgettingBySlug?.[t.slug] ?? 0.2,
      estimatedMinutes: 14,
    };
  });
}

/** @deprecated Use buildLanguageTopicCandidates — kept for pack signal helpers in tests. */
export function buildSignalsFromPack(input: {
  pack: CurriculumPackLike;
  masteryBySlug?: Record<string, number>;
  masteryByModule?: Record<string, number>;
  forgettingBySlug?: Record<string, number>;
}): EmergencyCandidate[] {
  return buildLanguageTopicCandidates(input);
}
