import { describe, expect, it } from "vitest";
import { assertLessonNotBlob, parseLessonDocument } from "@/domain/learning/lesson";
import { applyInteractionToMastery } from "@/domain/learning/mastery";
import { buildHomonymaLesson } from "@/server/lesson-engine/lessons/homonyma-uvod";
import { lessonBlockTypes } from "@/domain/learning/blocks";

describe("lesson block schema", () => {
  it("covers required block type catalog", () => {
    expect(lessonBlockTypes).toContain("hook");
    expect(lessonBlockTypes).toContain("exit_ticket");
    expect(lessonBlockTypes).toContain("visual_comparison");
    expect(lessonBlockTypes.length).toBe(19);
  });
});

describe("Homonyma sample lesson", () => {
  const lesson = buildHomonymaLesson("2026-07-20T12:00:00.000Z");

  it("is schema-valid and not a text blob", () => {
    expect(() => assertLessonNotBlob(lesson)).not.toThrow();
    expect(lesson.blocks.length).toBeGreaterThanOrEqual(8);
    const types = new Set(lesson.blocks.map((b) => b.type));
    expect(types.size).toBeGreaterThanOrEqual(3);
    expect(types.has("active_recall") || types.has("mini_quiz")).toBe(true);
  });

  it("round-trips through parseLessonDocument", () => {
    const again = parseLessonDocument(JSON.parse(JSON.stringify(lesson)));
    expect(again.slug).toBe("homonyma-uvod");
  });
});

describe("assertLessonNotBlob", () => {
  it("rejects a two-block explanation-only lesson", () => {
    const bad = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      slug: "bad-blob",
      title: "Blob",
      topicId: null,
      topicSlug: "x",
      curriculumSlug: "cjl-beta",
      objective: "test",
      estimatedMinutes: 5,
      status: "draft" as const,
      knowledgeUnitIds: [],
      blocks: [
        {
          id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
          type: "core_explanation" as const,
          knowledgeUnitIds: [],
          paragraphs: ["Dlouhý výklad A."],
        },
        {
          id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
          type: "summary" as const,
          knowledgeUnitIds: [],
          points: ["Bod 1", "Bod 2"],
        },
      ],
      createdAt: "2026-07-20T12:00:00.000Z",
      updatedAt: "2026-07-20T12:00:00.000Z",
    };
    expect(() => parseLessonDocument(bad)).toThrow();
  });
});

describe("applyInteractionToMastery", () => {
  it("does not raise above exposed on continue", () => {
    const s = applyInteractionToMastery(null, {
      knowledgeUnitId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "continue",
      at: "2026-07-20T12:00:00.000Z",
    });
    expect(s.level).toBe("unknown");
  });

  it("marks exposed on understand", () => {
    const s = applyInteractionToMastery(null, {
      knowledgeUnitId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "understand",
      at: "2026-07-20T12:00:00.000Z",
    });
    expect(s.level).toBe("exposed");
    expect(s.evidenceCount).toBe(1);
  });

  it("moves to recall_fragile on successful quiz", () => {
    let s = applyInteractionToMastery(null, {
      knowledgeUnitId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "understand",
      at: "2026-07-20T12:00:00.000Z",
    });
    s = applyInteractionToMastery(s, {
      knowledgeUnitId: s.knowledgeUnitId,
      kind: "quiz_answer",
      at: "2026-07-20T12:01:00.000Z",
      success: true,
    });
    expect(s.level).toBe("recall_fragile");
    expect(s.correctStreak).toBe(1);
  });

  it("lapses on dont_know", () => {
    let s = applyInteractionToMastery(null, {
      knowledgeUnitId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "quiz_answer",
      at: "2026-07-20T12:00:00.000Z",
      success: true,
    });
    s = applyInteractionToMastery(s, {
      knowledgeUnitId: s.knowledgeUnitId,
      kind: "dont_know",
      at: "2026-07-20T12:02:00.000Z",
    });
    expect(s.lapses).toBe(1);
    expect(s.correctStreak).toBe(0);
  });
});
