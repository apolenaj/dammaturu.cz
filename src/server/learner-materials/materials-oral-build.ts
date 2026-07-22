import { randomUUID } from "node:crypto";
import type { LearnerKnowledgeUnit } from "@/domain/learning/learner-knowledge";
import type { LearnerMaterial } from "@/domain/learning/learner-materials";
import {
  extractKeyPhrasesFromSource,
  mapEvidenceConfidence,
  type EvidenceConfidence,
  type SourceCitation,
} from "@/domain/learning/grounded-study";
import {
  MATERIALS_ORAL_DISCLAIMER_CS,
  materialsOralConfig,
  type MaterialsOralMode,
  type MaterialsOralPrompt,
  type MaterialsOralSession,
} from "@/domain/learning/materials-oral-training";

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

function confidenceForUnit(unit: LearnerKnowledgeUnit): EvidenceConfidence {
  return mapEvidenceConfidence({
    confidence: unit.confidence,
    flags: unit.flags,
    hasSourceText: Boolean(unit.provenance.sourceText?.trim()),
  });
}

function buildOutline(unit: LearnerKnowledgeUnit): string {
  const bullets: string[] = [];
  bullets.push(unit.statement.trim());
  if (unit.grounded.definition?.trim()) {
    bullets.push(unit.grounded.definition.trim());
  }
  if (unit.grounded.importantFact?.trim()) {
    bullets.push(unit.grounded.importantFact.trim());
  }
  return bullets
    .filter(Boolean)
    .map((b) => `• ${b}`)
    .join("\n")
    .slice(0, 2000);
}

function questionForUnit(unit: LearnerKnowledgeUnit): string {
  if (unit.kind === "person" && unit.grounded.author) {
    return `Řekni ústně, co tvůj materiál uvádí o autorovi ${unit.grounded.author}.`;
  }
  if (unit.kind === "work" && unit.grounded.literaryWork) {
    return `Řekni ústně, co tvůj materiál uvádí o díle ${unit.grounded.literaryWork}.`;
  }
  if (unit.grounded.literaryMovement) {
    return `Ústně vysvětli směr ${unit.grounded.literaryMovement} podle tvého materiálu.`;
  }
  if (unit.grounded.concept) {
    return `Ústně vysvětli pojem „${unit.grounded.concept}“ podle materiálu.`;
  }
  return `Ústně odpověz: co říká tvůj materiál o „${unit.title}“?`;
}

function topicForUnit(unit: LearnerKnowledgeUnit): string {
  return (
    unit.grounded.topic?.trim() ||
    unit.grounded.subtopic?.trim() ||
    unit.grounded.literaryWork?.trim() ||
    unit.grounded.concept?.trim() ||
    unit.title
  ).slice(0, 200);
}

function keyPointsFromUnit(unit: LearnerKnowledgeUnit): Array<{
  id: string;
  label: string;
  required: boolean;
}> {
  const phrases = extractKeyPhrasesFromSource(
    [
      unit.statement,
      unit.grounded.definition ?? "",
      unit.grounded.importantFact ?? "",
      unit.provenance.sourceText,
    ].join(" "),
    materialsOralConfig.maxKeyPoints,
  );
  const labels =
    phrases.length > 0
      ? phrases
      : unit.statement
          .split(/[,;.]/)
          .map((s) => s.trim())
          .filter((s) => s.length >= 4)
          .slice(0, 6);
  return labels.slice(0, materialsOralConfig.maxKeyPoints).map((label, i) => ({
    id: `kp-${unit.id.slice(0, 8)}-${i}`,
    label: label.slice(0, 200),
    required: true,
  }));
}

type EligibleUnit = {
  material: LearnerMaterial;
  unit: LearnerKnowledgeUnit;
  confidence: EvidenceConfidence;
};

function listEligibleUnits(materials: LearnerMaterial[]): EligibleUnit[] {
  const out: EligibleUnit[] = [];
  for (const material of materials) {
    for (const unit of material.knowledgeUnits ?? []) {
      const sourceText = unit.provenance.sourceText?.trim();
      if (!sourceText) continue;
      const confidence = confidenceForUnit(unit);
      if (confidence === "insufficient") continue;
      if (confidence === "needs_review") continue;
      out.push({ material, unit, confidence });
    }
  }
  out.sort((a, b) => {
    const rank = (c: EvidenceConfidence) =>
      c === "verified_from_source" ? 0 : c === "likely" ? 1 : 2;
    return rank(a.confidence) - rank(b.confidence);
  });
  return out;
}

function toPrompt(
  mode: MaterialsOralMode,
  row: EligibleUnit,
  hideHints: boolean,
): MaterialsOralPrompt | null {
  const keyPoints = keyPointsFromUnit(row.unit);
  if (keyPoints.length < materialsOralConfig.minKeyPointsForGrade) {
    // Still allow with 1 point but mark via confidence needs_review path later
    if (keyPoints.length === 0) return null;
  }
  const citation = citationFromUnit(row.material, row.unit);
  return {
    id: randomUUID(),
    mode,
    topicCs: topicForUnit(row.unit),
    questionCs: questionForUnit(row.unit),
    idealOutlineCs: buildOutline(row.unit),
    keyPoints,
    citations: [citation],
    confidence: row.confidence,
    knowledgeUnitIds: [row.unit.id],
    materialId: row.material.id,
    materialTitle: row.material.title,
    sourceHref: `/app/materials/${row.material.id}/study`,
    prepSeconds: materialsOralConfig.prepSecondsByMode[mode],
    hideHints,
  };
}

function groupByTopic(rows: EligibleUnit[]): Map<string, EligibleUnit[]> {
  const map = new Map<string, EligibleUnit[]>();
  for (const row of rows) {
    const topic = topicForUnit(row.unit);
    const list = map.get(topic) ?? [];
    list.push(row);
    map.set(topic, list);
  }
  return map;
}

function mergeTopicPrompt(
  mode: MaterialsOralMode,
  topic: string,
  rows: EligibleUnit[],
  hideHints: boolean,
): MaterialsOralPrompt | null {
  const usable = rows.slice(0, 4);
  if (usable.length === 0) return null;
  const primary = usable[0]!;
  const keyPoints = usable
    .flatMap((r) => keyPointsFromUnit(r.unit))
    .slice(0, materialsOralConfig.maxKeyPoints);
  if (keyPoints.length === 0) return null;

  const outline = usable
    .map((r) => buildOutline(r.unit))
    .join("\n")
    .slice(0, 2000);
  const citations = usable.map((r) => citationFromUnit(r.material, r.unit));
  const confidence = usable.every((r) => r.confidence === "verified_from_source")
    ? ("verified_from_source" as const)
    : ("likely" as const);

  return {
    id: randomUUID(),
    mode,
    topicCs: topic,
    questionCs: `Ústně představ téma „${topic}“ podle tvého materiálu — klíčové body, bez vymyšlených faktů.`,
    idealOutlineCs: outline,
    keyPoints,
    citations: citations.slice(0, 8),
    confidence,
    knowledgeUnitIds: usable.map((r) => r.unit.id),
    materialId: primary.material.id,
    materialTitle: primary.material.title,
    sourceHref: `/app/materials/${primary.material.id}/study`,
    prepSeconds: materialsOralConfig.prepSecondsByMode[mode],
    hideHints,
  };
}

export function collectOralTopics(materials: LearnerMaterial[]): string[] {
  const topics = new Set<string>();
  for (const row of listEligibleUnits(materials)) {
    topics.add(topicForUnit(row.unit));
  }
  return [...topics].sort((a, b) => a.localeCompare(b, "cs"));
}

/**
 * Build oral training session from ready materials only.
 * Never invents content outside source KUs.
 */
export function buildMaterialsOralSession(input: {
  mode: MaterialsOralMode;
  materials: LearnerMaterial[];
  topicCs?: string | null;
  weakKnowledgeUnitIds?: string[];
  hideHints?: boolean;
}): MaterialsOralSession | { error: string } {
  const hideHints = input.hideHints !== false;
  const eligible = listEligibleUnits(input.materials);
  if (eligible.length === 0) {
    return {
      error:
        "V vybraných materiálech zatím nemám dost ověřených znalostních bodů pro ústní trénink.",
    };
  }

  const prompts: MaterialsOralPrompt[] = [];
  const byTopic = groupByTopic(eligible);

  if (input.mode === "full_topic" || input.mode === "random_topic") {
    const topics = [...byTopic.keys()];
    let topic = input.topicCs?.trim() || null;
    if (input.mode === "random_topic" || !topic) {
      topic = topics[Math.floor(Math.random() * topics.length)] ?? null;
    }
    if (!topic || !byTopic.has(topic)) {
      return { error: "Téma v materiálech nenalezeno." };
    }
    const prompt = mergeTopicPrompt(
      input.mode,
      topic,
      byTopic.get(topic)!,
      hideHints,
    );
    if (!prompt) {
      return { error: "Pro toto téma chybí klíčové body ze zdroje." };
    }
    prompts.push(prompt);
  } else if (input.mode === "weak_spots") {
    const weakIds = new Set(input.weakKnowledgeUnitIds ?? []);
    const weakRows = eligible.filter((r) => weakIds.has(r.unit.id));
    const pool = weakRows.length > 0 ? weakRows : eligible.slice(0, 8);
    for (const row of pool.slice(0, 3)) {
      const p = toPrompt(input.mode, row, hideHints);
      if (p) prompts.push(p);
    }
  } else if (input.mode === "quick_review") {
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    for (const row of shuffled.slice(0, 2)) {
      const p = toPrompt(input.mode, row, hideHints);
      if (p) prompts.push(p);
    }
  } else {
    // question_drill — single question
    const row =
      eligible[Math.floor(Math.random() * eligible.length)] ?? eligible[0]!;
    const p = toPrompt(input.mode, row, hideHints);
    if (p) prompts.push(p);
  }

  if (prompts.length === 0) {
    return {
      error:
        "Nepodařilo se sestavit ústní otázku jen ze zdroje. Zkus jiný materiál nebo téma.",
    };
  }

  return {
    id: randomUUID(),
    mode: input.mode,
    materialIds: input.materials.map((m) => m.id),
    materialTitles: input.materials.map((m) => m.title),
    prompts: prompts.slice(0, materialsOralConfig.maxPromptsPerSession),
    cursor: 0,
    builtAt: new Date().toISOString(),
    disclaimerCs: MATERIALS_ORAL_DISCLAIMER_CS,
  };
}
