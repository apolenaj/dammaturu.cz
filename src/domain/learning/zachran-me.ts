import { z } from "zod";
import { BETA_TARGET_DATE, subjects, subjectLabels } from "@/domain/onboarding/schema";
import type { CurriculumPackLike } from "@/domain/learning/beta-learning-path";
import { flattenPackTopics } from "@/domain/learning/beta-learning-path";

/**
 * „Zachraň mě“ (D-041) — crisis Priority Plan when time is short.
 * NOT “learn everything faster randomly”.
 * Explicit triage: must today · can wait · already knows · risk.
 */

export const zachranMeBuckets = [
  "must_today",
  "can_wait",
  "already_knows",
  "risk",
] as const;

export type ZachranMeBucket = (typeof zachranMeBuckets)[number];

export const zachranMeBucketLabelsCs: Record<ZachranMeBucket, string> = {
  must_today: "Dnes musíš zvládnout toto",
  can_wait: "Toto může počkat",
  already_knows: "Toto už umíš",
  risk: "Toto je riziko",
};

export const zachranMeBucketHintsCs: Record<ZachranMeBucket, string> = {
  must_today:
    "Nejvyšší dopad na maturitu v dnešním time budgetu. Nic jiného dnes nepřebíjej.",
  can_wait:
    "Důležité později — dnes to přeskoč, ať nestihneš must-today.",
  already_knows:
    "Mastery drží. Neplýtvej timem na opakování „pro jistotu“.",
  risk:
    "Vysoká exam relevance + slabina / forgetting. Nestihneš-li must-today, toto je další line.",
};

export const examRelevanceWeights: Record<string, number> = {
  none: 0.05,
  low: 0.25,
  medium: 0.5,
  high: 0.8,
  critical: 1,
};

export const zachranMeConfig = {
  betaTargetDate: BETA_TARGET_DATE,
  /** Minutes assumed per must-today item. */
  minutesPerItem: 12,
  /** Hard cap of must-today items even with large budget. */
  maxMustToday: 4,
  /** Min items if at least one high-priority exists. */
  minMustToday: 1,
  /** Mastery threshold for „už umíš“. */
  knowsThreshold: 75,
  /** Risk: exam weight ≥ this AND (weak or forgetting). */
  riskExamFloor: 0.8,
  /** Weakness floor for risk bucket (1 − mastery/100). */
  riskWeaknessFloor: 0.35,
  /** Forgetting floor for risk. */
  riskForgetFloor: 0.45,
} as const;

export const zachranMeInputSchema = z.object({
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const d = new Date(`${value}T12:00:00`);
      return !Number.isNaN(d.getTime());
    }, "Neplatné deadline"),
  dailyMinutes: z.number().int().min(10).max(240),
  subjects: z
    .array(z.enum(subjects))
    .min(1, "Vyber alespoň jeden předmět")
    .max(6),
});

export type ZachranMeInput = z.infer<typeof zachranMeInputSchema>;

/** Per-topic signals supplied by the server (from curriculum + mastery + SR). */
export type ZachranMeTopicSignal = {
  topicId: string;
  slug: string;
  title: string;
  moduleSlug: string;
  moduleTitle: string;
  examRelevance: string;
  /** 0–100 mastery / readiness for topic or parent module. */
  masteryPct: number;
  /** 0–1 forgetting risk (due, overdue, lapses, low stability). */
  forgettingRisk: number;
  /** How many other topics list this as prerequisite (raw count). */
  dependentCount: number;
  href: string;
  /** Subject this topic belongs to (beta: cjl). */
  subject: (typeof subjects)[number];
};

export type PriorityFactors = {
  examRelevance: number;
  weakness: number;
  forgettingRisk: number;
  prerequisiteImportance: number;
};

export type PriorityItem = {
  topicId: string;
  slug: string;
  title: string;
  moduleTitle: string;
  subject: (typeof subjects)[number];
  subjectLabelCs: string;
  examRelevance: string;
  masteryPct: number;
  priority: number;
  factors: PriorityFactors;
  bucket: ZachranMeBucket;
  reasonCs: string;
  href: string;
  estimatedMinutes: number;
};

export type ZachranMePlan = {
  deadline: string;
  deadlineLabelCs: string;
  dailyMinutes: number;
  subjects: Array<(typeof subjects)[number]>;
  subjectLabelsCs: string[];
  daysRemaining: number;
  mustToday: PriorityItem[];
  canWait: PriorityItem[];
  alreadyKnows: PriorityItem[];
  risk: PriorityItem[];
  /** Explicit anti-cram manifesto. */
  manifestoCs: string;
  todayDirectiveCs: string;
  unsupportedSubjectsCs: string[];
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

export function weaknessFromMastery(masteryPct: number): number {
  const m = Math.max(0, Math.min(100, masteryPct));
  return Math.round((1 - m / 100) * 1000) / 1000;
}

export function prerequisiteImportance(
  dependentCount: number,
  maxDependents: number,
): number {
  if (maxDependents <= 0) return 0.35;
  const ratio = dependentCount / maxDependents;
  // Even leaf topics keep a floor — never zero out priority entirely
  return Math.round((0.25 + 0.75 * ratio) * 1000) / 1000;
}

export function computePriority(factors: PriorityFactors): number {
  const p =
    factors.examRelevance *
    factors.weakness *
    factors.forgettingRisk *
    factors.prerequisiteImportance;
  return Math.round(p * 10_000) / 10_000;
}

export function buildPriorityFactors(input: {
  examRelevance: string;
  masteryPct: number;
  forgettingRisk: number;
  dependentCount: number;
  maxDependents: number;
}): PriorityFactors {
  return {
    examRelevance: examRelevanceWeights[input.examRelevance] ?? 0.5,
    weakness: Math.max(0.05, weaknessFromMastery(input.masteryPct)),
    forgettingRisk: Math.max(0.08, Math.min(1, input.forgettingRisk)),
    prerequisiteImportance: prerequisiteImportance(
      input.dependentCount,
      input.maxDependents,
    ),
  };
}

function reasonFor(
  bucket: ZachranMeBucket,
  factors: PriorityFactors,
  masteryPct: number,
): string {
  switch (bucket) {
    case "must_today":
      return `Priorita ${factors.examRelevance.toFixed(2)}×${factors.weakness.toFixed(2)}×${factors.forgettingRisk.toFixed(2)}×${factors.prerequisiteImportance.toFixed(2)} — vejde se do dneška.`;
    case "can_wait":
      return "Nižší dopad než must-today. Vrátíme se po uvolnění kapacity.";
    case "already_knows":
      return `Mastery ${masteryPct} % a nízké forgetting — drž, neopakuj zbytečně.`;
    case "risk":
      return "Vysoká exam relevance + slabina/forgetting. Nezapomeň po must-today.";
  }
}

/**
 * Build forgetting risk 0–1 from SR / mastery hints.
 */
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

/**
 * Classify and build Priority Plan.
 * must_today is capacity-capped — never dump the whole curriculum.
 */
export function buildZachranMePlan(input: {
  request: ZachranMeInput;
  signals: ZachranMeTopicSignal[];
  now?: Date;
}): ZachranMePlan {
  const request = zachranMeInputSchema.parse(input.request);
  const now = input.now ?? new Date();
  const daysRemaining = daysRemainingTo(request.deadline, now);

  const unsupportedSubjectsCs = request.subjects
    .filter((s) => s !== "cjl")
    .map((s) => subjectLabels[s]);

  const signals = request.subjects.includes("cjl")
    ? input.signals.filter((s) => s.subject === "cjl")
    : [];
  const maxDependents = Math.max(
    1,
    ...signals.map((s) => s.dependentCount),
    1,
  );

  const scored: PriorityItem[] = signals.map((s) => {
    const factors = buildPriorityFactors({
      examRelevance: s.examRelevance,
      masteryPct: s.masteryPct,
      forgettingRisk: s.forgettingRisk,
      dependentCount: s.dependentCount,
      maxDependents,
    });
    const priority = computePriority(factors);
    // Temporary bucket; refined below
    let bucket: ZachranMeBucket = "can_wait";
    const knows =
      s.masteryPct >= zachranMeConfig.knowsThreshold &&
      factors.forgettingRisk < 0.4;
    if (knows) bucket = "already_knows";
    else if (
      factors.examRelevance >= zachranMeConfig.riskExamFloor &&
      (factors.weakness >= zachranMeConfig.riskWeaknessFloor ||
        factors.forgettingRisk >= zachranMeConfig.riskForgetFloor)
    ) {
      bucket = "risk";
    }

    return {
      topicId: s.topicId,
      slug: s.slug,
      title: s.title,
      moduleTitle: s.moduleTitle,
      subject: s.subject,
      subjectLabelCs: subjectLabels[s.subject],
      examRelevance: s.examRelevance,
      masteryPct: Math.round(s.masteryPct),
      priority,
      factors,
      bucket,
      reasonCs: "",
      href: s.href,
      estimatedMinutes: zachranMeConfig.minutesPerItem,
    };
  });

  scored.sort((a, b) => b.priority - a.priority);

  const knows = scored.filter((i) => i.bucket === "already_knows");
  const candidates = scored.filter((i) => i.bucket !== "already_knows");

  const capacity = Math.max(
    zachranMeConfig.minMustToday,
    Math.min(
      zachranMeConfig.maxMustToday,
      Math.floor(request.dailyMinutes / zachranMeConfig.minutesPerItem),
    ),
  );

  const mustToday: PriorityItem[] = [];
  const risk: PriorityItem[] = [];
  const canWait: PriorityItem[] = [];

  for (const item of candidates) {
    if (mustToday.length < capacity) {
      mustToday.push({
        ...item,
        bucket: "must_today",
        reasonCs: reasonFor("must_today", item.factors, item.masteryPct),
      });
    } else if (item.bucket === "risk") {
      risk.push({
        ...item,
        bucket: "risk",
        reasonCs: reasonFor("risk", item.factors, item.masteryPct),
      });
    } else {
      canWait.push({
        ...item,
        bucket: "can_wait",
        reasonCs: reasonFor("can_wait", item.factors, item.masteryPct),
      });
    }
  }

  // Candidates that were risk but fit into must-today stay there;
  // remaining high-exam weak items not in must → risk if they qualify
  for (const item of canWait.slice()) {
    if (
      item.factors.examRelevance >= zachranMeConfig.riskExamFloor &&
      (item.factors.weakness >= zachranMeConfig.riskWeaknessFloor ||
        item.factors.forgettingRisk >= zachranMeConfig.riskForgetFloor)
    ) {
      const idx = canWait.indexOf(item);
      if (idx >= 0) canWait.splice(idx, 1);
      risk.push({
        ...item,
        bucket: "risk",
        reasonCs: reasonFor("risk", item.factors, item.masteryPct),
      });
    }
  }

  const alreadyKnows = knows.map((i) => ({
    ...i,
    bucket: "already_knows" as const,
    reasonCs: reasonFor("already_knows", i.factors, i.masteryPct),
  }));

  const mustTitles = mustToday.map((i) => i.title).slice(0, 3);
  const todayDirectiveCs =
    mustToday.length === 0
      ? "Dnes není kritický must-today — udrž lehký review, ať se forgetting nevrátí."
      : `Dnes musíš zvládnout: ${mustTitles.join(" · ")}${mustToday.length > 3 ? "…" : ""}. Nic dalšího nepřidávej.`;

  const manifestoCs =
    "Zachraň mě neznamená „nauč se náhodně všechno rychleji“. Je to triáž: dnešek = must-today. Zbytek čeká, drží se, nebo je označen jako riziko.";

  return {
    deadline: request.deadline,
    deadlineLabelCs: formatDeadlineCs(request.deadline),
    dailyMinutes: request.dailyMinutes,
    subjects: request.subjects,
    subjectLabelsCs: request.subjects.map((s) => subjectLabels[s]),
    daysRemaining,
    mustToday,
    canWait,
    alreadyKnows,
    risk,
    manifestoCs,
    todayDirectiveCs,
    unsupportedSubjectsCs,
    generatedAt: now.toISOString(),
  };
}

/**
 * Build topic signals from curriculum pack + mastery/forgetting maps.
 */
export function buildSignalsFromPack(input: {
  pack: CurriculumPackLike;
  masteryBySlug?: Record<string, number>;
  masteryByModule?: Record<string, number>;
  forgettingBySlug?: Record<string, number>;
  subject?: (typeof subjects)[number];
}): ZachranMeTopicSignal[] {
  const subject = input.subject ?? "cjl";
  const dependents = countDependents(input.pack);
  const topics = flattenPackTopics(input.pack);
  return topics.map((t) => {
    const masteryPct =
      input.masteryBySlug?.[t.slug] ??
      input.masteryByModule?.[t.moduleSlug] ??
      40;
    const forgettingRisk = input.forgettingBySlug?.[t.slug] ?? 0.2;
    return {
      topicId: t.id,
      slug: t.slug,
      title: t.title,
      moduleSlug: t.moduleSlug,
      moduleTitle: t.moduleTitle,
      examRelevance: t.examRelevance,
      masteryPct,
      forgettingRisk,
      dependentCount: dependents.get(t.slug) ?? 0,
      href: `/app/topics?focus=${encodeURIComponent(t.slug)}`,
      subject,
    };
  });
}

export { subjectLabels };
