import {
  normalizeCzechForCompare,
} from "@/server/learner-materials/pipeline/normalize-cs";
import type { LearnerKnowledgeUnit } from "@/domain/learning/learner-knowledge";
import type {
  LearnerMaterial,
  MaterialChunk,
} from "@/domain/learning/learner-materials";

export type RetrievedChunk = {
  materialId: string;
  materialTitle: string;
  chunk: MaterialChunk;
  score: number;
  matchedTerms: string[];
};

export type RetrievedUnit = {
  materialId: string;
  materialTitle: string;
  unit: LearnerKnowledgeUnit;
  score: number;
  matchedTerms: string[];
};

const QUERY_STOP = new Set([
  "co",
  "jak",
  "o",
  "je",
  "jsou",
  "rika",
  "rekl",
  "material",
  "materialu",
  "materialy",
  "pro",
  "na",
  "ve",
  "ze",
  "se",
  "to",
  "ta",
  "ten",
]);

function tokenizeQuery(query: string): string[] {
  const norm = normalizeCzechForCompare(query);
  return norm
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !QUERY_STOP.has(t));
}

function termMatches(hay: string, term: string): boolean {
  if (!term || term.length < 2) return false;
  if (hay.includes(term)) return true;
  // Czech inflection soft match (Máchovi ≈ Mácha)
  if (term.length < 4) return false;
  const stemLen = Math.min(4, term.length);
  const stem = term.slice(0, stemLen);
  const words = hay.split(/\s+/);
  return words.some((w) => w.length >= 4 && (w.startsWith(stem) || stem.startsWith(w.slice(0, stemLen))));
}

function scoreText(
  text: string,
  terms: string[],
): { score: number; matched: string[] } {
  if (!terms.length || !text.trim()) return { score: 0, matched: [] };
  const hay = normalizeCzechForCompare(text);
  const matched: string[] = [];
  let hits = 0;
  for (const term of terms) {
    if (term.length < 2) continue;
    if (termMatches(hay, term)) {
      hits += 1;
      matched.push(term);
    }
  }
  const coverage = hits / terms.length;
  const density = hits / Math.max(1, Math.sqrt(hay.split(/\s+/).length));
  return { score: coverage * 0.7 + Math.min(1, density) * 0.3, matched };
}

/**
 * Retrieve relevant source chunks for a query from selected materials.
 * Lexical overlap only — never invents missing content.
 */
export function retrieveRelevantChunks(
  materials: LearnerMaterial[],
  query: string,
  opts?: { topK?: number; minScore?: number },
): RetrievedChunk[] {
  const topK = opts?.topK ?? 5;
  const minScore = opts?.minScore ?? 0.18;
  const terms = tokenizeQuery(query);
  if (!terms.length) return [];

  const scored: RetrievedChunk[] = [];
  for (const material of materials) {
    for (const chunk of material.chunks ?? []) {
      const { score, matched } = scoreText(chunk.text, terms);
      if (score < minScore || matched.length === 0) continue;
      scored.push({
        materialId: material.id,
        materialTitle: material.title,
        chunk,
        score,
        matchedTerms: matched,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function retrieveRelevantKnowledgeUnits(
  materials: LearnerMaterial[],
  query: string,
  opts?: { topK?: number; minScore?: number },
): RetrievedUnit[] {
  const topK = opts?.topK ?? 8;
  const minScore = opts?.minScore ?? 0.2;
  const terms = tokenizeQuery(query);
  if (!terms.length) return [];

  const scored: RetrievedUnit[] = [];
  for (const material of materials) {
    for (const unit of material.knowledgeUnits ?? []) {
      const blob = [
        unit.title,
        unit.statement,
        unit.provenance.sourceText,
        unit.grounded.author ?? "",
        unit.grounded.literaryWork ?? "",
        unit.grounded.literaryMovement ?? "",
        unit.grounded.definition ?? "",
      ].join(" ");
      const { score, matched } = scoreText(blob, terms);
      if (score < minScore || matched.length === 0) continue;
      scored.push({
        materialId: material.id,
        materialTitle: material.title,
        unit,
        score,
        matchedTerms: matched,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/** True when retrieval found enough overlapping evidence to answer. */
export function hasSufficientEvidence(
  chunks: RetrievedChunk[],
  units: RetrievedUnit[],
  opts?: { minChunkScore?: number; minUnitScore?: number },
): boolean {
  const minChunk = opts?.minChunkScore ?? 0.28;
  const minUnit = opts?.minUnitScore ?? 0.32;
  if (units.some((u) => u.score >= minUnit)) return true;
  if (chunks.some((c) => c.score >= minChunk)) return true;
  return false;
}
