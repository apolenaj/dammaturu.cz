import { describe, expect, it } from "vitest";
import {
  isCorrectGuess,
  pointsForHintCount,
  redactNameFromStatement,
  normalizeGuess,
} from "@/domain/learning/kdo-jsem";

describe("kdo jsem scoring", () => {
  it("awards more points for earlier solves", () => {
    expect(pointsForHintCount(1, 4)).toBe(4);
    expect(pointsForHintCount(2, 4)).toBe(3);
    expect(pointsForHintCount(3, 4)).toBe(2);
    expect(pointsForHintCount(4, 4)).toBe(1);
  });

  it("matches aliases without inventing names", () => {
    const mystery = {
      id: "00000000-0000-4000-8000-000000000001",
      slug: "balzac",
      answerName: "Honoré de Balzac",
      answerAliases: ["Balzac"],
      hints: [],
      knowledgeUnitIds: ["ku"],
    };
    expect(isCorrectGuess(mystery, "balzac")).toBe(true);
    expect(isCorrectGuess(mystery, "Honoré de Balzac")).toBe(true);
    expect(isCorrectGuess(mystery, "Zola")).toBe(false);
  });

  it("redacts names mechanically from FINAL", () => {
    const out = redactNameFromStatement(
      "Honoré de BALZAC (1799 - 1850) zakladatel kritickorealistického románu",
      ["Honoré de Balzac", "Balzac", "BALZAC"],
    );
    expect(normalizeGuess(out)).not.toContain("balzac");
    expect(out.toLowerCase()).toContain("zakladatel");
  });
});
