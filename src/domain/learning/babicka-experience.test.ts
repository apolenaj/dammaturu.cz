import { describe, expect, it } from "vitest";
import {
  babickaActivityIds,
  babickaTopics,
  gradeCharacterCardQuiz,
  gradeOralBuilder,
  gradeRealismChallenge,
  gradeStoryStructure,
  gradeTrueFalseTraps,
  parseBabickaExperiencePack,
} from "@/domain/learning/babicka-experience";
import { buildBabickaExperiencePack } from "@/server/babicka-experience/build";

describe("babicka-experience (D-045)", () => {
  it("defines 8 topics and 6 activities", () => {
    expect(babickaTopics).toHaveLength(8);
    expect(babickaActivityIds).toHaveLength(6);
    expect(babickaActivityIds).toContain("oral_builder");
  });

  it("builds pack from verified SOURCE without relying on long prose alone", async () => {
    const pack = await buildBabickaExperiencePack();
    const parsed = parseBabickaExperiencePack(pack);
    expect(parsed.slug).toBe("babicka");
    expect(parsed.requiresVerifiedOnly).toBe(true);
    expect(parsed.sourceFilename).toBe("Babička.docx");
    for (const topic of babickaTopics) {
      expect(
        parsed.knowledgeUnits.some((k) => k.topic === topic),
      ).toBe(true);
    }
    for (const ku of parsed.knowledgeUnits) {
      expect(ku.cardLine.length).toBeLessThanOrEqual(200);
      expect(ku.evidence?.validationStatus).toMatch(
        /verified_from_source|corrected/,
      );
    }
    expect(parsed.characterCards.length).toBeGreaterThanOrEqual(4);
    expect(parsed.relationshipEdges.length).toBeGreaterThanOrEqual(4);
    expect(parsed.trueFalseTraps.length).toBeGreaterThanOrEqual(5);
    expect(parsed.storyStructure.length).toBeGreaterThanOrEqual(4);
    expect(parsed.realismChallenge.length).toBeGreaterThanOrEqual(4);
    expect(parsed.oralBuilder.builderChips.length).toBeGreaterThanOrEqual(4);
  }, 60_000);

  it("grades interactive activities and marks missing KU", async () => {
    const pack = await buildBabickaExperiencePack();

    const cardsOk = gradeCharacterCardQuiz(
      pack,
      Object.fromEntries(
        pack.characterCards.map((c) => [c.id, c.socialSphere]),
      ),
    );
    expect(cardsOk.scorePct).toBe(100);

    const tfWrong = gradeTrueFalseTraps(
      pack,
      Object.fromEntries(pack.trueFalseTraps.map((t) => [t.id, !t.isTrue])),
    );
    expect(tfWrong.scorePct).toBe(0);
    expect(tfWrong.missingKuSlugs.length).toBeGreaterThan(0);

    const structOk = gradeStoryStructure(
      pack,
      [...pack.storyStructure]
        .sort((a, b) => a.correctOrder - b.correctOrder)
        .map((p) => p.id),
    );
    expect(structOk.scorePct).toBe(100);

    const realismOk = gradeRealismChallenge(
      pack,
      Object.fromEntries(
        pack.realismChallenge.map((r) => [r.id, r.answer]),
      ),
    );
    expect(realismOk.scorePct).toBe(100);

    const oralWeak = gradeOralBuilder(pack, "Nevím.");
    expect(oralWeak.missingKuSlugs.length).toBeGreaterThan(0);

    const oralStrong = gradeOralBuilder(
      pack,
      pack.oralBuilder.excellentAnswer,
    );
    expect(oralStrong.scorePct).toBeGreaterThan(50);
    expect(oralStrong.missingKuSlugs.length).toBeLessThanOrEqual(2);
  }, 60_000);
});
