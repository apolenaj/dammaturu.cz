import type { LearnerKnowledgeUnit } from "@/domain/learning/learner-knowledge";
import type { LearnerMaterial } from "@/domain/learning/learner-materials";
import {
  mapEvidenceConfidence,
} from "@/domain/learning/grounded-study";
import type { VerifiedKnowledgeUnitInput } from "@/domain/learning/question-generation";

/**
 * Map learner KUs → verified generator inputs.
 * Only units with evidence confidence `verified_from_source` qualify.
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
  if (confidence !== "verified_from_source") return null;
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
    verification: "verified_from_source",
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
