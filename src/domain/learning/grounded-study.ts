import { z } from "zod";
import { openAnswerEvaluationSchema } from "@/domain/learning/open-answer-eval";

/**
 * Strict source-grounded study from learner materials.
 * No LLM required — explanations/questions/grading use only retrieved source text.
 * Optional AI enhance must degrade gracefully; core learning never depends on it.
 */

export const INSUFFICIENT_EVIDENCE_CS =
  "V dostupných materiálech to nemám dostatečně podložené.";

/** @deprecated alias — same refusal copy for grounded assistant. */
export const GROUNDED_ASSISTANT_INSUFFICIENT_CS = INSUFFICIENT_EVIDENCE_CS;

export const evidenceConfidenceStates = [
  "verified_from_source",
  "likely",
  "needs_review",
  "insufficient",
] as const;

export type EvidenceConfidence = (typeof evidenceConfidenceStates)[number];

export const evidenceConfidenceLabelsCs: Record<EvidenceConfidence, string> = {
  verified_from_source: "Ověřeno ze zdroje",
  likely: "Pravděpodobné",
  needs_review: "Vyžaduje kontrolu",
  insufficient: "Nedostatek podkladů",
};

export const sourceCitationSchema = z.object({
  documentId: z.string().uuid(),
  documentTitle: z.string().min(1).max(240),
  chunkId: z.string().uuid().nullable(),
  knowledgeUnitId: z.string().uuid().nullable(),
  pageStart: z.number().int().min(1).nullable(),
  pageEnd: z.number().int().min(1).nullable(),
  sectionPath: z.array(z.string().max(200)).max(20),
  headingPath: z.string().max(500).nullable(),
  sourceText: z.string().min(1).max(2000),
  sourceRef: z.string().max(800).nullable(),
});

export type SourceCitation = z.infer<typeof sourceCitationSchema>;

export const groundedStudyItemSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["explain", "recall"]),
  prompt: z.string().min(1).max(500),
  /** Answer text drawn only from source (never invented). */
  groundedAnswer: z.string().min(1).max(2000),
  expectedKeyPhrases: z.array(z.string().min(1).max(80)).max(24),
  confidence: z.enum(evidenceConfidenceStates),
  citations: z.array(sourceCitationSchema).min(1).max(8),
  knowledgeUnitId: z.string().uuid().nullable(),
  topic: z.string().max(200).nullable(),
});

export type GroundedStudyItem = z.infer<typeof groundedStudyItemSchema>;

export const groundedStudySessionSchema = z.object({
  materialIds: z.array(z.string().uuid()).min(1).max(8),
  materialTitles: z.array(z.string().min(1).max(240)).min(1).max(8),
  items: z.array(groundedStudyItemSchema).max(60),
  skippedNeedsReview: z.number().int().min(0),
  builtAt: z.string().datetime(),
});

export type GroundedStudySession = z.infer<typeof groundedStudySessionSchema>;

export const groundedGradeResultSchema = z.object({
  result: z.enum(["correct", "partial", "incorrect", "insufficient"]),
  coverage: z.number().min(0).max(1),
  matchedPhrases: z.array(z.string()),
  missingPhrases: z.array(z.string()),
  /** Claims in the student answer that are not supported by retrieved evidence. */
  unsupportedClaims: z.array(z.string()).max(12),
  feedback: z.string().min(1).max(1200),
  confidence: z.enum(evidenceConfidenceStates),
  citations: z.array(sourceCitationSchema).max(8),
  showInsufficientMessage: z.boolean(),
  openEvaluation: openAnswerEvaluationSchema.optional(),
});

export type GroundedGradeResult = z.infer<typeof groundedGradeResultSchema>;

export const groundedExplanationSchema = z.object({
  text: z.string().max(2000),
  confidence: z.enum(evidenceConfidenceStates),
  citations: z.array(sourceCitationSchema).max(8),
  insufficient: z.boolean(),
});

export type GroundedExplanation = z.infer<typeof groundedExplanationSchema>;

const CZECH_STOPWORDS = new Set(
  [
    "a",
    "aby",
    "ale",
    "ani",
    "az",
    "bez",
    "co",
    "cz",
    "do",
    "ho",
    "i",
    "jak",
    "je",
    "jeho",
    "jeji",
    "jejich",
    "jen",
    "jeste",
    "ji",
    "jsem",
    "jsme",
    "jsou",
    "k",
    "ke",
    "která",
    "ktere",
    "ktery",
    "ku",
    "ma",
    "mi",
    "mne",
    "mu",
    "na",
    "nad",
    "nebo",
    "než",
    "nez",
    "o",
    "od",
    "on",
    "ona",
    "ono",
    "po",
    "pod",
    "pro",
    "pri",
    "se",
    "si",
    "so",
    "s",
    "ta",
    "tak",
    "taky",
    "ten",
    "to",
    "tom",
    "tu",
    "tym",
    "u",
    "uz",
    "v",
    "ve",
    "vsak",
    "z",
    "za",
    "ze",
    "že",
  ].map((w) => w.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")),
);

export function normalizeStudyToken(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/** Key phrases for grading — from source text only. */
export function extractKeyPhrasesFromSource(
  sourceText: string,
  limit = 12,
): string[] {
  const years = [...sourceText.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/g)].map(
    (m) => m[1]!,
  );
  const words = sourceText
    .split(/[^\p{L}\p{N}]+/u)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);

  const out: string[] = [];
  const seen = new Set<string>();

  for (const y of years) {
    if (!seen.has(y)) {
      seen.add(y);
      out.push(y);
    }
  }

  for (const w of words) {
    const norm = normalizeStudyToken(w);
    if (!norm || norm.length < 3) continue;
    if (CZECH_STOPWORDS.has(norm)) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(w);
    if (out.length >= limit) break;
  }

  return out;
}

export function mapEvidenceConfidence(params: {
  confidence: number;
  flags: string[];
  hasSourceText: boolean;
  /** Human / Content QA verification — only then claim „Ověřeno ze zdroje“. */
  trustAuthoritative?: boolean;
}): EvidenceConfidence {
  if (!params.hasSourceText) return "insufficient";
  if (params.trustAuthoritative === true) return "verified_from_source";
  if (
    params.flags.includes("conflicting") ||
    params.flags.includes("ambiguous") ||
    params.flags.includes("needs_human_review")
  ) {
    return "needs_review";
  }
  // Heuristic extraction must never claim full verification.
  if (
    params.confidence >= 0.55 &&
    !params.flags.includes("low_confidence") &&
    !params.flags.includes("unclear_formulation")
  ) {
    return "likely";
  }
  if (params.confidence >= 0.4) return "likely";
  return "needs_review";
}

export function formatCitationLocation(citation: SourceCitation): string {
  // Student-safe: title only + optional page/section — never file paths.
  const title = citation.documentTitle.replace(/^.*[/\\]/, "").trim();
  const parts: string[] = [title || "Studijní materiál"];
  if (citation.pageStart != null) {
    parts.push(
      citation.pageEnd != null && citation.pageEnd !== citation.pageStart
        ? `str. ${citation.pageStart}–${citation.pageEnd}`
        : `str. ${citation.pageStart}`,
    );
  }
  if (citation.headingPath) {
    parts.push(citation.headingPath);
  } else if (citation.sectionPath.length) {
    parts.push(citation.sectionPath.join(" › "));
  }
  return parts.join(" · ");
}

/** Compact student label — „Zdroj: … – studijní materiál“. */
export function formatStudentCitationLabel(citation: SourceCitation): string {
  const title = citation.documentTitle.replace(/^.*[/\\]/, "").trim();
  const base = title || "studijní materiál";
  const friendly = /studijní materiál/i.test(base)
    ? base
    : `${base} – studijní materiál`;
  return `Zdroj: ${friendly}`;
}
