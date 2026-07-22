import type {
  StudyContentChunk,
  StudyContentEntry,
  StudyContentUnit,
} from "@/domain/study-content/registry";

export type CatalogQuickTestItem = {
  id: string;
  prompt: string;
  /** Exact statement from source — the correct answer when true. */
  statement: string;
  correctIsTrue: boolean;
  unitId: string;
  sourceChunkId: string | null;
  sourceExcerpt: string | null;
  headingPath: string | null;
};

/**
 * Build true/false items only from extracted KU statements + chunk text.
 * Never invents facts — distractors flip by pairing with a different unit's statement
 * presented as "belongs to this topic" is NOT used; we only ask T/F on verbatim claims.
 */
export function buildQuickTestFromEntry(
  entry: StudyContentEntry,
  limit = 8,
): CatalogQuickTestItem[] {
  const units = entry.knowledgeUnits.filter(
    (u) => u.statement.trim().length >= 12,
  );
  if (units.length === 0) return [];

  const chunkById = new Map(entry.chunks.map((c) => [c.id, c]));
  const items: CatalogQuickTestItem[] = [];

  for (let i = 0; i < units.length && items.length < limit; i++) {
    const unit = units[i]!;
    const chunk = resolveChunk(unit, chunkById);
    // Alternate true / false: for "false", swap statement with another unit's
    // but ask "Je toto tvrzení z materiálu o …?" — safer: always ask if statement
    // appears in the excerpt (true), or present a statement from another unit
    // while showing excerpt from this unit (false).
    const makeFalse = i % 2 === 1 && units.length > 1;
    let statement = unit.statement;
    let correctIsTrue = true;
    let unitId = unit.id;

    if (makeFalse) {
      const other = units[(i + 1) % units.length]!;
      if (other.id !== unit.id) {
        statement = other.statement;
        correctIsTrue = false;
        // Still attribute to the displayed excerpt's unit for provenance display
        unitId = unit.id;
      }
    }

    items.push({
      id: `qt-${entry.sourceId}-${i}`,
      prompt: correctIsTrue
        ? "Je toto tvrzení přímo podložené textem materiálu?"
        : "Patří toto tvrzení k zobrazenému úryvku ze zdroje?",
      statement,
      correctIsTrue,
      unitId,
      sourceChunkId: chunk?.id ?? null,
      sourceExcerpt: chunk
        ? chunk.text.slice(0, 600)
        : null,
      headingPath: chunk?.headingPath ?? null,
    });
  }

  return items;
}

function resolveChunk(
  unit: StudyContentUnit,
  chunkById: Map<string, StudyContentChunk>,
): StudyContentChunk | null {
  for (const id of unit.sourceChunkIds) {
    const c = chunkById.get(id);
    if (c) return c;
  }
  return null;
}

export type CatalogLearnStep = {
  kind: "read" | "recall";
  chunk?: StudyContentChunk;
  unit?: StudyContentUnit;
  sourceExcerpt?: string | null;
};

/** Ordered learn path: read chunk → recall units from that chunk. */
export function buildLearnSteps(entry: StudyContentEntry): CatalogLearnStep[] {
  const steps: CatalogLearnStep[] = [];
  const unitsByChunk = new Map<string, StudyContentUnit[]>();
  for (const u of entry.knowledgeUnits) {
    const cid = u.sourceChunkIds[0];
    if (!cid) continue;
    const list = unitsByChunk.get(cid) ?? [];
    list.push(u);
    unitsByChunk.set(cid, list);
  }

  for (const chunk of entry.chunks
    .slice()
    .sort((a, b) => a.chunkIndex - b.chunkIndex)) {
    steps.push({ kind: "read", chunk });
    for (const unit of unitsByChunk.get(chunk.id) ?? []) {
      steps.push({
        kind: "recall",
        unit,
        sourceExcerpt: chunk.text.slice(0, 500),
      });
    }
  }
  return steps;
}
