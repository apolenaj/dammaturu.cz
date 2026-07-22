/**
 * Content Trust Pipeline — every learning fact/question must be traceable.
 * Statuses are explicit; uncertainty is never hidden from students or editors.
 */

import { z } from "zod";

export const contentTrustStatuses = [
  "DRAFT",
  "EXTRACTED",
  "REVIEW_REQUIRED",
  "VERIFIED",
  "REJECTED",
] as const;

export type ContentTrustStatus = (typeof contentTrustStatuses)[number];

export const contentTrustStatusLabelsCs: Record<ContentTrustStatus, string> = {
  DRAFT: "Koncept",
  EXTRACTED: "Extrahováno",
  REVIEW_REQUIRED: "Ke kontrole",
  VERIFIED: "Ověřeno",
  REJECTED: "Zamítnuto",
};

export const contentTrustStatusDescriptionsCs: Record<
  ContentTrustStatus,
  string
> = {
  DRAFT: "Rozpracováno — ještě není připraveno ke kontrole.",
  EXTRACTED: "Vytaženo ze zdroje — čeká na automatickou a lidskou kontrolu.",
  REVIEW_REQUIRED: "Vyžaduje lidskou kontrolu před použitím ve feedbacku.",
  VERIFIED: "Schváleno — smí být autoritativní zpětná vazba pro studenta.",
  REJECTED: "Zamítnuto — nepoužívat ve student feedbacku.",
};

/** Issues the trust pipeline can raise (never auto-cleared silently). */
export const contentTrustIssueCodes = [
  "duplicate",
  "contradictory_fact",
  "malformed_extraction",
  "suspicious_ocr",
  "missing_answer_key",
  "answer_not_supported_by_source",
  "missing_source",
  "missing_location",
  "low_confidence",
  "unclear_formulation",
] as const;

export type ContentTrustIssueCode = (typeof contentTrustIssueCodes)[number];

export const contentTrustIssueLabelsCs: Record<ContentTrustIssueCode, string> =
  {
    duplicate: "Duplicita",
    contradictory_fact: "Rozporuplný fakt",
    malformed_extraction: "Poškozená extrakce",
    suspicious_ocr: "Podezřelé OCR / sken",
    missing_answer_key: "Chybí klíč odpovědi",
    answer_not_supported_by_source: "Odpověď není ve zdroji",
    missing_source: "Chybí zdroj",
    missing_location: "Chybí lokalizace ve zdroji",
    low_confidence: "Nízká jistota",
    unclear_formulation: "Nejasná formulace",
  };

export const contentTrustIssueSchema = z.object({
  code: z.enum(contentTrustIssueCodes),
  reasonCs: z.string().min(1).max(500),
  evidence: z.string().max(800).nullable(),
  relatedId: z.string().max(120).nullable(),
});

export type ContentTrustIssue = z.infer<typeof contentTrustIssueSchema>;

/**
 * Traceability retained for every knowledge unit / learning fact.
 * Never store or expose internal filesystem paths in student-facing fields.
 */
export const contentTrustRecordSchema = z.object({
  knowledgeUnitId: z.string().min(1).max(120),
  sourceId: z.string().min(1).max(120).nullable(),
  /** Human-readable source title (student-safe). */
  sourceTitle: z.string().min(1).max(240).nullable(),
  /** Page / section / heading — not a file path. */
  sourceLocation: z.string().max(500).nullable(),
  pageStart: z.number().int().min(1).nullable(),
  pageEnd: z.number().int().min(1).nullable(),
  sectionPath: z.string().max(500).nullable(),
  trustStatus: z.enum(contentTrustStatuses),
  reviewedStatus: z.enum(contentTrustStatuses),
  lastUpdated: z.string().datetime(),
  reviewedAt: z.string().datetime().nullable(),
  reviewedBy: z.string().max(120).nullable(),
  /** 0–1 editorial/model confidence; null = unknown. */
  confidence: z.number().min(0).max(1).nullable(),
  verificationLabelCs: z.string().min(1).max(80),
  statement: z.string().min(1).max(2000),
  title: z.string().min(1).max(240),
  issues: z.array(contentTrustIssueSchema).max(32),
  /** True only when safe for authoritative student feedback. */
  authoritativeForFeedback: z.boolean(),
});

export type ContentTrustRecord = z.infer<typeof contentTrustRecordSchema>;

/** Map legacy Content QA validation → trust status. */
export function qaValidationToTrustStatus(
  status:
    | "verified_from_source"
    | "needs_fact_check"
    | "corrected"
    | "rejected"
    | string,
): ContentTrustStatus {
  switch (status) {
    case "verified_from_source":
    case "corrected":
      return "VERIFIED";
    case "rejected":
      return "REJECTED";
    case "needs_fact_check":
      return "REVIEW_REQUIRED";
    default:
      return "EXTRACTED";
  }
}

/** Map publish / review draft states → trust status. */
export function publishToTrustStatus(
  status: "draft" | "needs_review" | "published" | "archived" | string,
): ContentTrustStatus {
  switch (status) {
    case "published":
      return "VERIFIED";
    case "needs_review":
      return "REVIEW_REQUIRED";
    case "archived":
      return "REJECTED";
    case "draft":
      return "DRAFT";
    default:
      return "DRAFT";
  }
}

/**
 * Only VERIFIED content may drive authoritative student feedback
 * (ideal answers, “ověřeno ze zdroje”, published explanations).
 */
export function isAuthoritativeForStudentFeedback(
  status: ContentTrustStatus,
): boolean {
  return status === "VERIFIED";
}

export function buildTrustRecord(input: {
  knowledgeUnitId: string;
  title: string;
  statement: string;
  sourceId: string | null;
  sourceTitle: string | null;
  sourceLocation?: string | null;
  pageStart?: number | null;
  pageEnd?: number | null;
  sectionPath?: string | null;
  trustStatus: ContentTrustStatus;
  lastUpdated: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  confidence?: number | null;
  issues?: ContentTrustIssue[];
}): ContentTrustRecord {
  const issues = input.issues ?? [];
  const hasBlocking =
    !input.sourceId ||
    issues.some((i) =>
      (
        [
          "contradictory_fact",
          "answer_not_supported_by_source",
          "missing_answer_key",
          "suspicious_ocr",
          "malformed_extraction",
          "missing_source",
        ] as ContentTrustIssueCode[]
      ).includes(i.code),
    );

  let trustStatus = input.trustStatus;
  if (trustStatus === "VERIFIED" && hasBlocking) {
    trustStatus = "REVIEW_REQUIRED";
  }
  if (!input.sourceId && trustStatus !== "REJECTED") {
    trustStatus =
      trustStatus === "DRAFT" ? "DRAFT" : "REVIEW_REQUIRED";
  }

  return {
    knowledgeUnitId: input.knowledgeUnitId,
    sourceId: input.sourceId,
    sourceTitle: sanitizeSourceTitle(input.sourceTitle),
    sourceLocation: sanitizeSourceLocation(
      input.sourceLocation ??
        composeLocation({
          pageStart: input.pageStart ?? null,
          pageEnd: input.pageEnd ?? null,
          sectionPath: input.sectionPath ?? null,
        }),
    ),
    pageStart: input.pageStart ?? null,
    pageEnd: input.pageEnd ?? null,
    sectionPath: input.sectionPath ?? null,
    trustStatus,
    reviewedStatus: trustStatus,
    lastUpdated: input.lastUpdated,
    reviewedAt: input.reviewedAt ?? null,
    reviewedBy: input.reviewedBy ?? null,
    confidence: input.confidence ?? null,
    verificationLabelCs: contentTrustStatusLabelsCs[trustStatus],
    statement: input.statement,
    title: input.title,
    issues,
    authoritativeForFeedback: isAuthoritativeForStudentFeedback(trustStatus),
  };
}

/** Strip filesystem paths / absolute URLs that look like local paths. */
export function sanitizeSourceTitle(title: string | null | undefined): string | null {
  if (!title?.trim()) return null;
  let t = title.trim();
  t = t.replace(/^file:\/\//i, "");
  t = t.replace(/\\/g, "/");

  // Path-like → basename without extension
  if (
    t.includes("/") ||
    /^[A-Za-z]:\//.test(t) ||
    t.includes("source-materials")
  ) {
    const base = (t.split("/").filter(Boolean).pop() ?? t).replace(
      /\.[a-z0-9]+$/i,
      "",
    );
    return (base || "Studijní materiál").slice(0, 240);
  }

  if (/\.(pdf|docx?|txt|md)$/i.test(t) && !/\s/.test(t)) {
    return t.replace(/\.[a-z0-9]+$/i, "").slice(0, 240);
  }
  return t.slice(0, 240);
}

export function sanitizeSourceLocation(
  location: string | null | undefined,
): string | null {
  if (!location?.trim()) return null;
  const cleaned = sanitizeSourceTitle(location);
  if (!cleaned) return null;
  if (/[/\\]/.test(cleaned) && !cleaned.includes(" › ")) {
    return null;
  }
  return cleaned.slice(0, 500);
}

function composeLocation(parts: {
  pageStart: number | null;
  pageEnd: number | null;
  sectionPath: string | null;
}): string | null {
  const bits: string[] = [];
  if (parts.pageStart != null) {
    bits.push(
      parts.pageEnd != null && parts.pageEnd !== parts.pageStart
        ? `str. ${parts.pageStart}–${parts.pageEnd}`
        : `str. ${parts.pageStart}`,
    );
  }
  if (parts.sectionPath?.trim()) bits.push(parts.sectionPath.trim());
  return bits.length ? bits.join(" · ") : null;
}

/**
 * Student-facing source line — simple, no paths.
 * Example: „Zdroj: Národní obrození – studijní materiál“
 */
export function formatStudentSourceLabel(input: {
  sourceTitle: string | null | undefined;
  fallbackCs?: string;
}): string {
  const title =
    sanitizeSourceTitle(input.sourceTitle) ??
    input.fallbackCs ??
    "studijní materiál";
  const friendly = /studijní materiál/i.test(title)
    ? title
    : `${title} – studijní materiál`;
  return `Zdroj: ${friendly}`;
}

export function formatStudentSourceDetail(input: {
  sourceTitle: string | null | undefined;
  sourceLocation?: string | null;
  excerpt?: string | null;
  trustStatus?: ContentTrustStatus;
  showUncertainty?: boolean;
}): {
  labelCs: string;
  detailCs: string | null;
  uncertaintyCs: string | null;
} {
  const labelCs = formatStudentSourceLabel({
    sourceTitle: input.sourceTitle,
  });
  const loc = sanitizeSourceLocation(input.sourceLocation ?? null);
  const detailParts: string[] = [];
  if (loc) detailParts.push(loc);
  if (input.excerpt?.trim()) {
    detailParts.push(
      `„${input.excerpt.trim().slice(0, 220)}${input.excerpt.length > 220 ? "…" : ""}“`,
    );
  }
  const showUncertainty = input.showUncertainty !== false;
  let uncertaintyCs: string | null = null;
  if (showUncertainty && input.trustStatus && input.trustStatus !== "VERIFIED") {
    uncertaintyCs =
      input.trustStatus === "REJECTED"
        ? "Tento podklad není schválený — ber feedback s rezervou."
        : "Podklad ještě není plně ověřen — jistota je omezená.";
  }
  return {
    labelCs,
    detailCs: detailParts.length ? detailParts.join(" · ") : null,
    uncertaintyCs,
  };
}
