/**
 * Domain helpers / invariants for the content model (DB-independent).
 */

import type { KnowledgeUnit, Question } from "@/domain/content/schemas";

export function assertAtomicStatement(statement: string): void {
  const words = statement.trim().split(/\s+/).filter(Boolean);
  if (words.length > 80) {
    throw new Error(
      "KnowledgeUnit.statement je příliš dlouhý — rozděl na atomické KU (max ~80 slov).",
    );
  }
}

export function questionRequiresKnowledgeUnits(
  question: Pick<Question, "id" | "status">,
  linkedKuCount: number,
): void {
  if (question.status === "published" && linkedKuCount < 1) {
    throw new Error(
      `Question ${question.id} is published but has no KnowledgeUnit links.`,
    );
  }
}

export function kuSupportsAdaptiveLearning(
  ku: Pick<
    KnowledgeUnit,
    "importance" | "difficulty" | "examRelevance" | "confidence" | "tags"
  >,
): boolean {
  return (
    ku.importance >= 1 &&
    ku.importance <= 5 &&
    ku.difficulty >= 1 &&
    ku.difficulty <= 5 &&
    ku.confidence >= 0 &&
    ku.confidence <= 1 &&
    Array.isArray(ku.tags)
  );
}
