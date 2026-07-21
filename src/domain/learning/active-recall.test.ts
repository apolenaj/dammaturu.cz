import { describe, expect, it } from "vitest";
import {
  gradeRecallAnswer,
  normalizeRecallText,
  parseRecallPack,
} from "@/domain/learning/active-recall";
import { buildLiterarniVybavovaniPack } from "@/server/active-recall/packs/literarni-vybavovani";

describe("active recall grading", () => {
  const pack = buildLiterarniVybavovaniPack("2026-07-20T12:00:00.000Z");
  const prompt = pack.prompts.find((p) => p.slug === "realismus-znaky")!;

  it("parses pack with unique KUs per prompt", () => {
    expect(() => parseRecallPack(pack)).not.toThrow();
    expect(pack.prompts.length).toBeGreaterThanOrEqual(3);
  });

  it("normalizes Czech diacritics", () => {
    expect(normalizeRecallText("Typizace postav")).toContain("typizace");
    expect(normalizeRecallText("společenské")).toBe(
      normalizeRecallText("spolecenske"),
    );
  });

  it("returns partial — not binary — when some points hit", () => {
    const grade = gradeRecallAnswer(
      prompt,
      "Realismus typizuje postavy a řeší sociální prostředí. Také soudobá společnost.",
    );
    expect(grade.result).toBe("partial");
    expect(grade.matched.length).toBeGreaterThanOrEqual(2);
    expect(grade.missing.length).toBeGreaterThan(0);
    expect(grade.coverage).toBeGreaterThan(0);
    expect(grade.coverage).toBeLessThan(1);
    expect(grade.perKnowledgeUnit.some((k) => k.status === "hit")).toBe(true);
    expect(grade.perKnowledgeUnit.some((k) => k.status === "miss")).toBe(true);
    expect(grade.modelAnswer.length).toBeGreaterThan(20);
  });

  it("marks correct when enough points covered", () => {
    const grade = gradeRecallAnswer(
      prompt,
      "Pozorování reality, typizace postav, sociální prostředí, objektivita vypravěče, soudobá společnost bez idealizace.",
    );
    expect(grade.result).toBe("correct");
    expect(grade.matched.length).toBeGreaterThanOrEqual(prompt.minExpected);
    expect(grade.missing.length).toBe(0);
  });

  it("marks incorrect when nothing matches", () => {
    const grade = gradeRecallAnswer(prompt, "To je o středověku a rytířích.");
    expect(grade.result).toBe("incorrect");
    expect(grade.matched).toHaveLength(0);
    expect(grade.extra.length).toBeGreaterThan(0);
  });
});
