import { describe, expect, it } from "vitest";
import {
  gradeMockExam,
  mockExamDimensions,
  mockExamRubric,
  parseMockExamPack,
  pickRandomTopic,
  selectFollowUps,
} from "@/domain/learning/mock-exam";
import { buildMockExamPack } from "@/server/mock-exam/build";

describe("mock-exam / Zkouška nanečisto (D-046)", () => {
  it("defines rubric without school grades", () => {
    expect(mockExamDimensions).toHaveLength(6);
    const sum = Object.values(mockExamRubric.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(mockExamRubric.disclaimerCs).toMatch(/není oficiální školní známka/i);
  });

  it("builds pack with topics and follow-ups", () => {
    const pack = parseMockExamPack(buildMockExamPack());
    expect(pack.slug).toBe("zkouska-nanecisto");
    expect(pack.topics.length).toBeGreaterThanOrEqual(3);
    for (const t of pack.topics) {
      expect(t.checklist.length).toBeGreaterThanOrEqual(5);
      expect(t.followUps.length).toBeGreaterThanOrEqual(3);
      expect(t.modelStructure.length).toBeGreaterThanOrEqual(4);
      expect(t.prepareSeconds).toBeGreaterThan(0);
      expect(t.answerSeconds).toBeGreaterThan(0);
    }
    const random = pickRandomTopic(pack, 0);
    expect(pack.topics.some((t) => t.slug === random.slug)).toBe(true);
  });

  it("grades dimensions, picks follow-ups from misses, never sets school grade", () => {
    const pack = buildMockExamPack();
    const topic = pack.topics.find((t) => t.slug === "maj")!;

    const weak = gradeMockExam({
      topic,
      mainAnswer: "Nevím skoro nic o literatuře.",
      followUpAnswers: {},
      followUpAskedIds: [],
      confidenceSelf: 2,
    });
    expect(weak.isOfficialSchoolGrade).toBe(false);
    expect(weak.missingPoints.length).toBeGreaterThan(0);
    expect(weak.overallScore).toBeLessThan(mockExamRubric.partialAt);
    expect(weak.disclaimerCs).toMatch(/rubriky/i);

    const followUps = selectFollowUps(
      topic,
      weak.missingPoints.map((m) => m.itemId),
      3,
    );
    expect(followUps.length).toBeGreaterThan(0);
    expect(followUps.length).toBeLessThanOrEqual(3);

    const strong = gradeMockExam({
      topic,
      mainAnswer: topic.excellentAnswer,
      followUpAnswers: {},
      followUpAskedIds: [],
      confidenceSelf: 5,
    });
    expect(strong.isOfficialSchoolGrade).toBe(false);
    expect(strong.overallScore).toBeGreaterThanOrEqual(mockExamRubric.partialAt);
    expect(strong.strengths.length).toBeGreaterThan(0);
    expect(strong.modelStructure).toEqual(topic.modelStructure);
    expect(strong.dimensions.coverage).toBeGreaterThan(50);

    const inaccurate = gradeMockExam({
      topic,
      mainAnswer: `${topic.excellentAnswer} Erben napsal Máj a Vodník.`,
      followUpAnswers: {},
      followUpAskedIds: [],
      confidenceSelf: 4,
    });
    expect(inaccurate.inaccuracies.length).toBeGreaterThan(0);
    expect(inaccurate.dimensions.accuracy).toBeLessThan(100);
  });
});
