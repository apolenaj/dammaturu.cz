import { z } from "zod";
import {
  gradeTeachBackAnswer,
  type TeachChecklistItem,
  type TeachGrade,
  type TeachMiss,
  type TeachPrompt,
} from "@/domain/learning/teach-it-back";

/**
 * Máj exam preparation flow (D-044).
 * Covers author → significance; activities + oral sims mark missing KUs.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const majKuCategories = [
  "author",
  "literary_context",
  "theme",
  "motifs",
  "spacetime",
  "composition",
  "cantos",
  "characters",
  "genre",
  "language",
  "verse",
  "tropes",
  "significance",
] as const;

export type MajKuCategory = (typeof majKuCategories)[number];

export const majKuCategoryLabelsCs: Record<MajKuCategory, string> = {
  author: "Autor",
  literary_context: "Literární kontext",
  theme: "Téma",
  motifs: "Motivy",
  spacetime: "Časoprostor",
  composition: "Kompozice",
  cantos: "4 zpěvy + intermezza",
  characters: "Postavy",
  genre: "Žánr",
  language: "Jazyk",
  verse: "Verš",
  tropes: "Tropy a figury",
  significance: "Význam díla",
};

export const majEvidenceSchema = z.object({
  qaItemId: z.string().min(1),
  knowledgeUnitId: z.string().min(1),
  publishedStatement: z.string().min(1).max(4000),
  validationStatus: z.enum(["verified_from_source", "corrected"]),
  filename: z.literal("Máj.docx"),
});

export const majKnowledgeUnitSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  category: z.enum(majKuCategories),
  title: z.string().min(1).max(160),
  statement: z.string().min(1).max(800),
  synonyms: z.array(z.string().min(1).max(80)).max(12).default([]),
  evidence: majEvidenceSchema.nullable(),
});

export type MajKnowledgeUnit = z.infer<typeof majKnowledgeUnitSchema>;

export const majStoryMapNodeSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(280),
  order: z.number().int().min(0).max(12),
  kind: z.enum(["canto", "intermezzo", "frame"]),
  kuSlug: slugSchema,
});

export const majCharacterNodeSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  role: z.string().min(1).max(200),
  traits: z.array(z.string().min(1).max(80)).min(1).max(8),
  kuSlug: slugSchema,
});

export const majCompositionPieceSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(200),
  correctOrder: z.number().int().min(0).max(12),
  kuSlug: slugSchema,
});

export const majQuoteDeviceSchema = z.object({
  id: z.string().min(1).max(40),
  quote: z.string().min(1).max(200),
  device: z.string().min(1).max(80),
  explanation: z.string().min(1).max(280),
  kuSlug: slugSchema,
});

export const majTimedChallengeSchema = z.object({
  id: z.string().min(1).max(40),
  titleCs: z.string().min(1).max(120),
  prompt: z.string().min(1).max(400),
  seconds: z.number().int().min(30).max(600),
  checklistKuSlugs: z.array(slugSchema).min(3).max(20),
  excellentAnswer: z.string().min(1).max(1200),
});

export const majExamPrepPackSchema = z.object({
  id: z.string().uuid(),
  slug: z.literal("maj-exam-prep"),
  title: z.string().min(1).max(160),
  author: z.string().min(1).max(120),
  summary: z.string().min(1).max(500),
  sourceFilename: z.literal("Máj.docx"),
  literaryWorkHref: z.string().min(1).max(200),
  reconstructionHref: z.string().min(1).max(200),
  knowledgeUnits: z.array(majKnowledgeUnitSchema).min(10).max(40),
  storyMap: z.array(majStoryMapNodeSchema).min(6).max(10),
  characterMap: z.array(majCharacterNodeSchema).min(2).max(8),
  compositionPuzzle: z.array(majCompositionPieceSchema).min(6).max(10),
  quoteDevices: z.array(majQuoteDeviceSchema).min(4).max(12),
  summaryChallenge: majTimedChallengeSchema,
  oralThreeMin: majTimedChallengeSchema,
  fullOralSimulation: majTimedChallengeSchema,
  requiresVerifiedOnly: z.literal(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type MajExamPrepPack = z.infer<typeof majExamPrepPackSchema>;

export function parseMajExamPrepPack(raw: unknown): MajExamPrepPack {
  return majExamPrepPackSchema.parse(raw);
}

export const majActivityIds = [
  "story_map",
  "character_map",
  "composition_puzzle",
  "quote_device",
  "summary_60s",
  "oral_3min",
  "full_oral",
] as const;

export type MajActivityId = (typeof majActivityIds)[number];

export const majActivityLabelsCs: Record<MajActivityId, string> = {
  story_map: "Visual story map",
  character_map: "Character map",
  composition_puzzle: "Composition puzzle",
  quote_device: "Quote / device matching",
  summary_60s: "60-second summary",
  oral_3min: "3-minute oral answer",
  full_oral: "Full oral simulation",
};

export type MajActivityResult = {
  activityId: MajActivityId;
  scorePct: number;
  correct: number;
  total: number;
  missingKuSlugs: string[];
  missing: TeachMiss[];
  noteCs: string;
};

export function kuBySlug(
  pack: MajExamPrepPack,
  slug: string,
): MajKnowledgeUnit | undefined {
  return pack.knowledgeUnits.find((k) => k.slug === slug);
}

export function gradeStoryMapOrder(
  pack: MajExamPrepPack,
  submittedIds: string[],
): MajActivityResult {
  const correct = [...pack.storyMap].sort((a, b) => a.order - b.order);
  const total = correct.length;
  let hits = 0;
  const missingKuSlugs: string[] = [];
  for (let i = 0; i < total; i++) {
    if (submittedIds[i] === correct[i]?.id) hits += 1;
    else if (correct[i]) missingKuSlugs.push(correct[i]!.kuSlug);
  }
  return {
    activityId: "story_map",
    scorePct: Math.round((100 * hits) / total),
    correct: hits,
    total,
    missingKuSlugs: [...new Set(missingKuSlugs)],
    missing: missingToTeachMiss(pack, missingKuSlugs),
    noteCs:
      hits === total
        ? "Story map sedí — zpěvy a intermezza máš v pořádku."
        : "Špatné pořadí = chybějící KU v kompozici / zpěvech.",
  };
}

export function gradeCharacterMatches(
  pack: MajExamPrepPack,
  mapping: Record<string, string>,
): MajActivityResult {
  let hits = 0;
  const missingKuSlugs: string[] = [];
  for (const c of pack.characterMap) {
    if (mapping[c.id] === c.role) hits += 1;
    else missingKuSlugs.push(c.kuSlug);
  }
  const total = pack.characterMap.length;
  return {
    activityId: "character_map",
    scorePct: Math.round((100 * hits) / Math.max(1, total)),
    correct: hits,
    total,
    missingKuSlugs: [...new Set(missingKuSlugs)],
    missing: missingToTeachMiss(pack, missingKuSlugs),
    noteCs:
      hits === total
        ? "Postavy sedí."
        : "Špatné přiřazení role = chybějící KU postav.",
  };
}

export function gradeCompositionPuzzle(
  pack: MajExamPrepPack,
  submittedIds: string[],
): MajActivityResult {
  const correct = [...pack.compositionPuzzle].sort(
    (a, b) => a.correctOrder - b.correctOrder,
  );
  let hits = 0;
  const missingKuSlugs: string[] = [];
  for (let i = 0; i < correct.length; i++) {
    if (submittedIds[i] === correct[i]?.id) hits += 1;
    else if (correct[i]) missingKuSlugs.push(correct[i]!.kuSlug);
  }
  return {
    activityId: "composition_puzzle",
    scorePct: Math.round((100 * hits) / correct.length),
    correct: hits,
    total: correct.length,
    missingKuSlugs: [...new Set(missingKuSlugs)],
    missing: missingToTeachMiss(pack, missingKuSlugs),
    noteCs:
      hits === correct.length
        ? "Kompozice sedí (dedikace → zpěvy → intermezza)."
        : "Chybí KU kompozice / zpěvů.",
  };
}

export function gradeQuoteDeviceMatches(
  pack: MajExamPrepPack,
  mapping: Record<string, string>,
): MajActivityResult {
  let hits = 0;
  const missingKuSlugs: string[] = [];
  for (const q of pack.quoteDevices) {
    if (mapping[q.id] === q.device) hits += 1;
    else missingKuSlugs.push(q.kuSlug);
  }
  const total = pack.quoteDevices.length;
  return {
    activityId: "quote_device",
    scorePct: Math.round((100 * hits) / Math.max(1, total)),
    correct: hits,
    total,
    missingKuSlugs: [...new Set(missingKuSlugs)],
    missing: missingToTeachMiss(pack, missingKuSlugs),
    noteCs:
      hits === total
        ? "Citaty a tropy sedí."
        : "Špatný trope/figura = chybějící KU jazyka.",
  };
}

function checklistFromKuSlugs(
  pack: MajExamPrepPack,
  slugs: string[],
): TeachChecklistItem[] {
  return slugs.map((slug) => {
    const ku = kuBySlug(pack, slug);
    if (!ku) throw new Error(`Unknown KU slug ${slug}`);
    return {
      id: ku.id,
      label: ku.title,
      synonyms: ku.synonyms,
      knowledgeUnitId: ku.id,
      knowledgeUnitTitle: ku.title,
      required: true,
    };
  });
}

export function gradeTimedOral(
  pack: MajExamPrepPack,
  activityId: "summary_60s" | "oral_3min" | "full_oral",
  answer: string,
): MajActivityResult & { grade: TeachGrade } {
  const challenge =
    activityId === "summary_60s"
      ? pack.summaryChallenge
      : activityId === "oral_3min"
        ? pack.oralThreeMin
        : pack.fullOralSimulation;

  const prompt: TeachPrompt = {
    id: "b0440000-0000-4000-8000-000000000001",
    slug: challenge.id,
    prompt: challenge.prompt,
    checklist: checklistFromKuSlugs(pack, challenge.checklistKuSlugs),
    inaccuracies: [
      {
        id: "b0440000-0000-4000-8000-000000000002",
        label: "Záměna s Erbenem / Kyticí",
        patterns: ["erben", "kytice", "balada vodník"],
        correction: "Máj je Mácha / romantismus — ne Erbenova Kytice.",
      },
    ],
    excellentAnswer: challenge.excellentAnswer,
    minRequiredHits: Math.max(
      2,
      Math.ceil(challenge.checklistKuSlugs.length * 0.6),
    ),
    tags: ["maj", "oral"],
  };

  const grade = gradeTeachBackAnswer(prompt, answer);
  const missingKuSlugs = grade.missing.map((m) => {
    const ku = pack.knowledgeUnits.find((k) => k.id === m.knowledgeUnitId);
    return ku?.slug ?? m.knowledgeUnitId;
  });

  return {
    activityId,
    scorePct: Math.round(grade.checklistCoverage * 100),
    correct: grade.explainedWell.length,
    total: prompt.checklist.length,
    missingKuSlugs,
    missing: grade.missing,
    noteCs:
      grade.missing.length === 0
        ? "Ústní odpověď pokrývá požadované KU."
        : `Po simulaci chybí ${grade.missing.length} knowledge unit(s) — doplň je.`,
    grade,
  };
}

function missingToTeachMiss(
  pack: MajExamPrepPack,
  slugs: string[],
): TeachMiss[] {
  return slugs.map((slug) => {
    const ku = kuBySlug(pack, slug);
    return {
      checklistId: ku?.id ?? slug,
      label: ku?.title ?? slug,
      knowledgeUnitId: ku?.id ?? slug,
      knowledgeUnitTitle: ku?.title ?? slug,
      required: true,
    };
  });
}

export function shuffleIdsStable(ids: string[], seed: string): string[] {
  const arr = [...ids];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}
