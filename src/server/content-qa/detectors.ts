import {
  extractPersonNameNearYears,
  extractYearPairs,
  normalizeForCompare,
  statementSimilarity,
} from "@/server/content-qa/normalize";
import type { QaFlag } from "@/server/content-qa/types";

export type QaCandidate = {
  id: string;
  knowledgeUnitId: string;
  title: string;
  statement: string;
  kind: string;
};

/**
 * Automatic anomaly detectors.
 * Flags only — never mutates facts.
 */
export function detectFlagsForItem(
  item: QaCandidate,
  corpus: QaCandidate[],
): QaFlag[] {
  const flags: QaFlag[] = [];
  const text = `${item.title} ${item.statement}`;

  // Death before birth / impossible chronology
  for (const pair of extractYearPairs(text)) {
    if (pair.death < pair.birth) {
      flags.push({
        code: "death_before_birth",
        reason: `Datum úmrtí (${pair.death}) je dříve než narození (${pair.birth}).`,
        evidence: pair.raw,
      });
      flags.push({
        code: "impossible_chronology",
        reason: "Nemožná chronologie v datech života.",
        evidence: pair.raw,
      });
    }
    if (pair.death - pair.birth > 120) {
      flags.push({
        code: "impossible_chronology",
        reason: `Podezřele dlouhý věk (${pair.death - pair.birth} let).`,
        evidence: pair.raw,
      });
    }
    if (pair.birth < 700 || pair.birth > 2100 || pair.death > 2100) {
      flags.push({
        code: "impossible_chronology",
        reason: "Rok mimo rozumný historický rozsah.",
        evidence: pair.raw,
      });
    }
  }

  // Unclear / fragmented formulation
  if (
    item.statement.length < 25 ||
    /…|\.{3}$/.test(item.statement) ||
    /^[a-zá-ž]/.test(item.statement.trim())
  ) {
    flags.push({
      code: "unclear_formulation",
      reason: "Nejasná nebo neúplná formulace — zkontroluj zdroj.",
    });
  }

  const selfName = extractPersonNameNearYears(text);

  for (const other of corpus) {
    if (other.id === item.id) continue;

    const sim = statementSimilarity(item.statement, other.statement);
    if (sim >= 0.92) {
      flags.push({
        code: "duplicate_statement",
        reason: "Velmi podobné / duplicitní tvrzení vůči jiné KU.",
        relatedItemId: other.knowledgeUnitId,
        evidence: other.statement.slice(0, 160),
      });
    }

    // Similar entity, different years
    const otherName = extractPersonNameNearYears(
      `${other.title} ${other.statement}`,
    );
    if (selfName && otherName) {
      const n1 = normalizeForCompare(selfName);
      const n2 = normalizeForCompare(otherName);
      if (n1 === n2 || (n1.includes(n2) && n2.length > 4) || (n2.includes(n1) && n1.length > 4)) {
        const a = extractYearPairs(text)[0];
        const b = extractYearPairs(`${other.title} ${other.statement}`)[0];
        if (a && b && (a.birth !== b.birth || a.death !== b.death)) {
          flags.push({
            code: "similar_entity_conflict",
            reason: `Stejná/podobná entita „${selfName}“ s rozdílnými daty.`,
            relatedItemId: other.knowledgeUnitId,
            evidence: `${a.raw} vs ${b.raw}`,
          });
          flags.push({
            code: "conflicting_data",
            reason: "Konfliktní biografická data napříč záznamy.",
            relatedItemId: other.knowledgeUnitId,
            evidence: `${a.raw} vs ${b.raw}`,
          });
        }
      }
    }

    // Same normalized core with different numeric years elsewhere
    if (sim >= 0.7 && sim < 0.92) {
      const yearsA = [...text.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/g)].map(
        (m) => m[1]!,
      );
      const yearsB = [
        ...`${other.title} ${other.statement}`.matchAll(
          /\b(1[0-9]{3}|20[0-9]{2})\b/g,
        ),
      ].map((m) => m[1]!);
      if (
        yearsA.length &&
        yearsB.length &&
        yearsA.join(",") !== yearsB.join(",") &&
        normalizeForCompare(item.title) === normalizeForCompare(other.title)
      ) {
        flags.push({
          code: "conflicting_data",
          reason: "Stejný titul, rozdílné letopočty.",
          relatedItemId: other.knowledgeUnitId,
          evidence: `${yearsA.join("/")} vs ${yearsB.join("/")}`,
        });
      }
    }
  }

  // Deduplicate flags by code+evidence
  const seen = new Set<string>();
  return flags.filter((f) => {
    const key = `${f.code}:${f.evidence ?? ""}:${f.relatedItemId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
