import { describe, expect, it } from "vitest";
import {
  assertAtomicStatement,
  knowledgeUnitSchema,
  kuSupportsAdaptiveLearning,
  questionRequiresKnowledgeUnits,
  questionSchema,
} from "@/domain/content";

describe("content model schemas", () => {
  it("accepts a valid atomic knowledge unit", () => {
    const ku = knowledgeUnitSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      lessonId: null,
      subtopicId: null,
      topicId: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
      kind: "concept",
      slug: "znaky-realismu",
      title: "Znaky realismu",
      statement:
        "Realismus usiluje o pravdivý obraz skutečnosti bez idealizace.",
      explanation: null,
      importance: 5,
      difficulty: 2,
      examRelevance: "high",
      confidence: 0.9,
      reviewStatus: "draft",
      tags: ["realismus", "literatura"],
      createdAt: "2026-07-20T10:00:00.000Z",
      updatedAt: "2026-07-20T10:00:00.000Z",
    });

    expect(kuSupportsAdaptiveLearning(ku)).toBe(true);
  });

  it("rejects oversized statement via invariant helper", () => {
    const long = Array.from({ length: 100 }, () => "slovo").join(" ");
    expect(() => assertAtomicStatement(long)).toThrow(/atomické/);
  });

  it("blocks published questions without KU links", () => {
    const q = questionSchema.parse({
      id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      type: "short_answer",
      stem: "Co je realismus?",
      status: "published",
      difficulty: 2,
      estimatedSeconds: 40,
      createdAt: "2026-07-20T10:00:00.000Z",
      updatedAt: "2026-07-20T10:00:00.000Z",
    });

    expect(() => questionRequiresKnowledgeUnits(q, 0)).toThrow(/KnowledgeUnit/);
    expect(() => questionRequiresKnowledgeUnits(q, 1)).not.toThrow();
  });
});
