import { randomUUID } from "node:crypto";
import type { LearnerKnowledgeUnit } from "@/domain/learning/learner-knowledge";
import type { LearnerMaterial } from "@/domain/learning/learner-materials";
import {
  extractKeyPhrasesFromSource,
  mapEvidenceConfidence,
  type SourceCitation,
} from "@/domain/learning/grounded-study";
import {
  materialsSessionSchema,
  type MaterialsSession,
  type MaterialsSessionItem,
  type MaterialsSessionItemKind,
  type MaterialsSessionMode,
} from "@/domain/learning/materials-study-session";

const KIND_CYCLE: MaterialsSessionItemKind[] = [
  "recall",
  "short_answer",
  "flashcard",
  "explanation",
  "retrieval",
];

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

function idealFromUnit(unit: LearnerKnowledgeUnit): string {
  const parts: string[] = [unit.statement.trim()];
  if (
    unit.grounded.definition &&
    !parts[0]!.includes(unit.grounded.definition.slice(0, 40))
  ) {
    parts.push(unit.grounded.definition.trim());
  }
  return parts.join(" ").slice(0, 2000);
}

function keyIdeasFromUnit(unit: LearnerKnowledgeUnit): MaterialsSessionItem["keyIdeas"] {
  const phrases = extractKeyPhrasesFromSource(unit.provenance.sourceText);
  const extras = [
    unit.grounded.author,
    unit.grounded.literaryWork,
    unit.grounded.literaryMovement,
    unit.grounded.concept,
    unit.grounded.datePeriod,
  ].filter((x): x is string => Boolean(x?.trim()));

  const seen = new Set<string>();
  const ideas: MaterialsSessionItem["keyIdeas"] = [];
  for (const label of [...extras, ...phrases]) {
    const key = label.toLowerCase();
    if (seen.has(key) || label.length < 2) continue;
    seen.add(key);
    ideas.push({
      id: `k-${ideas.length}`,
      label: label.slice(0, 200),
      synonyms: [],
      required: true,
    });
    if (ideas.length >= 10) break;
  }
  if (ideas.length === 0) {
    ideas.push({
      id: "k-0",
      label: unit.title.slice(0, 200),
      synonyms: [],
      required: true,
    });
  }
  return ideas;
}

function isEligibleUnit(unit: LearnerKnowledgeUnit): boolean {
  const sourceText = unit.provenance.sourceText?.trim();
  if (!sourceText) return false;
  const confidence = mapEvidenceConfidence({
    confidence: unit.confidence,
    flags: unit.flags,
    hasSourceText: true,
  });
  return confidence === "verified_from_source" || confidence === "likely";
}

function unitTopic(unit: LearnerKnowledgeUnit): string | null {
  return (
    unit.grounded.topic ??
    unit.grounded.literaryMovement ??
    unit.provenance.headingPath ??
    unit.provenance.sectionPath?.[0] ??
    null
  );
}

function matchesTopic(unit: LearnerKnowledgeUnit, topic: string): boolean {
  const needle = topic.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    unit.grounded.topic,
    unit.grounded.literaryMovement,
    unit.grounded.subtopic,
    unit.provenance.headingPath,
    ...(unit.provenance.sectionPath ?? []),
    unit.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export function collectMaterialTopics(materials: LearnerMaterial[]): string[] {
  const set = new Set<string>();
  for (const material of materials) {
    for (const t of material.topics ?? []) {
      if (t.title.trim()) set.add(t.title.trim());
    }
    for (const unit of material.knowledgeUnits ?? []) {
      const topic = unitTopic(unit);
      if (topic?.trim()) set.add(topic.trim());
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "cs"));
}

function promptForKind(
  kind: MaterialsSessionItemKind,
  unit: LearnerKnowledgeUnit,
): string {
  const label =
    unit.grounded.concept ??
    unit.grounded.literaryWork ??
    unit.grounded.author ??
    unit.title;

  switch (kind) {
    case "recall":
      if (unit.kind === "person" && unit.grounded.author) {
        return `Co říká tvůj materiál o autorovi ${unit.grounded.author}?`;
      }
      if (unit.kind === "work" && unit.grounded.literaryWork) {
        return `Co říká tvůj materiál o díle ${unit.grounded.literaryWork}?`;
      }
      return `Co říká tvůj materiál o: ${unit.title}?`;
    case "short_answer":
      return `Krátce (1–2 věty): co je podstatné u „${label}“?`;
    case "flashcard":
      return `Kartu: vybav si odpověď k „${label}“.`;
    case "explanation":
      return `Vysvětli vlastními slovy (podle materiálu): ${unit.title}.`;
    case "retrieval":
      return `Bez nahlížení — vybav si z paměti: ${unit.title}?`;
    default:
      return `Co víš o: ${unit.title}?`;
  }
}

function flashcardFront(unit: LearnerKnowledgeUnit): string {
  if (unit.grounded.author && unit.grounded.literaryWork) {
    return `${unit.grounded.author} → dílo?`;
  }
  if (unit.grounded.concept) {
    return `Definuj: ${unit.grounded.concept}`;
  }
  return unit.title;
}

type UnitHit = {
  material: LearnerMaterial;
  unit: LearnerKnowledgeUnit;
};

function listEligibleHits(
  materials: LearnerMaterial[],
  mode: MaterialsSessionMode,
  topic: string | null,
): UnitHit[] {
  const hits: UnitHit[] = [];
  for (const material of materials) {
    for (const unit of material.knowledgeUnits ?? []) {
      if (!isEligibleUnit(unit)) continue;
      if (mode === "topic" && topic && !matchesTopic(unit, topic)) continue;
      hits.push({ material, unit });
    }
  }
  return hits;
}

function buildItem(
  hit: UnitHit,
  kind: MaterialsSessionItemKind,
): MaterialsSessionItem {
  const { material, unit } = hit;
  const ideal = idealFromUnit(unit);
  return {
    id: randomUUID(),
    kind,
    prompt: promptForKind(kind, unit),
    idealAnswer: ideal,
    keyIdeas: keyIdeasFromUnit(unit),
    citations: [citationFromUnit(material, unit)],
    knowledgeUnitIds: [unit.id],
    topic: unitTopic(unit),
    flashcardFront:
      kind === "flashcard" ? flashcardFront(unit).slice(0, 400) : undefined,
    flashcardBack: kind === "flashcard" ? ideal.slice(0, 800) : undefined,
    materialId: material.id,
    materialTitle: material.title,
  };
}

/**
 * Build a mixed Czech study session from ready learner materials.
 * Never invents facts — only verified/likely grounded KUs.
 */
export function buildMaterialsStudySession(params: {
  learnerId: string;
  materials: LearnerMaterial[];
  mode: MaterialsSessionMode;
  topic?: string | null;
  masteryBefore?: Record<string, number>;
  maxItems?: number;
}): MaterialsSession {
  const topic = params.topic?.trim() || null;
  if (params.mode === "topic" && !topic) {
    throw new Error("Pro režim téma vyber konkrétní téma.");
  }

  const hits = listEligibleHits(params.materials, params.mode, topic);
  const mastery = params.masteryBefore ?? {};
  hits.sort((a, b) => {
    const sa = mastery[a.unit.id] ?? 0;
    const sb = mastery[b.unit.id] ?? 0;
    if (sa !== sb) return sa - sb;
    return a.unit.title.localeCompare(b.unit.title, "cs");
  });

  const maxItems = Math.min(Math.max(params.maxItems ?? 12, 1), 40);
  const items: MaterialsSessionItem[] = [];
  const usedKu = new Set<string>();

  // Prefer one item per KU; cycle kinds for variety (smart mix + topic).
  for (let i = 0; i < hits.length && items.length < maxItems; i++) {
    const hit = hits[i]!;
    if (usedKu.has(hit.unit.id)) continue;
    usedKu.add(hit.unit.id);
    const kind = KIND_CYCLE[items.length % KIND_CYCLE.length]!;
    items.push(buildItem(hit, kind));
  }

  // If few KUs, add second pass with different kinds for more practice.
  if (items.length < Math.min(5, maxItems) && hits.length > 0) {
    for (let i = 0; i < hits.length && items.length < maxItems; i++) {
      const hit = hits[i]!;
      const kind = KIND_CYCLE[(items.length + 2) % KIND_CYCLE.length]!;
      items.push(buildItem(hit, kind));
    }
  }

  if (items.length === 0) {
    throw new Error(
      params.mode === "topic"
        ? "Pro zvolené téma zatím nemám dost ověřených bodů. Zkus jiné téma nebo chytrý mix."
        : "V materiálech zatím nemám dost ověřených znalostních bodů pro sesit.",
    );
  }

  return materialsSessionSchema.parse({
    id: randomUUID(),
    learnerId: params.learnerId,
    mode: params.mode,
    topic: params.mode === "topic" ? topic : null,
    materialIds: params.materials.map((m) => m.id),
    materialTitles: params.materials.map((m) => m.title),
    availableTopics: collectMaterialTopics(params.materials),
    items,
    masteryBefore: mastery,
    createdAt: new Date().toISOString(),
  });
}
