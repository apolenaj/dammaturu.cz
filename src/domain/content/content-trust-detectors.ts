/**
 * Content trust detectors — flags only; never mutates source facts.
 */

import type {
  ContentTrustIssue,
  ContentTrustIssueCode,
} from "@/domain/content/content-trust";

export type TrustDetectCandidate = {
  id: string;
  knowledgeUnitId: string;
  title: string;
  statement: string;
  sourceText?: string | null;
  sourceId?: string | null;
  /** Ideal / key answer for a linked question (optional). */
  answerKey?: string | null;
  /** Processing / OCR diagnostics. */
  processingHints?: string[];
  confidence?: number | null;
};

function pushIssue(
  out: ContentTrustIssue[],
  code: ContentTrustIssueCode,
  reasonCs: string,
  evidence: string | null = null,
  relatedId: string | null = null,
) {
  out.push({ code, reasonCs, evidence, relatedId });
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(
    normalize(a)
      .split(/[^a-z0-9á-ž]+/i)
      .filter((t) => t.length >= 3),
  );
  const tb = normalize(b)
    .split(/[^a-z0-9á-ž]+/i)
    .filter((t) => t.length >= 3);
  if (!ta.size || !tb.length) return 0;
  let hit = 0;
  for (const t of tb) if (ta.has(t)) hit += 1;
  return hit / Math.max(tb.length, 1);
}

/**
 * Detect duplicates, contradictions, OCR issues, missing keys,
 * and answers not supported by source text.
 */
export function detectContentTrustIssues(
  item: TrustDetectCandidate,
  corpus: TrustDetectCandidate[],
): ContentTrustIssue[] {
  const issues: ContentTrustIssue[] = [];
  const statement = item.statement.trim();
  const source = (item.sourceText ?? "").trim();

  if (!item.sourceId) {
    pushIssue(issues, "missing_source", "Chybí identifikátor zdroje.");
  }

  if (!source && item.sourceId) {
    pushIssue(
      issues,
      "missing_source",
      "Zdroj je uveden, ale chybí citovatelný úryvek.",
    );
  }

  // Malformed extraction
  if (
    statement.length < 12 ||
    /[\uFFFD]{2,}/.test(statement) ||
    /(.)\1{5,}/.test(statement) ||
    /^[^a-zá-žA-ZÁ-Ž0-9]{3,}/.test(statement) ||
    (statement.match(/\s{3,}/g)?.length ?? 0) > 2
  ) {
    pushIssue(
      issues,
      "malformed_extraction",
      "Extrakce vypadá poškozeně nebo neúplně.",
      statement.slice(0, 120),
    );
  }

  // Suspicious OCR / scan artifacts
  const ocrHints = item.processingHints ?? [];
  const ocrBlob = `${statement} ${source} ${ocrHints.join(" ")}`;
  if (
    ocrHints.some((h) =>
      /scanned|ocr|no_text|content_loss|gibberish/i.test(h),
    ) ||
    /[Il|]{4,}/.test(statement) ||
    /\b[a-z]{1}\s[a-z]{1}\s[a-z]{1}\s[a-z]{1}\b/i.test(statement) ||
    (statement.length > 40 &&
      (statement.match(/[^a-zá-žA-ZÁ-Ž0-9\s.,;:?!„“"'\-()]/g)?.length ?? 0) /
        statement.length >
        0.18)
  ) {
    pushIssue(
      issues,
      "suspicious_ocr",
      "Podezření na špatné OCR nebo sken bez spolehlivého textu.",
      ocrBlob.slice(0, 160),
    );
  }

  if (item.confidence != null && item.confidence < 0.4) {
    pushIssue(
      issues,
      "low_confidence",
      `Nízká jistota extrakce (${Math.round(item.confidence * 100)} %).`,
    );
  }

  if (
    statement.length < 25 ||
    /…|\.{3}$/.test(statement) ||
    /^[a-zá-ž]/.test(statement)
  ) {
    pushIssue(
      issues,
      "unclear_formulation",
      "Nejasná nebo neúplná formulace — zkontroluj zdroj.",
    );
  }

  // Missing answer key (when question-shaped)
  const looksLikeQuestion =
    /\?$/.test(item.title.trim()) ||
    /^(co |kdo |kdy |kde |proč |jak |kter)/i.test(item.title.trim());
  if (looksLikeQuestion && !item.answerKey?.trim()) {
    pushIssue(
      issues,
      "missing_answer_key",
      "Otázka nemá klíč odpovědi.",
      item.title.slice(0, 120),
    );
  }

  // Answer not supported by source
  if (item.answerKey?.trim() && source) {
    const overlap = tokenOverlap(source, item.answerKey);
    if (overlap < 0.25) {
      pushIssue(
        issues,
        "answer_not_supported_by_source",
        "Klíč odpovědi není dostatečně podložený úryvkem zdroje.",
        item.answerKey.slice(0, 160),
      );
    }
  } else if (statement && source) {
    const overlap = tokenOverlap(source, statement);
    if (overlap < 0.15 && statement.length > 40) {
      pushIssue(
        issues,
        "answer_not_supported_by_source",
        "Tvrzení se málo překrývá se zdrojovým úryvkem.",
        statement.slice(0, 120),
      );
    }
  }

  const selfNorm = normalize(statement);

  for (const other of corpus) {
    if (other.id === item.id) continue;
    const otherNorm = normalize(other.statement);
    if (!selfNorm || !otherNorm) continue;

    // Near-duplicate
    const sim =
      selfNorm === otherNorm
        ? 1
        : tokenOverlap(statement, other.statement);
    if (sim >= 0.9 || selfNorm === otherNorm) {
      pushIssue(
        issues,
        "duplicate",
        "Duplicitní nebo téměř stejné tvrzení.",
        other.statement.slice(0, 160),
        other.knowledgeUnitId,
      );
    }

    // Contradiction: same title / entity, different years
    if (
      normalize(item.title) === normalize(other.title) &&
      normalize(item.title).length > 4
    ) {
      const yearsA = [...statement.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/g)].map(
        (m) => m[1]!,
      );
      const yearsB = [
        ...other.statement.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/g),
      ].map((m) => m[1]!);
      if (
        yearsA.length &&
        yearsB.length &&
        yearsA.join(",") !== yearsB.join(",")
      ) {
        pushIssue(
          issues,
          "contradictory_fact",
          "Stejný titul, rozdílné letopočty — možný rozpor.",
          `${yearsA.join("/")} vs ${yearsB.join("/")}`,
          other.knowledgeUnitId,
        );
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return issues.filter((i) => {
    const key = `${i.code}:${i.evidence ?? ""}:${i.relatedId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
