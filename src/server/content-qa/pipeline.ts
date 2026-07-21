import { detectFlagsForItem, type QaCandidate } from "@/server/content-qa/detectors";
import { extractBioStatementsFromText } from "@/server/content-qa/extract-bios";
import { normalizeStatement } from "@/server/content-qa/normalize";
import {
  createQaItemId,
  getQaItemByKnowledgeUnitId,
  saveQaItem,
  saveQaLastRun,
} from "@/server/content-qa/store";
import type {
  ContentQaItem,
  ContentQaRunResult,
} from "@/server/content-qa/types";
import { appendAudit, listDocuments } from "@/server/ingestion/store";
import { newId } from "@/server/ingestion/discover";
import { track } from "@/lib/analytics";

/**
 * Build / refresh QA items from ingested KU proposals + bio lines in chunks.
 * Never auto-sets verified_from_source, corrected, or publishedStatement.
 * Never auto-corrects historical facts.
 */
export async function runContentQaPipeline(options?: {
  actor?: "cli" | "admin" | "system";
}): Promise<ContentQaRunResult> {
  const actor = options?.actor ?? "system";
  const runId = newId();
  const startedAt = new Date().toISOString();

  track("content_qa_started", { runId });

  const documents = await listDocuments();
  const candidates: Array<
    QaCandidate & {
      documentId: string;
      filename: string;
      kind: string;
      title: string;
    }
  > = [];
  const seenStatements = new Set<string>();

  for (const doc of documents) {
    for (const ku of doc.knowledgeUnits) {
      const key = normalizeStatement(ku.statement).toLowerCase();
      seenStatements.add(key);
      candidates.push({
        id: ku.id,
        knowledgeUnitId: ku.id,
        documentId: doc.id,
        filename: doc.filename,
        kind: ku.kind,
        title: ku.title,
        statement: ku.statement,
      });
    }

    // Chunk bios: catch short person/year lines skipped by KU sentence floor
    for (const chunk of doc.chunks) {
      for (const bio of extractBioStatementsFromText(chunk.text)) {
        const key = normalizeStatement(bio.statement).toLowerCase();
        if (seenStatements.has(key)) continue;
        seenStatements.add(key);
        const syntheticId = `chunkbio:${chunk.id}:${key.slice(0, 48).replace(/\s+/g, "_")}`;
        candidates.push({
          id: syntheticId,
          knowledgeUnitId: syntheticId,
          documentId: doc.id,
          filename: doc.filename,
          kind: "person",
          title: bio.title,
          statement: bio.statement,
        });
      }
    }
  }

  const corpus: QaCandidate[] = candidates.map((c) => ({
    id: c.id,
    knowledgeUnitId: c.knowledgeUnitId,
    title: c.title,
    statement: c.statement,
    kind: c.kind,
  }));

  let created = 0;
  let updated = 0;
  let flagged = 0;
  let cleanPendingReview = 0;

  for (const candidate of candidates) {
    const flags = detectFlagsForItem(candidate, corpus);
    const now = new Date().toISOString();
    const existing = await getQaItemByKnowledgeUnitId(candidate.knowledgeUnitId);

    // Preserve human decisions on re-scan unless source statement changed
    if (
      existing &&
      existing.sourceStatement === candidate.statement &&
      (existing.validationStatus === "verified_from_source" ||
        existing.validationStatus === "corrected" ||
        existing.validationStatus === "rejected")
    ) {
      // Still refresh auto flags for visibility, but keep status + final
      const refreshed: ContentQaItem = {
        ...existing,
        flags:
          flags.length > 0
            ? flags
            : [
                {
                  code: "awaiting_expert_review",
                  reason: "Bez automatických anomálií — ponechán lidský verdikt.",
                },
              ],
        normalizedStatement: normalizeStatement(candidate.statement),
        updatedAt: now,
      };
      await saveQaItem(refreshed);
      updated += 1;
      if (flags.length) flagged += 1;
      continue;
    }

    const autoFlags =
      flags.length > 0
        ? flags
        : [
            {
              code: "awaiting_expert_review" as const,
              reason:
                "Bez automatických anomálií. Čeká na odbornou kontrolu před verified_from_source.",
            },
          ];

    const item: ContentQaItem = {
      id: existing?.id ?? createQaItemId(),
      knowledgeUnitId: candidate.knowledgeUnitId,
      documentId: candidate.documentId,
      filename: candidate.filename,
      kind: candidate.kind,
      title: candidate.title,
      sourceStatement: candidate.statement,
      normalizedStatement: normalizeStatement(candidate.statement),
      // Never auto-fill FINAL
      publishedStatement: existing?.publishedStatement ?? null,
      validationStatus: "needs_fact_check",
      flags: autoFlags,
      reviewerNote: existing?.reviewerNote ?? null,
      reviewedAt: null,
      reviewedBy: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await saveQaItem(item);
    if (existing) updated += 1;
    else created += 1;
    if (flags.length) flagged += 1;
    else cleanPendingReview += 1;
  }

  const result: ContentQaRunResult = {
    runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    scanned: candidates.length,
    created,
    updated,
    flagged,
    cleanPendingReview,
  };

  await saveQaLastRun(result);
  await appendAudit({
    actor,
    action: "content_qa_finished",
    detail: `QA run ${runId}: scanned=${result.scanned}, created=${result.created}, updated=${result.updated}, flagged=${result.flagged}`,
    meta: {
      runId,
      scanned: result.scanned,
      created: result.created,
      updated: result.updated,
      flagged: result.flagged,
      cleanPendingReview: result.cleanPendingReview,
    },
  });

  track("content_qa_finished", {
    runId,
    scanned: result.scanned,
    flagged: result.flagged,
  });

  return result;
}
