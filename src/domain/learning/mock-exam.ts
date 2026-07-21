import { z } from "zod";
import {
  countWords,
  normalizeTeachText,
} from "@/domain/learning/teach-it-back";

/**
 * Zkouška nanečisto (D-046) — mock oral exam.
 * Explicit multi-dimension rubric. Never emits fake school marks (1–5).
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** Rubric dimensions — scores 0–100, not school grades. */
export const mockExamDimensions = [
  "coverage",
  "accuracy",
  "structure",
  "key_facts",
  "terminology",
  "confidence",
] as const;

export type MockExamDimension = (typeof mockExamDimensions)[number];

export const mockExamDimensionLabelsCs: Record<MockExamDimension, string> = {
  coverage: "Coverage",
  accuracy: "Accuracy",
  structure: "Structure",
  key_facts: "Key facts",
  terminology: "Terminology",
  confidence: "Confidence (self-assessment)",
};

/** Overall band from weighted rubric — NOT a školní známka. */
export const mockExamBands = ["weak", "partial", "strong"] as const;
export type MockExamBand = (typeof mockExamBands)[number];

export const mockExamBandLabelsCs: Record<MockExamBand, string> = {
  weak: "Slabý výkon (dle rubriky)",
  partial: "Částečný výkon (dle rubriky)",
  strong: "Silný výkon (dle rubriky)",
};

/**
 * Explicit rubric weights (sum = 1).
 * Confidence is self-reported and weighted lightly so it cannot fake mastery.
 */
export const mockExamRubric = {
  weights: {
    coverage: 0.25,
    accuracy: 0.2,
    structure: 0.15,
    key_facts: 0.2,
    terminology: 0.1,
    confidence: 0.1,
  } as Record<MockExamDimension, number>,
  /** Weighted average thresholds for band. */
  strongAt: 75,
  partialAt: 45,
  disclaimerCs:
    "Toto je interní feedback dle rubriky DámMaturu — není oficiální školní známka ani predikce maturity.",
} as const;

export const mockExamPhases = [
  "select",
  "prepare",
  "answer",
  "followups",
  "self_assess",
  "report",
] as const;

export type MockExamPhase = (typeof mockExamPhases)[number];

export const mockExamPhaseLabelsCs: Record<MockExamPhase, string> = {
  select: "Výběr tématu",
  prepare: "Příprava",
  answer: "Odpověď",
  followups: "Doplňující otázky",
  self_assess: "Sebehodnocení",
  report: "Hodnocení",
};

export const mockExamChecklistItemSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(200),
  synonyms: z.array(z.string().min(1).max(80)).max(12).default([]),
  required: z.boolean().default(true),
  isKeyFact: z.boolean().default(false),
  isStructure: z.boolean().default(false),
  isTerminology: z.boolean().default(false),
  reviewHintCs: z.string().min(1).max(200),
});

export type MockExamChecklistItem = z.infer<typeof mockExamChecklistItemSchema>;

export const mockExamFollowUpSchema = z.object({
  id: z.string().min(1).max(64),
  checklistItemId: z.string().min(1).max(64),
  question: z.string().min(1).max(280),
});

export type MockExamFollowUp = z.infer<typeof mockExamFollowUpSchema>;

export const mockExamInaccuracySchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(200),
  patterns: z.array(z.string().min(1).max(80)).min(1).max(10),
  correction: z.string().min(1).max(280),
});

export const mockExamTopicSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(160),
  subtitle: z.string().min(1).max(200),
  workTitle: z.string().min(1).max(120).nullable(),
  prepareSeconds: z.number().int().min(30).max(600),
  answerSeconds: z.number().int().min(60).max(900),
  prompt: z.string().min(1).max(500),
  checklist: z.array(mockExamChecklistItemSchema).min(5).max(16),
  followUps: z.array(mockExamFollowUpSchema).min(3).max(12),
  inaccuracies: z.array(mockExamInaccuracySchema).max(10).default([]),
  /** Ordered outline for „modelová struktura odpovědi“. */
  modelStructure: z.array(z.string().min(1).max(160)).min(4).max(12),
  excellentAnswer: z.string().min(1).max(1600),
  relatedLearnHref: z.string().min(1).max(200).nullable(),
});

export type MockExamTopic = z.infer<typeof mockExamTopicSchema>;

export const mockExamPackSchema = z.object({
  id: z.string().uuid(),
  slug: z.literal("zkouska-nanecisto"),
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(400),
  topics: z.array(mockExamTopicSchema).min(2).max(12),
  rubricDisclaimerCs: z.string().min(1).max(300),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type MockExamPack = z.infer<typeof mockExamPackSchema>;

export function parseMockExamPack(raw: unknown): MockExamPack {
  return mockExamPackSchema.parse(raw);
}

export type MockExamHit = {
  itemId: string;
  label: string;
  matchedVia: string;
};

export type MockExamMiss = {
  itemId: string;
  label: string;
  required: boolean;
  isKeyFact: boolean;
  reviewHintCs: string;
};

export type MockExamInaccuracyHit = {
  id: string;
  label: string;
  correction: string;
  matchedVia: string;
};

export type MockExamDimensionScores = Record<MockExamDimension, number>;

export type MockExamReport = {
  topicId: string;
  topicSlug: string;
  band: MockExamBand;
  /** Weighted 0–100 per explicit rubric — not a school mark. */
  overallScore: number;
  dimensions: MockExamDimensionScores;
  strengths: string[];
  missingPoints: MockExamMiss[];
  inaccuracies: MockExamInaccuracyHit[];
  toReview: string[];
  modelStructure: string[];
  explainedWell: MockExamHit[];
  followUpAskedIds: string[];
  confidenceSelf: number;
  wordCount: number;
  disclaimerCs: string;
  /** Always false — product never invents official marks. */
  isOfficialSchoolGrade: false;
};

function includesPhrase(haystack: string, needle: string): boolean {
  const n = normalizeTeachText(needle);
  if (n.length < 2) return false;
  if (haystack.includes(n)) return true;
  const hayTokens = haystack.split(" ").filter(Boolean);
  const needleTokens = n.split(" ").filter((t) => t.length >= 3);
  if (needleTokens.length === 0) return false;
  return needleTokens.every((nt) => {
    if (haystack.includes(nt)) return true;
    const stemLen = Math.min(nt.length, Math.max(4, nt.length - 2));
    const stem = nt.slice(0, stemLen);
    return hayTokens.some(
      (ht) =>
        ht.startsWith(stem) ||
        (ht.length >= 4 &&
          stem.startsWith(ht.slice(0, Math.min(stemLen, ht.length)))),
    );
  });
}

function includesContiguous(haystack: string, needle: string): boolean {
  const n = normalizeTeachText(needle);
  if (n.length < 3) return false;
  return haystack.includes(n);
}

function matchChecklist(
  checklist: MockExamChecklistItem[],
  text: string,
): { hits: MockExamHit[]; misses: MockExamMiss[] } {
  const normalized = normalizeTeachText(text);
  const hits: MockExamHit[] = [];
  const misses: MockExamMiss[] = [];
  for (const item of checklist) {
    const candidates = [item.label, ...item.synonyms];
    let matchedVia: string | null = null;
    for (const c of candidates) {
      if (includesPhrase(normalized, c)) {
        matchedVia = c;
        break;
      }
    }
    if (matchedVia) {
      hits.push({ itemId: item.id, label: item.label, matchedVia });
    } else {
      misses.push({
        itemId: item.id,
        label: item.label,
        required: item.required,
        isKeyFact: item.isKeyFact,
        reviewHintCs: item.reviewHintCs,
      });
    }
  }
  return { hits, misses };
}

function scoreRatio(hits: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((100 * hits) / total);
}

function bandFromOverall(score: number): MockExamBand {
  if (score >= mockExamRubric.strongAt) return "strong";
  if (score >= mockExamRubric.partialAt) return "partial";
  return "weak";
}

export function pickRandomTopic(
  pack: MockExamPack,
  seed?: number,
): MockExamTopic {
  const i =
    seed != null
      ? Math.abs(seed) % pack.topics.length
      : Math.floor(Math.random() * pack.topics.length);
  return pack.topics[i]!;
}

/**
 * Select follow-up questions for checklist items the student omitted.
 * Prefer required misses, then key facts, then others.
 */
export function selectFollowUps(
  topic: MockExamTopic,
  missingItemIds: string[],
  maxQuestions = 3,
): typeof topic.followUps {
  const missSet = new Set(missingItemIds);
  const byPriority = [...topic.followUps].sort((a, b) => {
    const ia = topic.checklist.find((c) => c.id === a.checklistItemId);
    const ib = topic.checklist.find((c) => c.id === b.checklistItemId);
    const score = (c: MockExamChecklistItem | undefined) =>
      (c?.required ? 4 : 0) + (c?.isKeyFact ? 2 : 0) + (c?.isStructure ? 1 : 0);
    return score(ib) - score(ia);
  });
  return byPriority
    .filter((f) => missSet.has(f.checklistItemId))
    .slice(0, maxQuestions);
}

export type GradeMockExamInput = {
  topic: MockExamTopic;
  mainAnswer: string;
  /** Follow-up answers keyed by follow-up id. */
  followUpAnswers: Record<string, string>;
  followUpAskedIds: string[];
  /** Student self-assessment 1–5 → mapped to confidence dimension. */
  confidenceSelf: number;
};

/**
 * Grade full mock exam session against explicit rubric.
 * Combines main answer + follow-up answers for coverage of asked items.
 */
export function gradeMockExam(input: GradeMockExamInput): MockExamReport {
  const { topic } = input;
  const confidenceSelf = Math.min(5, Math.max(1, Math.round(input.confidenceSelf)));
  const followText = input.followUpAskedIds
    .map((id) => input.followUpAnswers[id] ?? "")
    .join(" ");
  const combined = `${input.mainAnswer}\n${followText}`;

  const { hits, misses } = matchChecklist(topic.checklist, combined);
  const hitIds = new Set(hits.map((h) => h.itemId));

  const inaccuracies: MockExamInaccuracyHit[] = [];
  const mainNorm = normalizeTeachText(input.mainAnswer);
  for (const inc of topic.inaccuracies) {
    for (const pattern of inc.patterns) {
      if (includesContiguous(mainNorm, pattern)) {
        inaccuracies.push({
          id: inc.id,
          label: inc.label,
          correction: inc.correction,
          matchedVia: pattern,
        });
        break;
      }
    }
  }

  const required = topic.checklist.filter((c) => c.required);
  const requiredHits = required.filter((c) => hitIds.has(c.id)).length;
  const keyFacts = topic.checklist.filter((c) => c.isKeyFact);
  const keyHits = keyFacts.filter((c) => hitIds.has(c.id)).length;
  const structureItems = topic.checklist.filter((c) => c.isStructure);
  const structureHits = structureItems.filter((c) => hitIds.has(c.id)).length;
  const termItems = topic.checklist.filter((c) => c.isTerminology);
  const termHits = termItems.filter((c) => hitIds.has(c.id)).length;

  const coverage = scoreRatio(requiredHits, required.length);
  const key_facts = scoreRatio(keyHits, Math.max(1, keyFacts.length));
  const structure = scoreRatio(structureHits, Math.max(1, structureItems.length));
  const terminology = scoreRatio(termHits, Math.max(1, termItems.length));

  // Accuracy: start 100, −25 per inaccuracy (floor 0)
  const accuracy = Math.max(0, 100 - inaccuracies.length * 25);

  // Confidence: self 1–5 → 20/40/60/80/100 (labeled as self-assessment)
  const confidence = confidenceSelf * 20;

  const dimensions: MockExamDimensionScores = {
    coverage,
    accuracy,
    structure,
    key_facts,
    terminology,
    confidence,
  };

  let overallScore = 0;
  for (const dim of mockExamDimensions) {
    overallScore += dimensions[dim] * mockExamRubric.weights[dim];
  }
  overallScore = Math.round(overallScore);
  const band = bandFromOverall(overallScore);

  const strengths: string[] = [];
  if (coverage >= 70) strengths.push("Dobré pokrytí povinných bodů (coverage).");
  if (accuracy >= 75) strengths.push("Bez závažných nepřesností (accuracy).");
  if (structure >= 70) strengths.push("Struktura odpovědi je čitelná.");
  if (key_facts >= 70) strengths.push("Klíčová fakta jsou přítomna.");
  if (terminology >= 70) strengths.push("Používáš správnou terminologii.");
  if (confidenceSelf >= 4 && coverage >= 60) {
    strengths.push("Sebehodnocení odpovídá solidnímu výkonu.");
  }
  if (strengths.length === 0) {
    strengths.push("Začni od modelové struktury — i krátká odpověď může být cílená.");
  }

  const toReview = [
    ...new Set(
      misses.filter((m) => m.required || m.isKeyFact).map((m) => m.reviewHintCs),
    ),
  ].slice(0, 8);

  for (const inc of inaccuracies) {
    toReview.push(`Oprav: ${inc.correction}`);
  }

  return {
    topicId: topic.id,
    topicSlug: topic.slug,
    band,
    overallScore,
    dimensions,
    strengths,
    missingPoints: misses.filter((m) => m.required || m.isKeyFact),
    inaccuracies,
    toReview,
    modelStructure: topic.modelStructure,
    explainedWell: hits,
    followUpAskedIds: input.followUpAskedIds,
    confidenceSelf,
    wordCount: countWords(input.mainAnswer),
    disclaimerCs: mockExamRubric.disclaimerCs,
    isOfficialSchoolGrade: false,
  };
}

export function getTopicBySlug(
  pack: MockExamPack,
  slug: string,
): MockExamTopic | undefined {
  return pack.topics.find((t) => t.slug === slug);
}
