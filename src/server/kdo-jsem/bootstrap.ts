import { applyReviewerDecision } from "@/server/content-qa/reviewer";
import {
  createQaItemId,
  getQaItemByKnowledgeUnitId,
  saveQaItem,
} from "@/server/content-qa/store";
import { normalizeStatement } from "@/server/content-qa/normalize";
import type { ContentQaItem } from "@/server/content-qa/types";
import type { KdoJsemEvidence } from "@/domain/learning/kdo-jsem";
import { promises as fs } from "node:fs";
import path from "node:path";

const SEED_NOTE =
  "Kdo jsem? bootstrap: verified_from_source — exact SOURCE extract, no factual edits.";

export async function ensureVerbatimQaFact(params: {
  key: string;
  documentId: string;
  filename: string;
  sourceStatement: string;
  title: string;
}): Promise<ContentQaItem> {
  const knowledgeUnitId = `kdojsem:${params.key}`;
  const existing = await getQaItemByKnowledgeUnitId(knowledgeUnitId);
  if (
    existing &&
    (existing.validationStatus === "verified_from_source" ||
      existing.validationStatus === "corrected") &&
    existing.publishedStatement
  ) {
    return existing;
  }

  const now = new Date().toISOString();
  const normalized = normalizeStatement(params.sourceStatement);
  const item: ContentQaItem = existing ?? {
    id: createQaItemId(),
    knowledgeUnitId,
    documentId: params.documentId,
    filename: params.filename,
    kind: "fact",
    title: params.title,
    sourceStatement: params.sourceStatement.trim(),
    normalizedStatement: normalized,
    publishedStatement: null,
    validationStatus: "needs_fact_check",
    flags: [
      {
        code: "awaiting_expert_review",
        reason: "Kdo jsem? verbatim extract — pending verify seed.",
      },
    ],
    reviewerNote: null,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: now,
    updatedAt: now,
  };

  if (existing) {
    item.sourceStatement = existing.sourceStatement;
    item.normalizedStatement = normalizeStatement(existing.sourceStatement);
  } else {
    await saveQaItem(item);
  }

  const result = await applyReviewerDecision(item.id, {
    action: "verify",
    publishedStatement: item.normalizedStatement,
    reviewerNote: SEED_NOTE,
    reviewedBy: "kdo-jsem-seed",
  });
  if (!result.ok) throw new Error(result.error);
  return result.item;
}

export function toKdoJsemEvidence(
  localId: string,
  item: ContentQaItem,
): { id: string; evidence: KdoJsemEvidence } {
  if (
    item.validationStatus !== "verified_from_source" &&
    item.validationStatus !== "corrected"
  ) {
    throw new Error(`Item ${item.id} není verified/corrected.`);
  }
  if (!item.publishedStatement) {
    throw new Error(`Item ${item.id} nemá publishedStatement.`);
  }
  return {
    id: localId,
    evidence: {
      qaItemId: item.id,
      knowledgeUnitId: item.knowledgeUnitId,
      publishedStatement: item.publishedStatement,
      validationStatus: item.validationStatus,
      filename: item.filename,
    },
  };
}

export async function getIngestedDocumentMeta(
  filename: string,
): Promise<{ documentId: string; filename: string; plainText: string }> {
  const indexPath = path.join(process.cwd(), "data", "ingestion", "index.json");
  const index = JSON.parse(await fs.readFile(indexPath, "utf8")) as {
    byRelativePath: Record<string, string>;
  };
  const hit = Object.entries(index.byRelativePath).find(([rel]) =>
    rel.endsWith(filename),
  );
  if (!hit) {
    throw new Error(
      `Ingested document „${filename}“ nenalezen — spusť npm run ingest`,
    );
  }
  const documentId = hit[1]!;
  const docPath = path.join(
    process.cwd(),
    "data",
    "ingestion",
    "documents",
    `${documentId}.json`,
  );
  const doc = JSON.parse(await fs.readFile(docPath, "utf8")) as {
    filename: string;
    chunks: Array<{ text: string }>;
  };
  const plainText = doc.chunks.map((c) => c.text).join("\n\n");
  return { documentId, filename: doc.filename, plainText };
}

/** Assert sourceStatement is an exact substring of ingested plain text. */
export function assertVerbatimInSource(
  plainText: string,
  sourceStatement: string,
  label: string,
): void {
  const normalizedDoc = plainText.replace(/\s+/g, " ");
  const normalizedSrc = sourceStatement.trim().replace(/\s+/g, " ");
  if (!normalizedDoc.includes(normalizedSrc)) {
    // also try raw include (newlines)
    if (!plainText.includes(sourceStatement.trim())) {
      throw new Error(
        `Verbatim check failed for ${label}: extract not found in SOURCE`,
      );
    }
  }
}
