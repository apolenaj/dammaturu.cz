/**
 * Assemble content-trust records from Content QA + ingestion provenance.
 */

import {
  buildTrustRecord,
  qaValidationToTrustStatus,
  sanitizeSourceTitle,
  type ContentTrustRecord,
} from "@/domain/content/content-trust";
import {
  detectContentTrustIssues,
  type TrustDetectCandidate,
} from "@/domain/content/content-trust-detectors";
import {
  buildContentTrustReport,
  type ContentTrustReport,
} from "@/domain/content/content-trust-report";
import { listQaItems } from "@/server/content-qa/store";
import { listDocuments } from "@/server/ingestion/store";

export async function buildContentTrustReportFromStores(): Promise<ContentTrustReport> {
  const [qaItems, documents] = await Promise.all([
    listQaItems(),
    listDocuments(),
  ]);

  const kuMeta = new Map<
    string,
    {
      sourceId: string;
      sourceTitle: string;
      sourceText: string;
      pageStart: number | null;
      pageEnd: number | null;
      sectionPath: string | null;
      location: string | null;
      processingHints: string[];
      confidence: number | null;
    }
  >();

  for (const doc of documents) {
    const title =
      sanitizeSourceTitle(doc.title || doc.filename) ?? "Studijní materiál";
    const hints = [...(doc.warnings ?? [])];
    if (/scanned|ocr|bez textu/i.test(hints.join(" "))) {
      hints.push("scanned_suspect");
    }

    for (const ku of doc.knowledgeUnits) {
      const primary =
        doc.chunks.find((c) => ku.sourceChunkIds.includes(c.id)) ??
        doc.chunks.find((c) =>
          c.text.includes(ku.statement.slice(0, Math.min(40, ku.statement.length))),
        ) ??
        doc.chunks[0];
      const sectionPath = primary?.headingPath ?? null;
      const location = sectionPath;
      kuMeta.set(ku.id, {
        sourceId: doc.id,
        sourceTitle: title,
        sourceText: primary?.text?.slice(0, 2000) ?? ku.statement,
        pageStart: null,
        pageEnd: null,
        sectionPath,
        location,
        processingHints: hints,
        confidence: typeof ku.confidence === "number" ? ku.confidence : null,
      });
    }
  }

  const candidates: TrustDetectCandidate[] = [];

  for (const item of qaItems) {
    const meta = kuMeta.get(item.knowledgeUnitId);
    candidates.push({
      id: item.id,
      knowledgeUnitId: item.knowledgeUnitId,
      title: item.title,
      statement: item.sourceStatement,
      sourceText: meta?.sourceText ?? item.sourceStatement,
      sourceId: meta?.sourceId ?? item.documentId,
      answerKey: item.publishedStatement,
      processingHints: meta?.processingHints ?? [],
      confidence: meta?.confidence ?? null,
    });
  }

  for (const doc of documents) {
    for (const ku of doc.knowledgeUnits) {
      if (qaItems.some((q) => q.knowledgeUnitId === ku.id)) continue;
      const meta = kuMeta.get(ku.id);
      candidates.push({
        id: ku.id,
        knowledgeUnitId: ku.id,
        title: ku.title,
        statement: ku.statement,
        sourceText: meta?.sourceText ?? ku.statement,
        sourceId: meta?.sourceId ?? doc.id,
        answerKey: null,
        processingHints: meta?.processingHints ?? [],
        confidence: meta?.confidence ?? null,
      });
    }
  }

  const records: ContentTrustRecord[] = [];

  for (const candidate of candidates) {
    const qa = qaItems.find(
      (q) => q.knowledgeUnitId === candidate.knowledgeUnitId,
    );
    const meta = kuMeta.get(candidate.knowledgeUnitId);
    const autoIssues = detectContentTrustIssues(candidate, candidates);

    if (qa) {
      for (const f of qa.flags) {
        if (f.code === "duplicate_statement") {
          autoIssues.push({
            code: "duplicate",
            reasonCs: f.reason,
            evidence: f.evidence ?? null,
            relatedId: f.relatedItemId ?? null,
          });
        } else if (
          f.code === "conflicting_data" ||
          f.code === "similar_entity_conflict"
        ) {
          autoIssues.push({
            code: "contradictory_fact",
            reasonCs: f.reason,
            evidence: f.evidence ?? null,
            relatedId: f.relatedItemId ?? null,
          });
        } else if (f.code === "unclear_formulation") {
          autoIssues.push({
            code: "unclear_formulation",
            reasonCs: f.reason,
            evidence: f.evidence ?? null,
            relatedId: f.relatedItemId ?? null,
          });
        }
      }
    }

    const trustStatus = qa
      ? qaValidationToTrustStatus(qa.validationStatus)
      : autoIssues.length
        ? "REVIEW_REQUIRED"
        : "EXTRACTED";

    records.push(
      buildTrustRecord({
        knowledgeUnitId: candidate.knowledgeUnitId,
        title: candidate.title,
        statement: candidate.statement,
        sourceId: meta?.sourceId ?? qa?.documentId ?? null,
        sourceTitle:
          meta?.sourceTitle ?? sanitizeSourceTitle(qa?.filename ?? null),
        sourceLocation: meta?.location ?? null,
        pageStart: meta?.pageStart ?? null,
        pageEnd: meta?.pageEnd ?? null,
        sectionPath: meta?.sectionPath ?? null,
        trustStatus,
        lastUpdated: qa?.updatedAt ?? new Date().toISOString(),
        reviewedAt: qa?.reviewedAt ?? null,
        reviewedBy: qa?.reviewedBy ?? null,
        confidence: meta?.confidence ?? null,
        issues: autoIssues,
      }),
    );
  }

  return buildContentTrustReport(records);
}
