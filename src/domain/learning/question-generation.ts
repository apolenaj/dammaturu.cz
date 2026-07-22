import { z } from "zod";
import { examRelevanceSchema, kuKindSchema } from "@/domain/content/schemas";
import { engineQuestionSchema } from "@/domain/learning/question-engine";
import { flashcardItemSchema } from "@/domain/learning/flashcards";

/**
 * Question Generation Engine — deterministic templates over verified KnowledgeUnits.
 * Never invents answers; every correct answer must be supported by source evidence.
 */

export const questionDifficultyBands = [
  "easy",
  "medium",
  "hard",
  "exam-like",
] as const;

export type QuestionDifficultyBand =
  (typeof questionDifficultyBands)[number];

export const questionDifficultyBandLabelsCs: Record<
  QuestionDifficultyBand,
  string
> = {
  easy: "Snadné",
  medium: "Střední",
  hard: "Těžké",
  "exam-like": "Maturitní",
};

/** Maps band → Question Engine numeric difficulty 1–5. */
export function difficultyBandToScore(band: QuestionDifficultyBand): number {
  switch (band) {
    case "easy":
      return 1;
    case "medium":
      return 3;
    case "hard":
      return 4;
    case "exam-like":
      return 5;
  }
}

export const generatedQuestionKinds = [
  "open_answer",
  "multiple_choice",
  "true_false",
  "matching",
  "ordering",
  "fill_blank",
  "flashcard",
  "explain_own_words",
  "identify_author_work",
  "literary_context",
] as const;

export type GeneratedQuestionKind =
  (typeof generatedQuestionKinds)[number];

export const sourceEvidenceSchema = z.object({
  quote: z.string().min(1).max(2000),
  sourceLabel: z.string().min(1).max(240),
  pageStart: z.number().int().min(1).nullable().optional(),
  pageEnd: z.number().int().min(1).nullable().optional(),
  chunkId: z.string().uuid().nullable().optional(),
  documentId: z.string().uuid().nullable().optional(),
});

export type SourceEvidence = z.infer<typeof sourceEvidenceSchema>;

export const gradingRubricSchema = z.object({
  /** What a full-credit answer must cover. */
  fullCreditCriteria: z.array(z.string().min(1).max(200)).min(1).max(12),
  /** Terms / phrases used by graders (normalized matching). */
  keyTerms: z.array(z.string().min(1).max(80)).min(1).max(16),
  /** Partial credit threshold 0–1. */
  partialThreshold: z.number().min(0).max(1).default(0.35),
  /** Full credit threshold 0–1. */
  fullThreshold: z.number().min(0).max(1).default(0.85),
  notes: z.string().max(500).optional(),
});

export type GradingRubric = z.infer<typeof gradingRubricSchema>;

export const verifiedKnowledgeUnitInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(240),
  kind: kuKindSchema,
  statement: z.string().min(1).max(2000),
  sourceEvidence: sourceEvidenceSchema,
  /** Catalog: verified/corrected. Learner extracts: source_grounded (not authoritative). */
  verification: z.enum([
    "verified_from_source",
    "corrected",
    "source_grounded",
  ]),
  author: z.string().max(200).nullable().optional(),
  literaryWork: z.string().max(240).nullable().optional(),
  literaryMovement: z.string().max(120).nullable().optional(),
  datePeriod: z.string().max(120).nullable().optional(),
  definition: z.string().max(2000).nullable().optional(),
  concept: z.string().max(200).nullable().optional(),
  examRelevance: examRelevanceSchema.optional(),
});

export type VerifiedKnowledgeUnitInput = z.infer<
  typeof verifiedKnowledgeUnitInputSchema
>;

export const generatedQuestionSchema = z.object({
  id: z.string().uuid(),
  generationKind: z.enum(generatedQuestionKinds),
  difficultyBand: z.enum(questionDifficultyBands),
  /** Numeric 1–5 for Question Engine packs. */
  difficulty: z.number().int().min(1).max(5),
  knowledgeUnitIds: z.array(z.string().uuid()).min(1).max(8),
  /** Canonical correct answer summary (human + machine). */
  correctAnswer: z.union([
    z.string(),
    z.boolean(),
    z.array(z.string()),
    z.record(z.string(), z.string()),
    z.object({
      accepted: z.array(z.string()).optional(),
      keyTerms: z.array(z.string()).optional(),
      keyPoints: z.array(z.string()).optional(),
      front: z.string().optional(),
      back: z.string().optional(),
    }),
  ]),
  gradingRubric: gradingRubricSchema,
  sourceEvidence: sourceEvidenceSchema,
  fingerprint: z.string().min(8).max(200),
  /** Playable Question Engine item (absent for pure flashcards). */
  engineQuestion: engineQuestionSchema.optional(),
  /** Flashcard payload when generationKind === flashcard. */
  flashcard: flashcardItemSchema.optional(),
});

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export const questionGenerationResultSchema = z.object({
  questions: z.array(generatedQuestionSchema),
  skipped: z.array(
    z.object({
      knowledgeUnitId: z.string().uuid().optional(),
      reason: z.string().max(300),
    }),
  ),
  stats: z.object({
    inputUnits: z.number().int().min(0),
    emitted: z.number().int().min(0),
    duplicatesRemoved: z.number().int().min(0),
    unsupportedRejected: z.number().int().min(0),
    byKind: z.record(z.string(), z.number().int().min(0)),
    byDifficulty: z.record(z.string(), z.number().int().min(0)),
  }),
  generatedAt: z.string().datetime(),
});

export type QuestionGenerationResult = z.infer<
  typeof questionGenerationResultSchema
>;
