import { z } from "zod";

/** Pipeline lifecycle — never auto-advance to verified/published. */
export const ingestionStatuses = [
  "imported",
  "parsed",
  "needs_review",
  "verified",
  "published",
] as const;

export type IngestionStatus = (typeof ingestionStatuses)[number];

export const ingestionStatusSchema = z.enum(ingestionStatuses);

export type DiscoveredDocument = {
  absolutePath: string;
  relativePath: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  allowed: boolean;
  rejectReason?: string;
};

export type ExtractedBlock = {
  type: "heading" | "paragraph" | "list_item";
  level?: number;
  text: string;
};

export type ExtractedDocument = {
  title: string;
  blocks: ExtractedBlock[];
  plainText: string;
};

export type ProposedTopic = {
  id: string;
  slug: string;
  title: string;
  confidence: number;
  source: "filename" | "heading" | "heuristic";
};

export type ProposedKnowledgeUnit = {
  id: string;
  topicSlug: string;
  kind: "fact" | "concept" | "person" | "work" | "event" | "term" | "other";
  title: string;
  statement: string;
  importance: number;
  difficulty: number;
  confidence: number;
  examRelevance: "none" | "low" | "medium" | "high" | "critical";
  tags: string[];
  sourceChunkIds: string[];
  reviewStatus: "needs_review";
};

export type IngestedChunk = {
  id: string;
  chunkIndex: number;
  text: string;
  textSha256: string;
  headingPath: string | null;
  charStart: number | null;
  charEnd: number | null;
};

export type IngestedSourceDocument = {
  id: string;
  filename: string;
  relativePath: string;
  storagePath: string;
  title: string;
  contentSha256: string;
  mimeType: string;
  wordCountEst: number;
  sizeBytes: number;
  pipelineStatus: IngestionStatus;
  importedAt: string;
  updatedAt: string;
  version: number;
  chunks: IngestedChunk[];
  topics: ProposedTopic[];
  knowledgeUnits: ProposedKnowledgeUnit[];
  warnings: string[];
};

export type AuditLogEntry = {
  id: string;
  at: string;
  action: string;
  actor: "cli" | "admin" | "system";
  documentId?: string;
  filename?: string;
  detail: string;
  meta?: Record<string, string | number | boolean | null>;
};

export type IngestionRunResult = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  discovered: number;
  skippedNotAllowed: number;
  imported: number;
  unchanged: number;
  updated: number;
  failed: number;
  documents: IngestedSourceDocument[];
  rejected: Array<{ filename: string; reason: string }>;
  errors: Array<{ filename: string; error: string }>;
};
