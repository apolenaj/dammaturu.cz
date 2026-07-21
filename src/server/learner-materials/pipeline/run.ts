import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  KnowledgeExtractionSummary,
  LearnerKnowledgeUnit,
} from "@/domain/learning/learner-knowledge";
import {
  materialsConfig,
  type LearnerMaterial,
  type MaterialChunk,
  type MaterialDiagnostics,
  type MaterialProcessingIssue,
  type MaterialStatus,
  type MaterialTopic,
} from "@/domain/learning/learner-materials";
import {
  chunkSemanticBlocks,
  semanticChunkLimits,
} from "@/server/learner-materials/pipeline/chunk-semantic";
import {
  collectHeadingTitles,
  detectHeadingsInBlocks,
} from "@/server/learner-materials/pipeline/detect-headings";
import {
  buildDiagnostics,
  formatReadyStatusMessage,
} from "@/server/learner-materials/pipeline/diagnostics";
import {
  extractLearnerDocument,
  isMalformedPdfError,
  UnsupportedFormatError,
} from "@/server/learner-materials/pipeline/extract";
import { extractGroundedKnowledgeUnits } from "@/server/learner-materials/pipeline/extract-knowledge";
import {
  flagAmbiguousKnowledgeUnits,
  summarizeKnowledgeExtraction,
} from "@/server/learner-materials/pipeline/flag-knowledge";
import { normalizeCzechText } from "@/server/learner-materials/pipeline/normalize-cs";
import {
  materialFilePath,
  sha256Buffer,
  updateMaterialStatus,
} from "@/server/learner-materials/store";

const VERY_LARGE_CHARS = 400_000;

export type IngestionPipelineResult = {
  status: MaterialStatus;
  statusMessage: string | null;
  plainTextLength: number;
  chunkCount: number;
  chunks: MaterialChunk[];
  topics: MaterialTopic[];
  topicCount: number;
  knowledgePointCount: number;
  knowledgeUnits: LearnerKnowledgeUnit[];
  knowledgeExtraction: KnowledgeExtractionSummary;
  diagnostics: MaterialDiagnostics;
  title?: string;
};

function emptyKnowledge(): Pick<
  IngestionPipelineResult,
  "knowledgeUnits" | "knowledgeExtraction" | "knowledgePointCount"
> {
  const knowledgeUnits: LearnerKnowledgeUnit[] = [];
  return {
    knowledgeUnits,
    knowledgeExtraction: summarizeKnowledgeExtraction(knowledgeUnits),
    knowledgePointCount: 0,
  };
}

function overflowPath(learnerId: string, materialId: string): string {
  return path.join(
    process.cwd(),
    "data",
    "learner-materials",
    learnerId,
    "meta",
    `${materialId}.overflow.txt`,
  );
}

async function verifyOriginalIntact(material: LearnerMaterial): Promise<void> {
  const filePath = materialFilePath(
    material.learnerId,
    material.storageFilename,
  );
  const buffer = await fs.readFile(filePath);
  const actual = sha256Buffer(buffer);
  if (actual !== material.contentSha256) {
    throw new Error(
      "Kontrola úložiště selhala — soubor na disku neodpovídá kontrolnímu součtu.",
    );
  }
}

function proposeTopics(
  headings: string[],
  fallbackTitle: string,
): MaterialTopic[] {
  if (headings.length === 0) {
    return [
      {
        id: createHash("sha256")
          .update(`topic:${fallbackTitle}`)
          .digest("hex")
          .slice(0, 32),
        title: fallbackTitle.slice(0, 200) || "Dokument",
        source: "document",
      },
    ];
  }
  return headings.slice(0, 80).map((title) => ({
    id: createHash("sha256")
      .update(`heading:${title}`)
      .digest("hex")
      .slice(0, 32),
    title: title.slice(0, 200),
    source: "heading" as const,
  }));
}

function toMaterialChunks(
  chunks: ReturnType<typeof chunkSemanticBlocks>["chunks"],
): MaterialChunk[] {
  return chunks.map((c) => ({
    id: c.id,
    chunkIndex: c.chunkIndex,
    text: c.text,
    textSha256: c.textSha256,
    charStart: c.charStart,
    charEnd: c.charEnd,
    headingPath: c.headingPath,
    sectionPath: c.sectionPath,
    pageStart: c.pageStart,
    pageEnd: c.pageEnd,
    sourceRef: c.sourceRef,
  }));
}

function extractKnowledgeFromChunks(
  documentId: string,
  chunks: MaterialChunk[],
  topics: MaterialTopic[],
): Pick<
  IngestionPipelineResult,
  "knowledgeUnits" | "knowledgeExtraction" | "knowledgePointCount"
> {
  const raw = extractGroundedKnowledgeUnits({ documentId, chunks, topics });
  const knowledgeUnits = flagAmbiguousKnowledgeUnits(raw);
  const knowledgeExtraction = summarizeKnowledgeExtraction(knowledgeUnits);
  return {
    knowledgeUnits,
    knowledgeExtraction,
    knowledgePointCount: knowledgeUnits.length,
  };
}

/**
 * Full learner document ingestion: verify → extract → normalize → headings →
 * semantic chunks → topics → grounded KnowledgeUnits → diagnostics.
 * Never silently drops content; never invents unsupported facts.
 */
export async function runLearnerIngestionPipeline(
  material: LearnerMaterial,
): Promise<IngestionPipelineResult> {
  const started = Date.now();
  const issues: MaterialProcessingIssue[] = [];

  try {
    await verifyOriginalIntact(material);
  } catch (error) {
    const diagnostics = buildDiagnostics({
      format: material.format,
      pageCount: null,
      pagesWithText: null,
      headingCount: 0,
      topicCount: 0,
      knowledgePointCount: 0,
      plainTextLength: 0,
      chunkCount: 0,
      truncated: false,
      omittedChars: 0,
      scannedSuspect: false,
      emptyDocument: false,
      veryLarge: false,
      duplicateOfId: null,
      processingMs: Date.now() - started,
      issues: ["extract_failed"],
      extraWarnings: [
        error instanceof Error ? error.message : "Kontrola souboru selhala.",
      ],
    });
    return {
      status: "failed",
      statusMessage:
        "Soubor se nepodařilo ověřit v úložišti. Zkus ho nahrát znovu.",
      plainTextLength: 0,
      chunkCount: 0,
      chunks: [],
      topics: [],
      topicCount: 0,
      diagnostics,
      ...emptyKnowledge(),
    };
  }

  let buffer: Buffer;
  try {
    buffer = await fs.readFile(
      materialFilePath(material.learnerId, material.storageFilename),
    );
  } catch {
    const diagnostics = buildDiagnostics({
      format: material.format,
      pageCount: null,
      pagesWithText: null,
      headingCount: 0,
      topicCount: 0,
      knowledgePointCount: 0,
      plainTextLength: 0,
      chunkCount: 0,
      truncated: false,
      omittedChars: 0,
      scannedSuspect: false,
      emptyDocument: false,
      veryLarge: false,
      duplicateOfId: null,
      processingMs: Date.now() - started,
      issues: ["extract_failed"],
    });
    return {
      status: "failed",
      statusMessage: "Originál souboru v úložišti chybí. Nahraj ho prosím znovu.",
      plainTextLength: 0,
      chunkCount: 0,
      chunks: [],
      topics: [],
      topicCount: 0,
      diagnostics,
      ...emptyKnowledge(),
    };
  }

  try {
    const extracted = await extractLearnerDocument(
      material.format,
      buffer,
      material.title,
    );

    const promotePlain = material.format !== "docx";
    const withHeadings = detectHeadingsInBlocks(extracted.blocks, {
      promotePlain,
    });
    const headingTitles = collectHeadingTitles(withHeadings);
    const topics = proposeTopics(
      headingTitles,
      normalizeCzechText(extracted.title || material.title),
    );

    const { chunks, truncated, omittedChars, omittedText } =
      chunkSemanticBlocks(withHeadings, material.id);

    if (truncated && omittedText) {
      await fs.writeFile(
        overflowPath(material.learnerId, material.id),
        `# overflow for ${material.id}\nomittedChars=${omittedChars}\nhardMaxChunks=${semanticChunkLimits.hardMaxChunks}\n\n${omittedText}\n`,
        "utf8",
      );
    } else {
      try {
        await fs.unlink(overflowPath(material.learnerId, material.id));
      } catch {
        // no overflow file
      }
    }

    const materialChunks = toMaterialChunks(chunks);
    const knowledge = extractKnowledgeFromChunks(
      material.id,
      materialChunks,
      topics,
    );
    const plainTextLength = normalizeCzechText(extracted.plainText).length;
    const pagesWithText =
      extracted.pages.length > 0
        ? extracted.pages.filter((p) => p.charCount > 0).length
        : null;
    const veryLarge =
      plainTextLength >= VERY_LARGE_CHARS ||
      chunks.length >= semanticChunkLimits.hardMaxChunks * 0.8;

    if (extracted.emptyDocument && material.format === "pdf") {
      issues.push("empty_pdf");
    }
    if (extracted.scannedSuspect) {
      issues.push("scanned_no_text");
    }

    const diagnostics = buildDiagnostics({
      format: material.format,
      pageCount: extracted.pageCount,
      pagesWithText,
      headingCount: headingTitles.length,
      topicCount: topics.length,
      knowledgePointCount: knowledge.knowledgePointCount,
      plainTextLength,
      chunkCount: materialChunks.length,
      truncated,
      omittedChars,
      scannedSuspect: extracted.scannedSuspect,
      emptyDocument: extracted.emptyDocument,
      veryLarge,
      duplicateOfId: null,
      processingMs: Date.now() - started,
      issues,
      extraWarnings:
        knowledge.knowledgeExtraction.ambiguousOrConflicting > 0
          ? [
              `${knowledge.knowledgeExtraction.ambiguousOrConflicting} znalostních bodů je nejednoznačných nebo konfliktních — vyžadují kontrolu.`,
            ]
          : undefined,
    });

    if (
      plainTextLength < materialsConfig.minReadyChars ||
      extracted.emptyDocument ||
      extracted.scannedSuspect
    ) {
      let statusMessage: string;
      if (extracted.scannedSuspect) {
        statusMessage =
          "Soubor jsme otevřeli, ale skoro žádný text v něm není — pravděpodobně naskenované PDF bez OCR. Zkus DOCX/TXT nebo PDF s textem.";
      } else if (extracted.emptyDocument) {
        statusMessage =
          material.format === "pdf"
            ? "PDF je prázdné nebo neobsahuje čitelný text."
            : "Dokument je prázdný — nenalezli jsme žádný text.";
      } else {
        statusMessage =
          "Textu je málo na spolehlivé zpracování. Zkus bohatší materiál nebo jiný formát.";
      }

      return {
        status: "needs_attention",
        statusMessage,
        plainTextLength,
        chunkCount: materialChunks.length,
        chunks: materialChunks,
        topics,
        topicCount: topics.length,
        diagnostics,
        title: extracted.title || material.title,
        ...knowledge,
      };
    }

    let statusMessage = formatReadyStatusMessage(
      topics.length,
      knowledge.knowledgePointCount,
    );
    if (truncated) {
      statusMessage = `${statusMessage} Pozor: část velmi dlouhého dokumentu je uložená zvlášť (přetečení), aby se nic neztratilo.`;
    }
    if (knowledge.knowledgeExtraction.ambiguousOrConflicting > 0) {
      statusMessage = `${statusMessage} Některé body jsou nejednoznačné — zkontroluj je.`;
    }

    return {
      status: "ready",
      statusMessage,
      plainTextLength,
      chunkCount: materialChunks.length,
      chunks: materialChunks,
      topics,
      topicCount: topics.length,
      diagnostics,
      title: material.title || extracted.title,
      ...knowledge,
    };
  } catch (error) {
    if (error instanceof UnsupportedFormatError) {
      const diagnostics = buildDiagnostics({
        format: material.format,
        pageCount: null,
        pagesWithText: null,
        headingCount: 0,
        topicCount: 0,
        knowledgePointCount: 0,
        plainTextLength: 0,
        chunkCount: 0,
        truncated: false,
        omittedChars: 0,
        scannedSuspect: false,
        emptyDocument: false,
        veryLarge: false,
        duplicateOfId: null,
        processingMs: Date.now() - started,
        issues: ["unsupported_format"],
      });
      return {
        status: "failed",
        statusMessage: error.message,
        plainTextLength: 0,
        chunkCount: 0,
        chunks: [],
        topics: [],
        topicCount: 0,
        diagnostics,
        ...emptyKnowledge(),
      };
    }

    const malformed =
      material.format === "pdf" && isMalformedPdfError(error);
    const diagnostics = buildDiagnostics({
      format: material.format,
      pageCount: null,
      pagesWithText: null,
      headingCount: 0,
      topicCount: 0,
      knowledgePointCount: 0,
      plainTextLength: 0,
      chunkCount: 0,
      truncated: false,
      omittedChars: 0,
      scannedSuspect: false,
      emptyDocument: false,
      veryLarge: false,
      duplicateOfId: null,
      processingMs: Date.now() - started,
      issues: [malformed ? "malformed_pdf" : "extract_failed"],
      extraWarnings: [
        malformed
          ? "PDF je poškozené nebo nečitelné."
          : "Extrakce textu selhala.",
      ],
    });

    return {
      status: malformed ? "needs_attention" : "failed",
      statusMessage: malformed
        ? "PDF vypadá poškozené nebo nečitelné. Zkus soubor znovu uložit nebo nahraj DOCX/TXT."
        : "Zpracování se nepovedlo. Zkus to znovu, nebo nahraj jiný soubor.",
      plainTextLength: 0,
      chunkCount: 0,
      chunks: [],
      topics: [],
      topicCount: 0,
      diagnostics,
      ...emptyKnowledge(),
    };
  }
}

export async function applyIngestionResult(
  material: LearnerMaterial,
  result: IngestionPipelineResult,
): Promise<LearnerMaterial> {
  const next = await updateMaterialStatus(material.learnerId, material.id, {
    status: result.status,
    statusMessage: result.statusMessage,
    plainTextLength: result.plainTextLength,
    chunkCount: result.chunkCount,
    chunks: result.chunks,
    topics: result.topics,
    topicCount: result.topicCount,
    knowledgePointCount: result.knowledgePointCount,
    knowledgeUnits: result.knowledgeUnits,
    knowledgeExtraction: result.knowledgeExtraction,
    diagnostics: result.diagnostics,
    processedAt: new Date().toISOString(),
    title: result.title,
  });
  return next ?? material;
}
