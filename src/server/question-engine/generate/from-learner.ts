import type { LearnerKnowledgeUnit } from "@/domain/learning/learner-knowledge";
import type { LearnerMaterial } from "@/domain/learning/learner-materials";
import { mapEvidenceConfidence } from "@/domain/learning/grounded-study";
import type { VerifiedKnowledgeUnitInput } from "@/domain/learning/question-generation";

/**
 * Map learner KUs → generator inputs grounded in source text.
 * Heuristic extracts are `source_grounded` — never claim Content QA VERIFIED.
 */
export function learnerUnitsToVerifiedInputs(
  material: LearnerMaterial,
): VerifiedKnowledgeUnitInput[] {
  const out: VerifiedKnowledgeUnitInput[] = [];
  for (const unit of material.knowledgeUnits ?? []) {
    const mapped = learnerUnitToVerifiedInput(unit, material);
    if (mapped) out.push(mapped);
  }
  return out;
}

export function learnerUnitToVerifiedInput(
  unit: LearnerKnowledgeUnit,
  material: Pick<LearnerMaterial, "id" | "title">,
): VerifiedKnowledgeUnitInput | null {
  const confidence = mapEvidenceConfidence({
    confidence: unit.confidence,
    flags: unit.flags,
    hasSourceText: Boolean(unit.provenance.sourceText?.trim()),
  });
  if (confidence === "insufficient" || confidence === "needs_review") {
    return null;
  }
  if (
    unit.flags.includes("conflicting") ||
    unit.flags.includes("ambiguous")
  ) {
    return null;
  }

  return {
    id: unit.id,
    title: unit.title,
    kind: unit.kind,
    statement: unit.statement,
    verification: "source_grounded",
    sourceEvidence: {
      quote: unit.provenance.sourceText,
      sourceLabel: material.title,
      pageStart: unit.provenance.pageStart,
      pageEnd: unit.provenance.pageEnd,
      chunkId: unit.provenance.chunkId,
      documentId: material.id,
    },
    author: unit.grounded.author,
    literaryWork: unit.grounded.literaryWork,
    literaryMovement: unit.grounded.literaryMovement,
    datePeriod: unit.grounded.datePeriod,
    definition: unit.grounded.definition,
    concept: unit.grounded.concept,
    examRelevance: unit.examRelevance,
  };
}
