import type { StudyContentEntry } from "@/domain/study-content/registry";
import {
  buildLearningSession,
  type LearningAtom,
  type LearningSession,
} from "@/domain/learning/learning-session-engine";

export function atomsFromCatalogEntry(
  entry: StudyContentEntry,
): LearningAtom[] {
  const chunkById = new Map(entry.chunks.map((c) => [c.id, c]));
  const atoms: LearningAtom[] = [];

  for (const unit of entry.knowledgeUnits) {
    const chunk =
      unit.sourceChunkIds
        .map((id) => chunkById.get(id))
        .find(Boolean) ?? entry.chunks[0];
    if (!chunk?.text?.trim()) continue;
    if (!unit.statement?.trim()) continue;

    atoms.push({
      id: unit.id,
      title: unit.title || unit.statement.slice(0, 80),
      statement: unit.statement,
      kind: unit.kind,
      topic: entry.topic,
      subtopic: entry.subtopic,
      sourceId: entry.sourceId,
      sourceTitle: entry.title,
      sourceChunkId: chunk.id,
      sourceText: chunk.text,
      headingPath: chunk.headingPath,
      charStart: chunk.charStart,
      charEnd: chunk.charEnd,
      tags: [entry.subjectSlug, entry.topic, unit.topicSlug].filter(Boolean),
    });
  }

  // Fallback: if ingest has chunks but no KUs, create atoms from chunk headings.
  if (atoms.length === 0) {
    for (const chunk of entry.chunks) {
      const lines = chunk.text
        .split(/\n+/)
        .map((l) => l.trim())
        .filter((l) => l.length > 25);
      const statement = lines[0] ?? chunk.text.slice(0, 200);
      atoms.push({
        id: `chunk-atom-${chunk.id}`,
        title: chunk.headingPath || `Úsek ${chunk.chunkIndex + 1}`,
        statement,
        kind: "concept",
        topic: entry.topic,
        subtopic: entry.subtopic,
        sourceId: entry.sourceId,
        sourceTitle: entry.title,
        sourceChunkId: chunk.id,
        sourceText: chunk.text,
        headingPath: chunk.headingPath,
        charStart: chunk.charStart,
        charEnd: chunk.charEnd,
        tags: [entry.subjectSlug, entry.topic],
      });
    }
  }

  return atoms;
}

export function buildCatalogLearningSession(input: {
  learnerId: string;
  entry: StudyContentEntry;
  /** Prefer continuing from a specific unit when present. */
  preferUnitId?: string | null;
  maxAtoms?: number;
}): LearningSession | null {
  let atoms = atomsFromCatalogEntry(input.entry);
  if (atoms.length === 0) return null;

  if (input.preferUnitId) {
    const idx = atoms.findIndex((a) => a.id === input.preferUnitId);
    if (idx > 0) {
      const [picked] = atoms.splice(idx, 1);
      atoms = [picked!, ...atoms];
    }
  }

  return buildLearningSession({
    learnerId: input.learnerId,
    subject: input.entry.subject,
    title: input.entry.title,
    atoms,
    maxAtoms: input.maxAtoms ?? 3,
  });
}
