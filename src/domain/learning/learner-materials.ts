import { z } from "zod";
import {
  knowledgeExtractionSummarySchema,
  learnerKnowledgeUnitSchema,
} from "@/domain/learning/learner-knowledge";

/**
 * Learner “Moje materiály” — user-owned study documents.
 * Status is honest: Ready only after successful text extraction.
 */

export const materialStatuses = [
  "uploading",
  "processing",
  "ready",
  "needs_attention",
  "failed",
] as const;

export type MaterialStatus = (typeof materialStatuses)[number];

export const materialStatusSchema = z.enum(materialStatuses);

export const materialStatusLabelsCs: Record<MaterialStatus, string> = {
  uploading: "Nahrávám",
  processing: "Zpracovávám",
  ready: "Připraveno",
  needs_attention: "Vyžaduje pozornost",
  failed: "Selhalo",
};

/** Formats supported for extraction today. */
export const supportedMaterialFormats = ["pdf", "docx", "txt"] as const;
export type SupportedMaterialFormat = (typeof supportedMaterialFormats)[number];

/** Accepted later — architecture reserved; upload rejected with clear message. */
export const plannedMaterialFormats = ["png", "jpg", "jpeg", "webp", "pptx"] as const;
export type PlannedMaterialFormat = (typeof plannedMaterialFormats)[number];

export const materialFormatSchema = z.enum([
  ...supportedMaterialFormats,
  ...plannedMaterialFormats,
]);

export type MaterialFormat = z.infer<typeof materialFormatSchema>;

export const materialProcessingIssues = [
  "empty_pdf",
  "empty_document",
  "malformed_pdf",
  "scanned_no_text",
  "unsupported_format",
  "duplicate",
  "very_large",
  "extract_failed",
] as const;

export type MaterialProcessingIssue =
  (typeof materialProcessingIssues)[number];

export const materialDiagnosticsSchema = z.object({
  extractOk: z.boolean(),
  pageCount: z.number().int().min(0).nullable(),
  pagesWithText: z.number().int().min(0).nullable(),
  headingCount: z.number().int().min(0),
  topicCount: z.number().int().min(0),
  knowledgePointCount: z.number().int().min(0),
  plainTextLength: z.number().int().min(0),
  chunkCount: z.number().int().min(0),
  truncated: z.boolean().default(false),
  omittedChars: z.number().int().min(0).default(0),
  contentLossRisk: z.enum([
    "none",
    "truncated",
    "low_text",
    "scanned_suspect",
  ]),
  warnings: z.array(z.string().max(400)).max(40),
  issues: z.array(z.enum(materialProcessingIssues)).max(20),
  duplicateOfId: z.string().uuid().nullable().optional(),
  processingMs: z.number().int().min(0).optional(),
});

export type MaterialDiagnostics = z.infer<typeof materialDiagnosticsSchema>;

export const materialTopicSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  source: z.enum(["heading", "document"]),
});

export type MaterialTopic = z.infer<typeof materialTopicSchema>;

export const materialChunkSchema = z.object({
  id: z.string().uuid(),
  chunkIndex: z.number().int().min(0),
  text: z.string().min(1),
  textSha256: z.string().length(64).optional(),
  charStart: z.number().int().min(0).optional(),
  charEnd: z.number().int().min(0).optional(),
  headingPath: z.string().max(500).nullable().optional(),
  sectionPath: z.array(z.string().max(200)).max(20).optional(),
  pageStart: z.number().int().min(1).nullable().optional(),
  pageEnd: z.number().int().min(1).nullable().optional(),
  /** Stable human/machine pointer back to origin. */
  sourceRef: z.string().max(800).optional(),
});

export type MaterialChunk = z.infer<typeof materialChunkSchema>;

export const learnerMaterialSchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().min(1).max(64),
  title: z.string().min(1).max(240),
  originalFilename: z.string().min(1).max(500),
  format: materialFormatSchema,
  mimeType: z.string().min(1).max(120),
  byteSize: z.number().int().min(0),
  contentSha256: z.string().length(64),
  /** Relative path under data/learner-materials/{learnerId}/files/ */
  storageFilename: z.string().min(1).max(200),
  status: materialStatusSchema,
  /** User-visible reason / ready summary. */
  statusMessage: z.string().max(800).nullable(),
  plainTextLength: z.number().int().min(0).default(0),
  chunkCount: z.number().int().min(0).default(0),
  topicCount: z.number().int().min(0).default(0),
  /** Count of grounded KnowledgeUnits (not raw chunks). */
  knowledgePointCount: z.number().int().min(0).default(0),
  topics: z.array(materialTopicSchema).max(100).optional(),
  knowledgeUnits: z.array(learnerKnowledgeUnitSchema).max(200).optional(),
  knowledgeExtraction: knowledgeExtractionSummarySchema.optional(),
  diagnostics: materialDiagnosticsSchema.optional(),
  /** If this upload matched an existing file for the same learner. */
  duplicateOfId: z.string().uuid().nullable().optional(),
  /** Present when ready / needs_attention after processing. */
  chunks: z.array(materialChunkSchema).max(4000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  processedAt: z.string().datetime().nullable(),
});

export type LearnerMaterial = z.infer<typeof learnerMaterialSchema>;

/** List item — omit heavy chunk / KU bodies. */
export type LearnerMaterialListItem = Omit<
  LearnerMaterial,
  "chunks" | "knowledgeUnits"
> & {
  hasExtractedText: boolean;
};

export const materialsConfig = {
  maxFileBytes: 15 * 1024 * 1024,
  maxFilesPerBatch: 8,
  /** Below this extracted length → needs_attention (not Ready). */
  minReadyChars: 40,
  acceptMime: {
    pdf: ["application/pdf"],
    docx: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream",
    ],
    txt: ["text/plain", "application/octet-stream"],
    png: ["image/png"],
    jpg: ["image/jpeg"],
    jpeg: ["image/jpeg"],
    webp: ["image/webp"],
    pptx: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  } as Record<MaterialFormat, string[]>,
} as const;

export function extensionToFormat(
  filename: string,
): MaterialFormat | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if ((supportedMaterialFormats as readonly string[]).includes(ext)) {
    return ext as SupportedMaterialFormat;
  }
  if ((plannedMaterialFormats as readonly string[]).includes(ext)) {
    return ext as PlannedMaterialFormat;
  }
  return null;
}

export function isSupportedFormat(
  format: MaterialFormat,
): format is SupportedMaterialFormat {
  return (supportedMaterialFormats as readonly string[]).includes(format);
}

export function toListItem(m: LearnerMaterial): LearnerMaterialListItem {
  const { chunks, knowledgeUnits, ...rest } = m;
  void chunks;
  void knowledgeUnits;
  return {
    ...rest,
    hasExtractedText: rest.plainTextLength >= materialsConfig.minReadyChars,
  };
}
