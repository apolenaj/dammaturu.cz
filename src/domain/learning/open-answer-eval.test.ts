import { describe, expect, it } from "vitest";
import {
  evaluateOpenAnswer,
  ideaPresentInAnswer,
  openAnswerResultLabelsEn,
} from "@/domain/learning/open-answer-eval";
import { gradeQuestion } from "@/domain/learning/question-engine";
import { buildCjlOtazkyPack } from "@/server/question-engine/packs/cjl-otazky";

describe("open answer soft matching", () => {
  it("accepts harmless wording / morphology differences", () => {
    const norm = "macha napsal skladbu maj roku 1836 v romantismu";
    expect(
      ideaPresentInAnswer(norm, "Karel Hynek Mácha", ["Mácha"]).matched,
    ).toBe(true);
    expect(ideaPresentInAnswer(norm, "Máj").matched).toBe(true);
    expect(ideaPresentInAnswer(norm, "1836").matched).toBe(true);
    expect(ideaPresentInAnswer(norm, "romantismus").matched).toBe(true);
  });
});

describe("evaluateOpenAnswer", () => {
  const keyIdeas = [
    {
      id: "1",
      label: "Karel Hynek Mácha",
      synonyms: ["Mácha"],
      required: true,
    },
    { id: "2", label: "Máj", synonyms: [], required: true },
    { id: "3", label: "1836", synonyms: [], required: true },
  ];

  it("returns Correct when key ideas are covered with different wording", () => {
    const ev = evaluateOpenAnswer({
      studentAnswer: "Autor Mácha napsal Máj v roce 1836.",
      keyIdeas,
      idealAnswer: "Karel Hynek Mácha napsal Máj (1836).",
      sourceEvidence: {
        quote: "Karel Hynek Mácha (1810–1836) napsal Máj.",
        sourceLabel: "Poznámky",
        pageStart: 1,
      },
    });
    expect(ev.result).toBe("correct");
    expect(ev.resultLabel).toBe(openAnswerResultLabelsEn.correct);
    expect(ev.whatWasCorrect.length).toBeGreaterThanOrEqual(3);
    expect(ev.whatWasMissing).toEqual([]);
    expect(ev.idealAnswer).toContain("Mácha");
    expect(ev.sourceEvidence?.pageStart).toBe(1);
    expect(ev.masteryCorrectness).toBe("correct");
  });

  it("returns Partially correct when some ideas missing", () => {
    const ev = evaluateOpenAnswer({
      studentAnswer: "Mácha napsal Máj.",
      keyIdeas,
      idealAnswer: "Karel Hynek Mácha napsal Máj (1836).",
      sourceEvidence: {
        quote: "Karel Hynek Mácha napsal Máj roku 1836.",
        sourceLabel: "Poznámky",
      },
    });
    expect(ev.result).toBe("partially_correct");
    expect(ev.whatWasMissing).toContain("1836");
    expect(ev.whatWasCorrect.length).toBeGreaterThanOrEqual(2);
    expect(ev.masteryCorrectness).toBe("partial");
  });

  it("flags incorrect claims without requiring exact string match on correct parts", () => {
    const ev = evaluateOpenAnswer({
      studentAnswer: "Shakespeare napsal Máj v roce 1599.",
      keyIdeas,
      idealAnswer: "Karel Hynek Mácha napsal Máj (1836).",
      sourceEvidence: {
        quote: "Karel Hynek Mácha napsal Máj roku 1836.",
        sourceLabel: "Poznámky",
      },
      knownIncorrect: ["Shakespeare"],
    });
    expect(ev.whatWasWrong.length).toBeGreaterThan(0);
    expect(ev.result).not.toBe("correct");
  });

  it("returns Incorrect when nothing relevant is present", () => {
    const ev = evaluateOpenAnswer({
      studentAnswer: "Dnes je hezké počasí.",
      keyIdeas,
      idealAnswer: "Karel Hynek Mácha napsal Máj (1836).",
    });
    expect(ev.result).toBe("incorrect");
    expect(ev.masteryCorrectness).toBe("incorrect");
    expect(ev.whatWasMissing.length).toBe(3);
  });
});

describe("question engine open answers", () => {
  it("attaches openEvaluation on short_answer grading", () => {
    const pack = buildCjlOtazkyPack("2026-07-20T12:00:00.000Z");
    const q = pack.questions.find((x) => x.kind === "short_answer");
    if (!q || q.kind !== "short_answer") throw new Error("missing sa");
    const grade = gradeQuestion(q, {
      kind: "short_answer",
      text: "Lidská komedie od Balzaca",
    });
    expect(grade.openEvaluation).toBeDefined();
    expect(grade.openEvaluation?.idealAnswer.length).toBeGreaterThan(0);
    expect(["correct", "partial", "incorrect"]).toContain(grade.result);
  });
});
