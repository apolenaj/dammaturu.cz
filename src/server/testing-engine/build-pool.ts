import type { StudyContentEntry } from "@/domain/study-content/registry";
import type { LearnerMaterial } from "@/domain/learning/learner-materials";
import type { ErrorMemoryBook } from "@/domain/learning/error-memory";
import { mapEvidenceConfidence } from "@/domain/learning/grounded-study";
import type { TestingAtom } from "@/domain/learning/testing-engine";
import type { ReadinessBook } from "@/domain/learning/readiness";

function masteryForUnit(
  book: ReadinessBook | null,
  unitId: string,
): number | null {
  if (!book) return null;
  const u = book.units.find((x) => x.id === unitId);
  return u?.state.score ?? null;
}

function mistakeWeight(
  book: ErrorMemoryBook | null,
  unitId: string,
  title: string,
): number {
  if (!book) return 0;
  let w = 0;
  for (const m of book.memories) {
    if (m.status === "mastered") continue;
    const hit =
      m.knowledgeUnit.id === unitId ||
      m.knowledgeUnit.slug === unitId ||
      m.knowledgeUnit.title === title;
    if (hit) w += m.occurrenceCount;
  }
  return w;
}

export function atomsFromCatalogEntry(
  entry: StudyContentEntry,
  opts?: {
    errorBook?: ErrorMemoryBook | null;
    readinessBook?: ReadinessBook | null;
  },
): TestingAtom[] {
  if (!entry.parseComplete) return [];
  const chunkById = new Map(entry.chunks.map((c) => [c.id, c]));
  const atoms: TestingAtom[] = [];

  for (const unit of entry.knowledgeUnits) {
    if (!unit.statement?.trim() || unit.statement.trim().length < 12) continue;
    const chunk =
      unit.sourceChunkIds
        .map((id) => chunkById.get(id))
        .find(Boolean) ?? entry.chunks[0];
    if (!chunk?.text?.trim() || chunk.text.trim().length < 40) continue;

    atoms.push({
      knowledgeUnitId: unit.id,
      sourceId: entry.sourceId,
      sourceTitle: entry.title,
      topic: entry.topic,
      title: unit.title || unit.statement.slice(0, 80),
      statement: unit.statement,
      sourceExcerpt: chunk.text,
      headingPath: chunk.headingPath,
      charStart: chunk.charStart,
      charEnd: chunk.charEnd,
      origin: "catalog",
      masteryScore: masteryForUnit(opts?.readinessBook ?? null, unit.id),
      mistakeWeight: mistakeWeight(
        opts?.errorBook ?? null,
        unit.id,
        unit.title,
      ),
      difficultyHint: unit.confidence >= 0.8 ? 2 : 3,
    });
  }

  // Fallback from chunks when no KUs — first substantive line as statement.
  if (atoms.length === 0) {
    for (const chunk of entry.chunks) {
      const lines = chunk.text
        .split(/\n+/)
        .map((l) => l.trim())
        .filter((l) => l.length > 25);
      const statement = lines[0];
      if (!statement || chunk.text.length < 40) continue;
      atoms.push({
        knowledgeUnitId: `chunk-${chunk.id}`,
        sourceId: entry.sourceId,
        sourceTitle: entry.title,
        topic: entry.topic,
        title: chunk.headingPath || `Úsek ${chunk.chunkIndex + 1}`,
        statement,
        sourceExcerpt: chunk.text,
        headingPath: chunk.headingPath,
        charStart: chunk.charStart,
        charEnd: chunk.charEnd,
        origin: "catalog",
        masteryScore: null,
        mistakeWeight: 0,
        difficultyHint: 3,
      });
    }
  }

  return atoms;
}

export function atomsFromLearnerMaterial(
  material: LearnerMaterial,
  opts?: {
    errorBook?: ErrorMemoryBook | null;
    readinessBook?: ReadinessBook | null;
  },
): TestingAtom[] {
  const atoms: TestingAtom[] = [];
  for (const unit of material.knowledgeUnits ?? []) {
    const confidence = mapEvidenceConfidence({
      confidence: unit.confidence,
      flags: unit.flags,
      hasSourceText: Boolean(unit.provenance.sourceText?.trim()),
    });
    if (confidence !== "verified_from_source") continue;
    if (
      unit.flags.includes("conflicting") ||
      unit.flags.includes("ambiguous")
    ) {
      continue;
    }
    const excerpt = unit.provenance.sourceText?.trim() ?? "";
    if (excerpt.length < 40 || unit.statement.trim().length < 12) continue;

    atoms.push({
      knowledgeUnitId: unit.id,
      sourceId: material.id,
      sourceTitle: material.title,
      topic: unit.grounded.topic || material.title,
      title: unit.title,
      statement: unit.statement,
      sourceExcerpt: excerpt,
      headingPath: unit.provenance.headingPath,
      charStart: null,
      charEnd: null,
      origin: "learner_material",
      masteryScore: masteryForUnit(opts?.readinessBook ?? null, unit.id),
      mistakeWeight: mistakeWeight(
        opts?.errorBook ?? null,
        unit.id,
        unit.title,
      ),
      difficultyHint: unit.difficulty ?? 3,
    });
  }
  return atoms;
}

export function buildTestingPool(input: {
  catalog: StudyContentEntry[];
  materials: LearnerMaterial[];
  errorBook?: ErrorMemoryBook | null;
  readinessBook?: ReadinessBook | null;
}): TestingAtom[] {
  const opts = {
    errorBook: input.errorBook ?? null,
    readinessBook: input.readinessBook ?? null,
  };
  const atoms: TestingAtom[] = [];
  for (const entry of input.catalog) {
    atoms.push(...atomsFromCatalogEntry(entry, opts));
  }
  for (const material of input.materials) {
    atoms.push(...atomsFromLearnerMaterial(material, opts));
  }
  // Dedupe by knowledgeUnitId
  const seen = new Set<string>();
  return atoms.filter((a) => {
    if (seen.has(a.knowledgeUnitId)) return false;
    seen.add(a.knowledgeUnitId);
    return true;
  });
}
