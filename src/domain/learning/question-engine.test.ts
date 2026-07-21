import { describe, expect, it } from "vitest";
import {
  gradeQuestion,
  parseQuestionPack,
  questionEngineKinds,
} from "@/domain/learning/question-engine";
import { buildCjlOtazkyPack } from "@/server/question-engine/packs/cjl-otazky";

describe("question engine", () => {
  const pack = buildCjlOtazkyPack("2026-07-20T12:00:00.000Z");

  it("covers all engine kinds with required schema fields", () => {
    const validated = parseQuestionPack(pack);
    const kinds = new Set(validated.questions.map((q) => q.kind));
    for (const kind of questionEngineKinds) {
      expect(kinds.has(kind)).toBe(true);
    }
    for (const q of validated.questions) {
      expect(q.difficulty).toBeGreaterThanOrEqual(1);
      expect(q.knowledgeUnits.length).toBeGreaterThan(0);
      expect(q.explanation.length).toBeGreaterThanOrEqual(40);
      expect(q.source.length).toBeGreaterThan(0);
      expect(q.examRelevance).toBeTruthy();
      expect("correctAnswer" in q).toBe(true);
      expect("distractors" in q).toBe(true);
    }
  });

  it("always returns explanation — never only pass/fail", () => {
    const q = pack.questions.find((x) => x.kind === "single_choice")!;
    const wrong = gradeQuestion(q, {
      kind: "single_choice",
      optionId: q.distractors[0]!,
    });
    expect(wrong.result).toBe("incorrect");
    expect(wrong.explanation.length).toBeGreaterThanOrEqual(40);
    expect(wrong.details.length).toBeGreaterThan(0);

    const right = gradeQuestion(q, {
      kind: "single_choice",
      optionId: q.correctAnswer,
    });
    expect(right.result).toBe("correct");
    expect(right.explanation).toBe(q.explanation);
  });

  it("supports partial scores for multiple choice and long answer", () => {
    const mc = pack.questions.find((x) => x.kind === "multiple_choice")!;
    if (mc.kind !== "multiple_choice") throw new Error("expected mc");
    const partial = gradeQuestion(mc, {
      kind: "multiple_choice",
      optionIds: [mc.correctAnswer[0]!],
    });
    expect(partial.result).toBe("partial");
    expect(partial.score).toBeGreaterThan(0);
    expect(partial.score).toBeLessThan(1);

    const la = pack.questions.find((x) => x.kind === "long_answer")!;
    if (la.kind !== "long_answer") throw new Error("expected la");
    const laPartial = gradeQuestion(la, {
      kind: "long_answer",
      text: "Obranná etapa a romantismus, ale nic dalšího.",
    });
    expect(laPartial.result).toBe("partial");
    expect(laPartial.explanation.length).toBeGreaterThan(20);
  });

  it("grades pairing and ordering with continuous score", () => {
    const aw = pack.questions.find((x) => x.kind === "author_work_pairing")!;
    if (aw.kind !== "author_work_pairing") throw new Error("expected aw");
    const keys = Object.keys(aw.correctAnswer);
    const pairs: Record<string, string> = {
      [keys[0]!]: aw.correctAnswer[keys[0]!]!,
      [keys[1]!]: "wrong",
      [keys[2]!]: "wrong",
    };
    const g = gradeQuestion(aw, { kind: "author_work_pairing", pairs });
    expect(g.result).toBe("partial");
    expect(g.score).toBeCloseTo(1 / 3, 2);
  });
});
