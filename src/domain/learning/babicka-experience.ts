import { z } from "zod";
import {
  gradeTeachBackAnswer,
  type TeachChecklistItem,
  type TeachGrade,
  type TeachMiss,
  type TeachPrompt,
} from "@/domain/learning/teach-it-back";

/**
 * Babička active learning experience (D-045).
 * Cards / maps / traps / challenges — not long paragraphs.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const babickaTopics = [
  "character_of_work",
  "autobiography",
  "composition",
  "stare_belidlo",
  "characters",
  "social_contrast",
  "language",
  "realism_idealization",
] as const;

export type BabickaTopic = (typeof babickaTopics)[number];

export const babickaTopicLabelsCs: Record<BabickaTopic, string> = {
  character_of_work: "Charakter díla",
  autobiography: "Autobiografické prvky",
  composition: "Kompozice",
  stare_belidlo: "Staré bělidlo",
  characters: "Postavy",
  social_contrast: "Kontrast prostředí",
  language: "Jazyk",
  realism_idealization: "Realismus vs idealizace",
};

export const babickaEvidenceSchema = z.object({
  qaItemId: z.string().min(1),
  knowledgeUnitId: z.string().min(1),
  publishedStatement: z.string().min(1).max(4000),
  validationStatus: z.enum(["verified_from_source", "corrected"]),
  filename: z.literal("Babička.docx"),
});

export const babickaKuSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  topic: z.enum(babickaTopics),
  title: z.string().min(1).max(160),
  /** Short card line — not a paragraph. */
  cardLine: z.string().min(1).max(200),
  statement: z.string().min(1).max(500),
  synonyms: z.array(z.string().min(1).max(80)).max(12).default([]),
  evidence: babickaEvidenceSchema.nullable(),
});

export type BabickaKu = z.infer<typeof babickaKuSchema>;

export const babickaCharacterCardSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  socialSphere: z.enum(["venkov", "pansky", "mez"]),
  tags: z.array(z.string().min(1).max(60)).min(2).max(6),
  roleLine: z.string().min(1).max(160),
  kuSlug: slugSchema,
});

export const babickaRelationEdgeSchema = z.object({
  id: z.string().min(1).max(40),
  fromCharacterId: z.string().min(1).max(40),
  toCharacterId: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
});

export const babickaTrueFalseSchema = z.object({
  id: z.string().min(1).max(40),
  claim: z.string().min(1).max(240),
  isTrue: z.boolean(),
  trapHint: z.string().min(1).max(200),
  kuSlug: slugSchema,
});

export const babickaStructurePieceSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(160),
  correctOrder: z.number().int().min(0).max(10),
  kuSlug: slugSchema,
});

export const babickaRealismItemSchema = z.object({
  id: z.string().min(1).max(40),
  statement: z.string().min(1).max(200),
  answer: z.enum(["realisticke", "idealizovane"]),
  explain: z.string().min(1).max(200),
  kuSlug: slugSchema,
});

export const babickaOralBuilderSchema = z.object({
  id: z.string().min(1).max(40),
  titleCs: z.string().min(1).max(120),
  prompt: z.string().min(1).max(320),
  checklistKuSlugs: z.array(slugSchema).min(4).max(12),
  excellentAnswer: z.string().min(1).max(1000),
  /** Short scaffold chips students can tap into the answer. */
  builderChips: z.array(z.string().min(1).max(80)).min(4).max(16),
});

export const babickaExperiencePackSchema = z.object({
  id: z.string().uuid(),
  slug: z.literal("babicka"),
  title: z.string().min(1).max(160),
  author: z.string().min(1).max(120),
  subtitle: z.string().min(1).max(120),
  summary: z.string().min(1).max(400),
  sourceFilename: z.literal("Babička.docx"),
  literaryWorkHref: z.string().min(1).max(200),
  knowledgeUnits: z.array(babickaKuSchema).min(8).max(24),
  characterCards: z.array(babickaCharacterCardSchema).min(4).max(12),
  relationshipEdges: z.array(babickaRelationEdgeSchema).min(4).max(16),
  trueFalseTraps: z.array(babickaTrueFalseSchema).min(5).max(14),
  storyStructure: z.array(babickaStructurePieceSchema).min(4).max(8),
  realismChallenge: z.array(babickaRealismItemSchema).min(4).max(12),
  oralBuilder: babickaOralBuilderSchema,
  requiresVerifiedOnly: z.literal(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BabickaExperiencePack = z.infer<typeof babickaExperiencePackSchema>;

export function parseBabickaExperiencePack(
  raw: unknown,
): BabickaExperiencePack {
  return babickaExperiencePackSchema.parse(raw);
}

export const babickaActivityIds = [
  "character_cards",
  "relationship_map",
  "true_false",
  "story_structure",
  "realism_challenge",
  "oral_builder",
] as const;

export type BabickaActivityId = (typeof babickaActivityIds)[number];

export const babickaActivityLabelsCs: Record<BabickaActivityId, string> = {
  character_cards: "Character cards",
  relationship_map: "Relationship map",
  true_false: "True / false traps",
  story_structure: "Story structure",
  realism_challenge: "Realistické / idealizované?",
  oral_builder: "Oral answer builder",
};

export type BabickaActivityResult = {
  activityId: BabickaActivityId;
  scorePct: number;
  correct: number;
  total: number;
  missingKuSlugs: string[];
  missing: TeachMiss[];
  noteCs: string;
};

export function babickaKuBySlug(
  pack: BabickaExperiencePack,
  slug: string,
): BabickaKu | undefined {
  return pack.knowledgeUnits.find((k) => k.slug === slug);
}

function missingToTeachMiss(
  pack: BabickaExperiencePack,
  slugs: string[],
): TeachMiss[] {
  return [...new Set(slugs)].map((slug) => {
    const ku = babickaKuBySlug(pack, slug);
    return {
      checklistId: ku?.id ?? slug,
      label: ku?.title ?? slug,
      knowledgeUnitId: ku?.id ?? slug,
      knowledgeUnitTitle: ku?.title ?? slug,
      required: true,
    };
  });
}

export function gradeCharacterCardQuiz(
  pack: BabickaExperiencePack,
  /** characterId → socialSphere */
  mapping: Record<string, string>,
): BabickaActivityResult {
  let hits = 0;
  const missing: string[] = [];
  for (const c of pack.characterCards) {
    if (mapping[c.id] === c.socialSphere) hits += 1;
    else missing.push(c.kuSlug);
  }
  const total = pack.characterCards.length;
  return {
    activityId: "character_cards",
    scorePct: Math.round((100 * hits) / Math.max(1, total)),
    correct: hits,
    total,
    missingKuSlugs: [...new Set(missing)],
    missing: missingToTeachMiss(pack, missing),
    noteCs:
      hits === total
        ? "Sféry postav sedí (venkov × panský)."
        : "Špatná sociální sféra = chybějící KU postav / kontrastu.",
  };
}

export function gradeRelationshipMap(
  pack: BabickaExperiencePack,
  /** edgeId → chosen label */
  mapping: Record<string, string>,
): BabickaActivityResult {
  let hits = 0;
  const missing: string[] = [];
  for (const e of pack.relationshipEdges) {
    if (mapping[e.id] === e.label) hits += 1;
    else missing.push("postavy-babicka");
  }
  const total = pack.relationshipEdges.length;
  return {
    activityId: "relationship_map",
    scorePct: Math.round((100 * hits) / Math.max(1, total)),
    correct: hits,
    total,
    missingKuSlugs: [...new Set(missing)],
    missing: missingToTeachMiss(pack, missing),
    noteCs:
      hits === total
        ? "Vztahy sedí."
        : "Špatné vztahy = doplň KU postav.",
  };
}

export function gradeTrueFalseTraps(
  pack: BabickaExperiencePack,
  /** itemId → student says true? */
  answers: Record<string, boolean>,
): BabickaActivityResult {
  let hits = 0;
  const missing: string[] = [];
  for (const item of pack.trueFalseTraps) {
    if (answers[item.id] === item.isTrue) hits += 1;
    else missing.push(item.kuSlug);
  }
  const total = pack.trueFalseTraps.length;
  return {
    activityId: "true_false",
    scorePct: Math.round((100 * hits) / Math.max(1, total)),
    correct: hits,
    total,
    missingKuSlugs: [...new Set(missing)],
    missing: missingToTeachMiss(pack, missing),
    noteCs:
      hits === total
        ? "Pastím ses vyhnul."
        : "Chybné T/F = chybějící KU (viz trap hint).",
  };
}

export function gradeStoryStructure(
  pack: BabickaExperiencePack,
  submittedIds: string[],
): BabickaActivityResult {
  const correct = [...pack.storyStructure].sort(
    (a, b) => a.correctOrder - b.correctOrder,
  );
  let hits = 0;
  const missing: string[] = [];
  for (let i = 0; i < correct.length; i++) {
    if (submittedIds[i] === correct[i]?.id) hits += 1;
    else if (correct[i]) missing.push(correct[i]!.kuSlug);
  }
  return {
    activityId: "story_structure",
    scorePct: Math.round((100 * hits) / correct.length),
    correct: hits,
    total: correct.length,
    missingKuSlugs: [...new Set(missing)],
    missing: missingToTeachMiss(pack, missing),
    noteCs:
      hits === correct.length
        ? "Struktura (prolog → pásma → epilog) sedí."
        : "Špatné pořadí = chybějící KU kompozice.",
  };
}

export function gradeRealismChallenge(
  pack: BabickaExperiencePack,
  mapping: Record<string, "realisticke" | "idealizovane">,
): BabickaActivityResult {
  let hits = 0;
  const missing: string[] = [];
  for (const item of pack.realismChallenge) {
    if (mapping[item.id] === item.answer) hits += 1;
    else missing.push(item.kuSlug);
  }
  const total = pack.realismChallenge.length;
  return {
    activityId: "realism_challenge",
    scorePct: Math.round((100 * hits) / Math.max(1, total)),
    correct: hits,
    total,
    missingKuSlugs: [...new Set(missing)],
    missing: missingToTeachMiss(pack, missing),
    noteCs:
      hits === total
        ? "Realismus × idealizace rozlišuješ."
        : "Záměna = chybějící KU realismus/idealizace.",
  };
}

function checklistFromSlugs(
  pack: BabickaExperiencePack,
  slugs: string[],
): TeachChecklistItem[] {
  return slugs.map((slug) => {
    const ku = babickaKuBySlug(pack, slug);
    if (!ku) throw new Error(`Unknown KU ${slug}`);
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

export function gradeOralBuilder(
  pack: BabickaExperiencePack,
  answer: string,
): BabickaActivityResult & { grade: TeachGrade } {
  const prompt: TeachPrompt = {
    id: "b0450000-0000-4000-8000-000000000001",
    slug: pack.oralBuilder.id,
    prompt: pack.oralBuilder.prompt,
    checklist: checklistFromSlugs(pack, pack.oralBuilder.checklistKuSlugs),
    inaccuracies: [
      {
        id: "b0450000-0000-4000-8000-000000000002",
        label: "Záměna s románem / dějovým románem",
        patterns: ["detektivní", "milostný román", "mácha máj"],
        correction:
          "Babička = rozsáhlá povídka / nedějová próza obrazů, ne Máj.",
      },
    ],
    excellentAnswer: pack.oralBuilder.excellentAnswer,
    minRequiredHits: Math.max(
      3,
      Math.ceil(pack.oralBuilder.checklistKuSlugs.length * 0.6),
    ),
    tags: ["babicka", "oral"],
  };
  const grade = gradeTeachBackAnswer(prompt, answer);
  const missingKuSlugs = grade.missing.map((m) => {
    const ku = pack.knowledgeUnits.find((k) => k.id === m.knowledgeUnitId);
    return ku?.slug ?? m.knowledgeUnitId;
  });
  return {
    activityId: "oral_builder",
    scorePct: Math.round(grade.checklistCoverage * 100),
    correct: grade.explainedWell.length,
    total: prompt.checklist.length,
    missingKuSlugs,
    missing: grade.missing,
    noteCs:
      grade.missing.length === 0
        ? "Oral builder pokryl požadované KU."
        : `Chybí ${grade.missing.length} KU — doplň chipy / fakta.`,
    grade,
  };
}

export function shuffleBabickaIds(ids: string[], seed: string): string[] {
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

export const socialSphereLabelsCs = {
  venkov: "Venkov",
  pansky: "Panský / šlechtický",
  mez: "Mezi sférami",
} as const;
