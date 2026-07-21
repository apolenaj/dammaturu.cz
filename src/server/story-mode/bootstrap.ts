import { applyReviewerDecision } from "@/server/content-qa/reviewer";
import {
  createQaItemId,
  getQaItemByKnowledgeUnitId,
  listQaItems,
  saveQaItem,
} from "@/server/content-qa/store";
import { normalizeStatement } from "@/server/content-qa/normalize";
import type { ContentQaItem } from "@/server/content-qa/types";
import type { StoryEvidence } from "@/domain/learning/story-mode";

const SEED_NOTE =
  "Story Mode bootstrap: verified_from_source — exact SOURCE text, no factual edits. Auditable seed for Národní obrození narrative.";

/**
 * Ensure a QA item is verified_from_source with FINAL = normalized SOURCE.
 * Never invents or corrects historical facts.
 */
export async function ensureVerifiedFromSource(
  knowledgeUnitId: string,
): Promise<ContentQaItem> {
  const item = await getQaItemByKnowledgeUnitId(knowledgeUnitId);
  if (!item) {
    throw new Error(
      `QA item for KU ${knowledgeUnitId} nenalezen — nejdřív npm run ingest && npm run content-qa`,
    );
  }

  if (
    item.validationStatus === "verified_from_source" &&
    item.publishedStatement
  ) {
    return item;
  }

  if (item.validationStatus === "corrected" && item.publishedStatement) {
    return item;
  }

  const result = await applyReviewerDecision(item.id, {
    action: "verify",
    publishedStatement: item.normalizedStatement,
    reviewerNote: SEED_NOTE,
    reviewedBy: "story-mode-seed",
  });
  if (!result.ok) throw new Error(result.error);
  return result.item;
}

/**
 * Create + verify a verbatim extract as its own QA unit (when KU split lost context, e.g. name heading).
 * sourceStatement must be copied from the source document — never invented.
 */
export async function ensureVerbatimQaFact(params: {
  key: string;
  documentId: string;
  filename: string;
  sourceStatement: string;
  title: string;
}): Promise<ContentQaItem> {
  const knowledgeUnitId = `storyfact:${params.key}`;
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
        reason: "Story Mode verbatim extract — pending verify seed.",
      },
    ],
    reviewerNote: null,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: now,
    updatedAt: now,
  };

  // Keep source immutable if re-seeded
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
    reviewedBy: "story-mode-seed",
  });
  if (!result.ok) throw new Error(result.error);
  return result.item;
}

export function toStoryEvidence(
  localId: string,
  item: ContentQaItem,
): { id: string; evidence: StoryEvidence } {
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

export async function findNoDocumentMeta(): Promise<{
  documentId: string;
  filename: string;
}> {
  const items = await listQaItems();
  const hit = items.find((i) =>
    /obrozen/i.test(i.filename),
  );
  if (!hit) {
    throw new Error("Nenalezen QA obsah z Národní obrození — spusť ingest + content-qa.");
  }
  return { documentId: hit.documentId, filename: hit.filename };
}
