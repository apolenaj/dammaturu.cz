import { describe, expect, it } from "vitest";
import {
  gradeCharacterMatches,
  gradeCompositionPuzzle,
  gradeQuoteDeviceMatches,
  gradeStoryMapOrder,
  gradeTimedOral,
  majActivityIds,
  majKuCategories,
  parseMajExamPrepPack,
} from "@/domain/learning/maj-exam-prep";
import { buildMajExamPrepPack } from "@/server/maj-exam-prep/build";

describe("maj-exam-prep (D-044)", () => {
  it("defines 13 KU categories and 7 activities", () => {
    expect(majKuCategories).toHaveLength(13);
    expect(majActivityIds).toHaveLength(7);
    expect(majActivityIds).toContain("full_oral");
  });

  it("builds pack from verified SOURCE with all exam topics", async () => {
    const pack = await buildMajExamPrepPack();
    const parsed = parseMajExamPrepPack(pack);
    expect(parsed.slug).toBe("maj-exam-prep");
    expect(parsed.requiresVerifiedOnly).toBe(true);
    expect(parsed.sourceFilename).toBe("Máj.docx");
    expect(parsed.knowledgeUnits.length).toBeGreaterThanOrEqual(13);
    for (const cat of majKuCategories) {
      expect(
        parsed.knowledgeUnits.some((k) => k.category === cat),
        `missing category ${cat}`,
      ).toBe(true);
    }
    for (const ku of parsed.knowledgeUnits) {
      expect(ku.evidence?.validationStatus).toMatch(
        /verified_from_source|corrected/,
      );
      expect(ku.evidence?.filename).toBe("Máj.docx");
    }
    expect(parsed.storyMap).toHaveLength(6);
    expect(parsed.compositionPuzzle.length).toBeGreaterThanOrEqual(6);
    expect(parsed.characterMap.length).toBeGreaterThanOrEqual(3);
    expect(parsed.quoteDevices.length).toBeGreaterThanOrEqual(4);
    expect(parsed.summaryChallenge.seconds).toBe(60);
    expect(parsed.oralThreeMin.seconds).toBe(180);
  }, 60_000);

  it("grades activities and marks missing KUs after oral sim", async () => {
    const pack = await buildMajExamPrepPack();

    const wrongOrder = [...pack.storyMap]
      .sort((a, b) => b.order - a.order)
      .map((n) => n.id);
    const story = gradeStoryMapOrder(pack, wrongOrder);
    expect(story.scorePct).toBeLessThan(100);
    expect(story.missingKuSlugs.length).toBeGreaterThan(0);

    const correctStory = gradeStoryMapOrder(
      pack,
      [...pack.storyMap].sort((a, b) => a.order - b.order).map((n) => n.id),
    );
    expect(correctStory.scorePct).toBe(100);
    expect(correctStory.missingKuSlugs).toHaveLength(0);

    const charOk = gradeCharacterMatches(
      pack,
      Object.fromEntries(pack.characterMap.map((c) => [c.id, c.role])),
    );
    expect(charOk.scorePct).toBe(100);
    expect(charOk.missingKuSlugs).toHaveLength(0);

    const compOk = gradeCompositionPuzzle(
      pack,
      [...pack.compositionPuzzle]
        .sort((a, b) => a.correctOrder - b.correctOrder)
        .map((p) => p.id),
    );
    expect(compOk.scorePct).toBe(100);

    const quoteOk = gradeQuoteDeviceMatches(
      pack,
      Object.fromEntries(pack.quoteDevices.map((q) => [q.id, q.device])),
    );
    expect(quoteOk.scorePct).toBe(100);

    const weakOral = gradeTimedOral(pack, "summary_60s", "Nevím skoro nic.");
    expect(weakOral.missingKuSlugs.length).toBeGreaterThan(0);
    expect(weakOral.missing.length).toBe(weakOral.missingKuSlugs.length);

    const strongOral = gradeTimedOral(
      pack,
      "summary_60s",
      pack.summaryChallenge.excellentAnswer,
    );
    expect(strongOral.missingKuSlugs.length).toBeLessThanOrEqual(2);
    expect(strongOral.scorePct).toBeGreaterThan(50);
  }, 60_000);
});
