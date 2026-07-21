import { z } from "zod";

export const qaValidationStatuses = [
  "verified_from_source",
  "needs_fact_check",
  "corrected",
  "rejected",
] as const;

export type QaValidationStatus = (typeof qaValidationStatuses)[number];

export const qaValidationStatusSchema = z.enum(qaValidationStatuses);

export const qaFlagCodes = [
  "impossible_chronology",
  "death_before_birth",
  "duplicate_statement",
  "conflicting_data",
  "similar_entity_conflict",
  "unclear_formulation",
  "awaiting_expert_review",
] as const;

export type QaFlagCode = (typeof qaFlagCodes)[number];

export type QaFlag = {
  code: QaFlagCode;
  reason: string;
  evidence?: string;
  relatedItemId?: string;
};

/**
 * Content QA unit — never silently mutates historical facts.
 * SOURCE is immutable; FINAL only after human verify/correct.
 */
export type ContentQaItem = {
  id: string;
  knowledgeUnitId: string;
  documentId: string;
  filename: string;
  kind: string;
  title: string;
  /** Exact statement from ingestion / source chunk — immutable. */
  sourceStatement: string;
  /** Cosmetic normalization only (whitespace, punctuation). Not a fact fix. */
  normalizedStatement: string;
  /** Human-approved statement for learning — null until verified/corrected. */
  publishedStatement: string | null;
  validationStatus: QaValidationStatus;
  flags: QaFlag[];
  reviewerNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContentQaRunResult = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  scanned: number;
  created: number;
  updated: number;
  flagged: number;
  cleanPendingReview: number;
};
