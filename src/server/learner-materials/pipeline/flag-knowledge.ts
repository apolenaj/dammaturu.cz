import {
  extractPersonNameNearYears,
  extractYearPairs,
  normalizeForCompare,
  statementSimilarity,
} from "@/server/content-qa/normalize";
import type {
  KnowledgeExtractionSummary,
  LearnerKnowledgeUnit,
  LearnerKuFlag,
} from "@/domain/learning/learner-knowledge";

/**
 * Flag ambiguous / conflicting units. Never “resolves” by inventing certainty —
 * only lowers confidence and attaches review flags.
 */
export function flagAmbiguousKnowledgeUnits(
  units: LearnerKnowledgeUnit[],
): LearnerKnowledgeUnit[] {
  return units.map((unit) => {
    const flags = new Set<LearnerKuFlag>(unit.flags);
    const notes = [...unit.flagNotes];
    let confidence = unit.confidence;

    const text = `${unit.title} ${unit.statement}`;

    for (const pair of extractYearPairs(text)) {
      if (pair.death < pair.birth) {
        flags.add("conflicting");
        flags.add("needs_human_review");
        notes.push(
          `Datum úmrtí (${pair.death}) je dříve než narození (${pair.birth}).`,
        );
        confidence = Math.min(confidence, 0.25);
      }
      if (pair.death - pair.birth > 120) {
        flags.add("ambiguous");
        flags.add("needs_human_review");
        notes.push(`Podezřele dlouhý věk (${pair.death - pair.birth} let).`);
        confidence = Math.min(confidence, 0.3);
      }
    }

    if (
      unit.statement.length < 25 ||
      /…|\.{3}$/.test(unit.statement) ||
      /^[a-zá-ž]/.test(unit.statement.trim())
    ) {
      flags.add("unclear_formulation");
      flags.add("needs_human_review");
      notes.push("Nejasná nebo neúplná formulace — ověř zdroj.");
      confidence = Math.min(confidence, 0.35);
    }

    // Cross-unit conflicts / duplicates
    const selfName = extractPersonNameNearYears(text);
    for (const other of units) {
      if (other.id === unit.id) continue;

      const sim = statementSimilarity(unit.statement, other.statement);
      if (sim >= 0.92) {
        flags.add("duplicate_candidate");
        notes.push("Velmi podobné tvrzení vůči jiné jednotce ze stejného dokumentu.");
        confidence = Math.min(confidence, 0.4);
      }

      const otherName = extractPersonNameNearYears(
        `${other.title} ${other.statement}`,
      );
      if (selfName && otherName) {
        const n1 = normalizeForCompare(selfName);
        const n2 = normalizeForCompare(otherName);
        const same =
          n1 === n2 ||
          (n1.includes(n2) && n2.length > 4) ||
          (n2.includes(n1) && n1.length > 4);
        if (same) {
          const a = extractYearPairs(text)[0];
          const b = extractYearPairs(`${other.title} ${other.statement}`)[0];
          if (a && b && (a.birth !== b.birth || a.death !== b.death)) {
            flags.add("conflicting");
            flags.add("ambiguous");
            flags.add("needs_human_review");
            notes.push(
              `Konfliktní data pro „${selfName}“: ${a.raw} vs ${b.raw}.`,
            );
            confidence = Math.min(confidence, 0.2);
          }
        }
      }
    }

    if (confidence < 0.45) {
      flags.add("low_confidence");
    }

    // Never invent certainty: conflicting/ambiguous stay needs_review
    return {
      ...unit,
      flags: [...flags],
      flagNotes: [...new Set(notes)].slice(0, 12),
      confidence,
      provenance: {
        ...unit.provenance,
        confidence,
      },
      reviewStatus: "needs_review" as const,
    };
  });
}

export function summarizeKnowledgeExtraction(
  units: LearnerKnowledgeUnit[],
): KnowledgeExtractionSummary {
  const byKind: Record<string, number> = {};
  let flaggedCount = 0;
  let ambiguousOrConflicting = 0;

  for (const u of units) {
    byKind[u.kind] = (byKind[u.kind] ?? 0) + 1;
    if (u.flags.length > 0) flaggedCount += 1;
    if (
      u.flags.includes("ambiguous") ||
      u.flags.includes("conflicting")
    ) {
      ambiguousOrConflicting += 1;
    }
  }

  return {
    knowledgeUnitCount: units.length,
    flaggedCount,
    byKind,
    ambiguousOrConflicting,
  };
}
