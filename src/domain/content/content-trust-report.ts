/**
 * Internal content quality report — for editors, not students.
 */

import {
  contentTrustIssueCodes,
  contentTrustStatuses,
  type ContentTrustIssueCode,
  type ContentTrustRecord,
  type ContentTrustStatus,
} from "@/domain/content/content-trust";

export type ContentTrustReportSummary = {
  total: number;
  byStatus: Record<ContentTrustStatus, number>;
  byIssue: Record<ContentTrustIssueCode, number>;
  authoritativeCount: number;
  blockedFromFeedback: number;
  uncertaintyExposed: number;
  generatedAt: string;
};

export type ContentTrustReport = {
  summary: ContentTrustReportSummary;
  records: ContentTrustRecord[];
  /** Highest-severity rows first for the dashboard. */
  priorityQueue: ContentTrustRecord[];
};

export function emptyIssueCounts(): Record<ContentTrustIssueCode, number> {
  return Object.fromEntries(
    contentTrustIssueCodes.map((c) => [c, 0]),
  ) as Record<ContentTrustIssueCode, number>;
}

export function emptyStatusCounts(): Record<ContentTrustStatus, number> {
  return Object.fromEntries(
    contentTrustStatuses.map((s) => [s, 0]),
  ) as Record<ContentTrustStatus, number>;
}

export function buildContentTrustReport(
  records: ContentTrustRecord[],
  generatedAt = new Date().toISOString(),
): ContentTrustReport {
  const byStatus = emptyStatusCounts();
  const byIssue = emptyIssueCounts();
  let authoritativeCount = 0;
  let blockedFromFeedback = 0;
  let uncertaintyExposed = 0;

  for (const r of records) {
    byStatus[r.trustStatus] += 1;
    if (r.authoritativeForFeedback) authoritativeCount += 1;
    else blockedFromFeedback += 1;
    if (r.trustStatus !== "VERIFIED") uncertaintyExposed += 1;
    for (const issue of r.issues) {
      byIssue[issue.code] += 1;
    }
  }

  const severity = (r: ContentTrustRecord): number => {
    let s = 0;
    if (r.trustStatus === "REJECTED") s += 50;
    if (r.trustStatus === "REVIEW_REQUIRED") s += 30;
    if (r.issues.some((i) => i.code === "contradictory_fact")) s += 40;
    if (r.issues.some((i) => i.code === "answer_not_supported_by_source"))
      s += 35;
    if (r.issues.some((i) => i.code === "suspicious_ocr")) s += 25;
    if (r.issues.some((i) => i.code === "missing_answer_key")) s += 20;
    if (r.issues.some((i) => i.code === "duplicate")) s += 10;
    if (!r.sourceId) s += 15;
    return s;
  };

  const priorityQueue = [...records]
    .filter((r) => !r.authoritativeForFeedback || r.issues.length > 0)
    .sort((a, b) => severity(b) - severity(a))
    .slice(0, 100);

  return {
    summary: {
      total: records.length,
      byStatus,
      byIssue,
      authoritativeCount,
      blockedFromFeedback,
      uncertaintyExposed,
      generatedAt,
    },
    records,
    priorityQueue,
  };
}
