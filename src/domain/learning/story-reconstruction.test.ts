import { describe, expect, it } from "vitest";
import {
  availableDifficulties,
  buildPlotAxis,
  gradeReconstruction,
  isCorrectOrder,
  parseStoryReconstructionPack,
  shuffleStepsNotCorrect,
  stepsForDifficulty,
} from "@/domain/learning/story-reconstruction";

const SAMPLE_EVIDENCE = {
  e1: {
    qaItemId: "qa-1",
    knowledgeUnitId: "storyrecon:t1",
    publishedStatement: "Událost A nastala první. Další kontext.",
    validationStatus: "verified_from_source" as const,
    filename: "Test.docx",
  },
  e2: {
    qaItemId: "qa-2",
    knowledgeUnitId: "storyrecon:t2",
    publishedStatement: "Událost B nastala druhá.",
    validationStatus: "verified_from_source" as const,
    filename: "Test.docx",
  },
  e3: {
    qaItemId: "qa-3",
    knowledgeUnitId: "storyrecon:t3",
    publishedStatement: "Událost C nastala třetí.",
    validationStatus: "verified_from_source" as const,
    filename: "Test.docx",
  },
  e4: {
    qaItemId: "qa-4",
    knowledgeUnitId: "storyrecon:t4",
    publishedStatement: "Událost D nastala čtvrtá.",
    validationStatus: "verified_from_source" as const,
    filename: "Test.docx",
  },
  e5: {
    qaItemId: "qa-5",
    knowledgeUnitId: "storyrecon:t5",
    publishedStatement: "Událost E nastala pátá.",
    validationStatus: "verified_from_source" as const,
    filename: "Test.docx",
  },
  e6: {
    qaItemId: "qa-6",
    knowledgeUnitId: "storyrecon:t6",
    publishedStatement: "Událost F nastala šestá.",
    validationStatus: "verified_from_source" as const,
    filename: "Test.docx",
  },
  e7: {
    qaItemId: "qa-7",
    knowledgeUnitId: "storyrecon:t7",
    publishedStatement: "Událost G nastala sedmá.",
    validationStatus: "verified_from_source" as const,
    filename: "Test.docx",
  },
  e8: {
    qaItemId: "qa-8",
    knowledgeUnitId: "storyrecon:t8",
    publishedStatement: "Událost H nastala osmá.",
    validationStatus: "verified_from_source" as const,
    filename: "Test.docx",
  },
};

function samplePack() {
  const stepIds = [
    "11111111-1111-4111-8111-111111111101",
    "11111111-1111-4111-8111-111111111102",
    "11111111-1111-4111-8111-111111111103",
    "11111111-1111-4111-8111-111111111104",
    "11111111-1111-4111-8111-111111111105",
    "11111111-1111-4111-8111-111111111106",
    "11111111-1111-4111-8111-111111111107",
    "11111111-1111-4111-8111-111111111108",
  ];
  const labels = [
    "Událost A nastala první.",
    "Událost B nastala druhá.",
    "Událost C nastala třetí.",
    "Událost D nastala čtvrtá.",
    "Událost E nastala pátá.",
    "Událost F nastala šestá.",
    "Událost G nastala sedmá.",
    "Událost H nastala osmá.",
  ];
  return parseStoryReconstructionPack({
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    slug: "test-pack",
    title: "Test",
    summary: "Test pack for reconstruction.",
    requiresVerifiedOnly: true,
    stories: [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        slug: "test-story",
        title: "Test story",
        workTitle: "Test",
        author: "Autor",
        summary: "Seřaď události.",
        steps: stepIds.map((id, i) => ({
          id,
          order: i,
          label: labels[i]!,
          evidenceId: `e${i + 1}`,
        })),
      },
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        slug: "test-story-b",
        title: "Test B",
        workTitle: "Test B",
        author: "Autor",
        summary: "Druhý příběh.",
        steps: stepIds.slice(0, 4).map((id, i) => ({
          id: id.replace("111", "222"),
          order: i,
          label: labels[i]!,
          evidenceId: `e${i + 1}`,
        })),
      },
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        slug: "test-story-c",
        title: "Test C",
        workTitle: "Test C",
        author: "Autor",
        summary: "Třetí příběh.",
        steps: stepIds.slice(0, 4).map((id, i) => ({
          id: id.replace("111", "333"),
          order: i,
          label: labels[i]!,
          evidenceId: `e${i + 1}`,
        })),
      },
    ],
    evidence: SAMPLE_EVIDENCE,
    createdAt: "2026-07-20T12:00:00.000Z",
    updatedAt: "2026-07-20T12:00:00.000Z",
  });
}

describe("story-reconstruction", () => {
  it("exposes difficulties by step count", () => {
    const pack = samplePack();
    const full = pack.stories[0]!;
    expect(availableDifficulties(full)).toEqual(["easy", "medium", "hard"]);
    expect(stepsForDifficulty(full, "easy")).toHaveLength(4);
    expect(stepsForDifficulty(full, "medium")).toHaveLength(6);
    expect(stepsForDifficulty(full, "hard")).toHaveLength(8);
    expect(availableDifficulties(pack.stories[1]!)).toEqual(["easy"]);
  });

  it("grades order and builds plot axis on success", () => {
    const pack = samplePack();
    const story = pack.stories[0]!;
    const correct = stepsForDifficulty(story, "easy").map((s) => s.id);
    const ok = gradeReconstruction({
      pack,
      storyId: story.id,
      difficulty: "easy",
      submittedOrder: correct,
    });
    expect(ok?.correct).toBe(true);
    expect(ok?.axis).toHaveLength(4);
    expect(ok?.axis?.[0]?.label).toContain("Událost A");

    const bad = gradeReconstruction({
      pack,
      storyId: story.id,
      difficulty: "easy",
      submittedOrder: [...correct].reverse(),
    });
    expect(bad?.correct).toBe(false);
    expect(bad?.axis).toBeNull();
  });

  it("shuffle is never accidentally correct", () => {
    const ids = ["a", "b", "c", "d"];
    for (let i = 0; i < 20; i += 1) {
      const shuffled = shuffleStepsNotCorrect(ids);
      expect(isCorrectOrder(shuffled, ids)).toBe(false);
    }
  });

  it("buildPlotAxis uses evidence excerpts", () => {
    const pack = samplePack();
    const axis = buildPlotAxis(pack, pack.stories[0]!, "medium");
    expect(axis).toHaveLength(6);
    expect(axis[0]?.filename).toBe("Test.docx");
    expect(axis[0]?.evidenceExcerpt.length).toBeGreaterThan(5);
  });
});
