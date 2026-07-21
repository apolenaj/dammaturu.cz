import { normalizeText } from "@/domain/learning/question-engine";
import type { SourceEvidence } from "@/domain/learning/question-generation";

/** True when `answer` is literally supported by the source quote (normalized). */
export function isAnswerSupportedBySource(
  answer: string,
  evidence: SourceEvidence,
): boolean {
  const a = normalizeText(answer);
  const q = normalizeText(evidence.quote);
  if (!a || a.length < 2) return false;
  if (q.includes(a)) return true;
  // Allow multi-word answers if every significant token (≥3) appears
  const tokens = a.split(/\s+/).filter((t) => t.length >= 3);
  if (tokens.length >= 2 && tokens.every((t) => q.includes(t))) return true;
  return false;
}

export function assertAnswersSupported(
  answers: string[],
  evidence: SourceEvidence,
): boolean {
  return answers.every((a) => isAnswerSupportedBySource(a, evidence));
}

/** Statement must be grounded in the quote (not a freestanding invention). */
export function isStatementGrounded(
  statement: string,
  evidence: SourceEvidence,
): boolean {
  const s = normalizeText(statement);
  const q = normalizeText(evidence.quote);
  if (!s || !q) return false;
  if (q.includes(s) || s.includes(q.slice(0, Math.min(80, q.length)))) {
    return true;
  }
  const tokens = s.split(/\s+/).filter((t) => t.length >= 4);
  if (tokens.length === 0) return false;
  const hits = tokens.filter((t) => q.includes(t)).length;
  return hits / tokens.length >= 0.6;
}

export function fingerprintQuestion(parts: {
  generationKind: string;
  stem: string;
  answerKey: string;
}): string {
  const stem = normalizeText(parts.stem).slice(0, 100);
  const answer = normalizeText(parts.answerKey).slice(0, 80);
  return `${parts.generationKind}|${stem}|${answer}`;
}

/** Jaccard similarity on token sets — catches trivial rewords. */
export function stemSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeText(a).split(/\s+/).filter(Boolean));
  const tb = new Set(normalizeText(b).split(/\s+/).filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function extractYears(text: string): string[] {
  return [...text.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/g)].map((m) => m[1]!);
}

export function slugifyPart(input: string, max = 40): string {
  const base = normalizeText(input)
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (base || "otazka").slice(0, max);
}

export function buildExplanation(params: {
  core: string;
  evidence: SourceEvidence;
}): string {
  const page =
    params.evidence.pageStart != null
      ? ` (str. ${params.evidence.pageStart}${
          params.evidence.pageEnd != null &&
          params.evidence.pageEnd !== params.evidence.pageStart
            ? `–${params.evidence.pageEnd}`
            : ""
        })`
      : "";
  const text = `${params.core} Zdroj: ${params.evidence.sourceLabel}${page}. Citace: „${params.evidence.quote.slice(0, 220)}${params.evidence.quote.length > 220 ? "…" : ""}“.`;
  if (text.length >= 40) return text.slice(0, 1200);
  return `${text} Odpověď musí vycházet z tohoto ověřeného úryvku.`.slice(
    0,
    1200,
  );
}

export function sourceLabelFromEvidence(evidence: SourceEvidence): string {
  const page =
    evidence.pageStart != null ? ` · str. ${evidence.pageStart}` : "";
  return `${evidence.sourceLabel}${page}`.slice(0, 240);
}
