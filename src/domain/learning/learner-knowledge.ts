import { z } from "zod";
import {
  examRelevanceSchema,
  kuKindSchema,
  relationshipTypeSchema,
} from "@/domain/content/schemas";

/**
 * Learner-document KnowledgeUnits — grounded drafts only.
 * Never auto-published; every unit carries source provenance.
 */

export const learnerKuFlags = [
  "ambiguous",
  "conflicting",
  "unclear_formulation",
  "low_confidence",
  "duplicate_candidate",
  "needs_human_review",
] as const;

export type LearnerKuFlag = (typeof learnerKuFlags)[number];

/** Fields filled only when explicitly supported by source text. */
export const groundedFieldsSchema = z.object({
  topic: z.string().max(200).nullable().optional(),
  subtopic: z.string().max(200).nullable().optional(),
  definition: z.string().max(2000).nullable().optional(),
  author: z.string().max(200).nullable().optional(),
  literaryWork: z.string().max(240).nullable().optional(),
  literaryMovement: z.string().max(120).nullable().optional(),
  datePeriod: z.string().max(120).nullable().optional(),
  concept: z.string().max(200).nullable().optional(),
  relationshipType: relationshipTypeSchema.nullable().optional(),
  relationshipSubject: z.string().max(200).nullable().optional(),
  relationshipObject: z.string().max(200).nullable().optional(),
  importantFact: z.string().max(2000).nullable().optional(),
  examRelevance: examRelevanceSchema.optional(),
});

export type GroundedFields = z.infer<typeof groundedFieldsSchema>;

export const learnerKuProvenanceSchema = z.object({
  documentId: z.string().uuid(),
  chunkId: z.string().uuid(),
  sourceRef: z.string().max(800).nullable(),
  pageStart: z.number().int().min(1).nullable(),
  pageEnd: z.number().int().min(1).nullable(),
  sectionPath: z.array(z.string().max(200)).max(20),
  headingPath: z.string().max(500).nullable(),
  /** Verbatim supporting span from the source (never paraphrased inventively). */
  sourceText: z.string().min(1).max(2000),
  confidence: z.number().min(0).max(1),
});

export type LearnerKuProvenance = z.infer<typeof learnerKuProvenanceSchema>;

export const learnerKnowledgeUnitSchema = z.object({
  id: z.string().uuid(),
  kind: kuKindSchema,
  title: z.string().min(1).max(240),
  /** Atomic statement copied/trimmed from source — not invented. */
  statement: z.string().min(1).max(2000),
  grounded: groundedFieldsSchema,
  provenance: learnerKuProvenanceSchema,
  flags: z.array(z.enum(learnerKuFlags)).max(12),
  flagNotes: z.array(z.string().max(400)).max(12),
  /** Always needs_review until human/curriculum verification. */
  reviewStatus: z.literal("needs_review"),
  importance: z.number().int().min(1).max(5),
  difficulty: z.number().int().min(1).max(5),
  examRelevance: examRelevanceSchema,
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string().min(1).max(64)).max(24),
});

export type LearnerKnowledgeUnit = z.infer<typeof learnerKnowledgeUnitSchema>;

export const knowledgeExtractionSummarySchema = z.object({
  knowledgeUnitCount: z.number().int().min(0),
  flaggedCount: z.number().int().min(0),
  byKind: z.record(z.string(), z.number().int().min(0)),
  ambiguousOrConflicting: z.number().int().min(0),
});

export type KnowledgeExtractionSummary = z.infer<
  typeof knowledgeExtractionSummarySchema
>;
