import { randomUUID } from "node:crypto";
import type { LearnerKnowledgeUnit } from "@/domain/learning/learner-knowledge";
import type { LearnerMaterial } from "@/domain/learning/learner-materials";
import {
  extractKeyPhrasesFromSource,
  INSUFFICIENT_EVIDENCE_CS,
  mapEvidenceConfidence,
  type EvidenceConfidence,
  type GroundedExplanation,
  type GroundedStudyItem,
  type GroundedStudySession,
  type SourceCitation,
} from "@/domain/learning/grounded-study";
import {
  hasSufficientEvidence,
  retrieveRelevantChunks,
  retrieveRelevantKnowledgeUnits,
} from "@/server/learner-materials/retrieve";

function citationFromUnit(
  material: LearnerMaterial,
  unit: LearnerKnowledgeUnit,
): SourceCitation {
  return {
    documentId: material.id,
    documentTitle: material.title,
    chunkId: unit.provenance.chunkId,
    knowledgeUnitId: unit.id,
    pageStart: unit.provenance.pageStart,
    pageEnd: unit.provenance.pageEnd,
    sectionPath: unit.provenance.sectionPath,
    headingPath: unit.provenance.headingPath,
    sourceText: unit.provenance.sourceText,
    sourceRef: unit.provenance.sourceRef,
  };
}

function citationFromChunk(
  materialId: string,
  materialTitle: string,
  chunk: NonNullable<LearnerMaterial["chunks"]>[number],
): SourceCitation {
  return {
    documentId: materialId,
    documentTitle: materialTitle,
    chunkId: chunk.id,
    knowledgeUnitId: null,
    pageStart: chunk.pageStart ?? null,
    pageEnd: chunk.pageEnd ?? null,
    sectionPath: chunk.sectionPath ?? [],
    headingPath: chunk.headingPath ?? null,
    sourceText: chunk.text.slice(0, 2000),
    sourceRef: chunk.sourceRef ?? null,
  };
}

function confidenceForUnit(unit: LearnerKnowledgeUnit): EvidenceConfidence {
  return mapEvidenceConfidence({
    confidence: unit.confidence,
    flags: unit.flags,
    hasSourceText: Boolean(unit.provenance.sourceText?.trim()),
  });
}

function buildGroundedAnswer(unit: LearnerKnowledgeUnit): string {
  const parts: string[] = [unit.statement.trim()];
  if (
    unit.grounded.definition &&
    !parts[0]!.includes(unit.grounded.definition.slice(0, 40))
  ) {
    parts.push(unit.grounded.definition.trim());
  }
  return parts.join(" ").slice(0, 2000);
}

function promptForUnit(unit: LearnerKnowledgeUnit): string {
  if (unit.kind === "person" && unit.grounded.author) {
    return `Co říká tvůj materiál o autorovi ${unit.grounded.author}?`;
  }
  if (unit.kind === "work" && unit.grounded.literaryWork) {
    return `Co říká tvůj materiál o díle ${unit.grounded.literaryWork}?`;
  }
  if (unit.grounded.literaryMovement) {
    return `Co říká tvůj materiál o směru ${unit.grounded.literaryMovement}?`;
  }
  if (unit.grounded.concept) {
    return `Jak tvůj materiál vysvětluje pojem „${unit.grounded.concept}“?`;
  }
  return `Co říká tvůj materiál o: ${unit.title}?`;
}

/**
 * Build a study session strictly from selected materials' grounded KUs.
 * Skips units without source text. Does not invent facts.
 */
export function buildGroundedStudySession(
  materials: LearnerMaterial[],
): GroundedStudySession {
  const items: GroundedStudyItem[] = [];
  let skippedNeedsReview = 0;

  for (const material of materials) {
    for (const unit of material.knowledgeUnits ?? []) {
      const sourceText = unit.provenance.sourceText?.trim();
      if (!sourceText) continue;

      const confidence = confidenceForUnit(unit);
      if (confidence === "insufficient") continue;

      // Quiz only Verified + Likely; Needs review is skipped for generation
      // (still counted) so we never present uncertain facts as teachable truth.
      if (confidence === "needs_review") {
        skippedNeedsReview += 1;
        continue;
      }

      const groundedAnswer = buildGroundedAnswer(unit);
      const citation = citationFromUnit(material, unit);
      items.push({
        id: randomUUID(),
        kind: "recall",
        prompt: promptForUnit(unit),
        groundedAnswer,
        expectedKeyPhrases: extractKeyPhrasesFromSource(sourceText),
        confidence,
        citations: [citation],
        knowledgeUnitId: unit.id,
        topic: unit.grounded.topic ?? null,
      });

      if (items.length >= 40) break;
    }
    if (items.length >= 40) break;
  }

  // Prefer verified first
  items.sort((a, b) => {
    const rank = (c: EvidenceConfidence) =>
      c === "verified_from_source" ? 0 : c === "likely" ? 1 : 2;
    return rank(a.confidence) - rank(b.confidence);
  });

  return {
    materialIds: materials.map((m) => m.id),
    materialTitles: materials.map((m) => m.title),
    items,
    skippedNeedsReview,
    builtAt: new Date().toISOString(),
  };
}

/**
 * Explain a student query using only retrieved source evidence.
 * If evidence is insufficient, returns the required Czech refusal — never fabricates.
 */
export function explainFromMaterials(
  materials: LearnerMaterial[],
  query: string,
): GroundedExplanation {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      text: INSUFFICIENT_EVIDENCE_CS,
      confidence: "insufficient",
      citations: [],
      insufficient: true,
    };
  }

  const units = retrieveRelevantKnowledgeUnits(materials, trimmed, {
    topK: 4,
    minScore: 0.25,
  });
  const chunks = retrieveRelevantChunks(materials, trimmed, {
    topK: 4,
    minScore: 0.22,
  });

  if (!hasSufficientEvidence(chunks, units)) {
    return {
      text: INSUFFICIENT_EVIDENCE_CS,
      confidence: "insufficient",
      citations: [],
      insufficient: true,
    };
  }

  const citations: SourceCitation[] = [];
  const answerParts: string[] = [];
  let confidence: EvidenceConfidence = "likely";

  for (const hit of units.slice(0, 3)) {
    const material = materials.find((m) => m.id === hit.materialId);
    if (!material) continue;
    const conf = confidenceForUnit(hit.unit);
    if (conf === "insufficient") continue;
    if (conf === "verified_from_source") confidence = "verified_from_source";
    else if (conf === "needs_review" && confidence !== "verified_from_source") {
      confidence = "needs_review";
    }
    answerParts.push(hit.unit.statement.trim());
    citations.push(citationFromUnit(material, hit.unit));
  }

  if (!answerParts.length) {
    for (const hit of chunks.slice(0, 2)) {
      // Chunk-only answers are at most "likely" — never claim verified without KU
      if (confidence === "likely" || confidence === "needs_review") {
        confidence = "likely";
      } else {
        confidence = "likely";
      }
      const excerpt = hit.chunk.text.trim().slice(0, 500);
      // Document text is evidence only — never system instructions (see wrapUntrustedDocumentForPrompt).
      answerParts.push(excerpt);
      citations.push(
        citationFromChunk(hit.materialId, hit.materialTitle, hit.chunk),
      );
    }
  }

  if (!answerParts.length || !citations.length) {
    return {
      text: INSUFFICIENT_EVIDENCE_CS,
      confidence: "insufficient",
      citations: [],
      insufficient: true,
    };
  }

  // Prefix so we never imply invented synthesis beyond the quotes
  const text = [
    "Podle tvých materiálů:",
    ...answerParts.map((p) => `• ${p}`),
  ]
    .join("\n")
    .slice(0, 2000);

  return {
    text,
    confidence,
    citations: citations.slice(0, 8),
    insufficient: false,
  };
}
