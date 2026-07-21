import { promises as fs } from "node:fs";
import { chunkExtractedDocument } from "@/server/ingestion/chunk";
import { detectTopics } from "@/server/ingestion/detect-topics";
import {
  discoverSourceDocuments,
  newId,
  sha256Buffer,
  SOURCE_MATERIALS_DIR,
} from "@/server/ingestion/discover";
import { extractDocx } from "@/server/ingestion/extract-docx";
import { proposeKnowledgeUnits } from "@/server/ingestion/propose-kus";
import {
  appendAudit,
  findDocumentByPath,
  saveDocument,
  saveLastRun,
} from "@/server/ingestion/store";
import type {
  IngestedSourceDocument,
  IngestionRunResult,
} from "@/server/ingestion/types";
import { track } from "@/lib/analytics";

export type RunIngestionOptions = {
  actor?: "cli" | "admin" | "system";
  /** Only process this filename if set */
  onlyFilename?: string;
  rootDir?: string;
};

/**
 * Safe, idempotent DOCX ingestion.
 * - Never writes to content/source-materials
 * - Rejects non-allowlisted files
 * - Leaves pipelineStatus at needs_review (never auto verified/published)
 */
export async function runIngestionPipeline(
  options: RunIngestionOptions = {},
): Promise<IngestionRunResult> {
  const actor = options.actor ?? "system";
  const rootDir = options.rootDir ?? SOURCE_MATERIALS_DIR;
  const runId = newId();
  const startedAt = new Date().toISOString();

  const discovered = await discoverSourceDocuments(rootDir);
  const filtered = options.onlyFilename
    ? discovered.filter((d) => d.filename === options.onlyFilename)
    : discovered;

  const result: IngestionRunResult = {
    runId,
    startedAt,
    finishedAt: startedAt,
    discovered: filtered.length,
    skippedNotAllowed: 0,
    imported: 0,
    unchanged: 0,
    updated: 0,
    failed: 0,
    documents: [],
    rejected: [],
    errors: [],
  };

  await appendAudit({
    actor,
    action: "ingestion_started",
    detail: `Run ${runId}: discovered ${filtered.length} file(s)`,
    meta: { runId, rootDir },
  });
  track("ingestion_started", { runId, discovered: filtered.length });

  for (const file of filtered) {
    if (!file.allowed) {
      result.skippedNotAllowed += 1;
      result.rejected.push({
        filename: file.filename,
        reason: file.rejectReason ?? "rejected",
      });
      await appendAudit({
        actor,
        action: "ingestion_rejected",
        filename: file.filename,
        detail: file.rejectReason ?? "rejected",
      });
      continue;
    }

    try {
      const buffer = await fs.readFile(file.absolutePath);
      const contentSha256 = sha256Buffer(buffer);
      const existing = await findDocumentByPath(file.relativePath);

      // Idempotent: same path + same hash → skip heavy re-parse
      if (
        existing &&
        existing.contentSha256 === contentSha256 &&
        existing.pipelineStatus !== "imported"
      ) {
        result.unchanged += 1;
        result.documents.push(existing);
        await appendAudit({
          actor,
          action: "ingestion_unchanged",
          documentId: existing.id,
          filename: file.filename,
          detail: "Stejný content hash — re-import přeskočen",
          meta: { contentSha256 },
        });
        continue;
      }

      const extracted = await extractDocx(file.absolutePath, file.filename);
      const chunks = chunkExtractedDocument(extracted);
      const topics = detectTopics(file.filename, extracted);
      const knowledgeUnits = proposeKnowledgeUnits({
        filename: file.filename,
        extracted,
        chunks,
        topics,
      });

      const now = new Date().toISOString();
      const wordCountEst = extracted.plainText
        .split(/\s+/)
        .filter(Boolean).length;

      const doc: IngestedSourceDocument = {
        id: existing?.id ?? newId().replace(/-/g, ""),
        filename: file.filename,
        relativePath: file.relativePath,
        storagePath: file.relativePath,
        title: extracted.title,
        contentSha256,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        wordCountEst,
        sizeBytes: file.sizeBytes,
        // End state after successful parse: needs_review (never auto verified)
        pipelineStatus: "needs_review",
        importedAt: existing?.importedAt ?? now,
        updatedAt: now,
        version: (existing?.version ?? 0) + 1,
        chunks,
        topics,
        knowledgeUnits,
        warnings: [
          "Automaticky navržené KU mají nízkou confidence — vyžadují review.",
          "Stav verified/published se nenastavuje automaticky.",
        ],
      };

      await saveDocument(doc);
      result.documents.push(doc);

      if (existing) {
        result.updated += 1;
        await appendAudit({
          actor,
          action: "ingestion_updated",
          documentId: doc.id,
          filename: file.filename,
          detail: `Re-import v${doc.version}: ${chunks.length} chunks, ${knowledgeUnits.length} KU proposals`,
          meta: {
            chunks: chunks.length,
            kus: knowledgeUnits.length,
            contentSha256,
          },
        });
      } else {
        result.imported += 1;
        await appendAudit({
          actor,
          action: "ingestion_imported",
          documentId: doc.id,
          filename: file.filename,
          detail: `Import: ${chunks.length} chunks, ${knowledgeUnits.length} KU proposals → needs_review`,
          meta: {
            chunks: chunks.length,
            kus: knowledgeUnits.length,
            contentSha256,
          },
        });
      }
    } catch (error) {
      result.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push({ filename: file.filename, error: message });
      await appendAudit({
        actor,
        action: "ingestion_failed",
        filename: file.filename,
        detail: message,
      });
    }
  }

  result.finishedAt = new Date().toISOString();
  await saveLastRun(result);
  await appendAudit({
    actor,
    action: "ingestion_finished",
    detail: `Run ${runId}: imported=${result.imported}, updated=${result.updated}, unchanged=${result.unchanged}, rejected=${result.skippedNotAllowed}, failed=${result.failed}`,
    meta: {
      runId,
      imported: result.imported,
      updated: result.updated,
      unchanged: result.unchanged,
      failed: result.failed,
    },
  });
  track("ingestion_finished", {
    runId,
    imported: result.imported,
    updated: result.updated,
    failed: result.failed,
  });

  return result;
}
