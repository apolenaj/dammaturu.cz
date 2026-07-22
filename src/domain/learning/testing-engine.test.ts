import { describe, expect, it } from "vitest";
import {
  buildTestingSession,
  buildTestingSessionSummary,
  buildValidatedQuestion,
  DONT_KNOW_TOKEN,
  gradeTestingAnswer,
  isAtomValidForTesting,
  selectAtomsForMode,
  type TestingAtom,
} from "@/domain/learning/testing-engine";

function atom(
  overrides: Partial<TestingAtom> & Pick<TestingAtom, "knowledgeUnitId" | "title" | "statement">,
): TestingAtom {
  return {
    sourceId: "src-1",
    sourceTitle: "Materiál Realismus",
    topic: "Realismus",
    sourceExcerpt:
      "Realismus je umělecký směr 2. pol. 19. století. Zobrazuje skutečnost bez idealizace. Typizace postav je základní postup realismu.",
    headingPath: "Rysy",
    charStart: 0,
    charEnd: 100,
    origin: "catalog",
    masteryScore: 40,
    mistakeWeight: 0,
    difficultyHint: 3,
    ...overrides,
  };
}

const a1 = atom({
  knowledgeUnitId: "u1",
  title: "Realismus",
  statement:
    "Realismus zobrazuje skutečnost bez idealizace a používá typizaci postav.",
});

const a2 = atom({
  knowledgeUnitId: "u2",
  title: "Romantismus",
  topic: "Romantismus",
  statement: "Romantismus zdůrazňuje cit, individualitu a výjimečného hrdinu.",
  sourceExcerpt:
    "Romantismus klade důraz na cit a individualitu. Hrdina je výjimečný a často v konfliktu se světem.",
  sourceId: "src-2",
  sourceTitle: "Romantismus",
  masteryScore: 15,
  mistakeWeight: 3,
});

const thin = atom({
  knowledgeUnitId: "u3",
  title: "Thin",
  statement: "Krátké.",
  sourceExcerpt: "Málo textu.",
});

describe("testing engine", () => {
  it("rejects atoms without grounded validated answer material", () => {
    expect(isAtomValidForTesting(a1)).toBe(true);
    expect(isAtomValidForTesting(thin)).toBe(false);
    expect(buildValidatedQuestion(thin, [thin])).toBeNull();
  });

  it("never builds a question without validatedAnswer.canonical", () => {
    const q = buildValidatedQuestion(a1, [a1, a2]);
    expect(q).not.toBeNull();
    expect(q!.validatedAnswer.canonical.length).toBeGreaterThan(10);
    expect(q!.explanation.length).toBeGreaterThan(20);
    expect(q!.provenance.excerpt.length).toBeGreaterThan(20);
  });

  it("builds mode sessions with target sizes", () => {
    const pool = [a1, a2, ...Array.from({ length: 8 }, (_, i) =>
      atom({
        knowledgeUnitId: `ux${i}`,
        title: `Pojem ${i}`,
        topic: i % 2 === 0 ? "Realismus" : "Romantismus",
        statement: `Realismus nebo romantismus bod ${i} zobrazuje skutečnost bez idealizace v kontextu ${i}.`,
        sourceExcerpt: `Realismus je umělecký směr. Bod ${i} zobrazuje skutečnost bez idealizace. Typizace postav ${i}.`,
      }),
    )];
    const s5 = buildTestingSession({
      learnerId: "g1",
      mode: "quick_5",
      pool,
    });
    expect(s5).not.toBeNull();
    expect(s5!.questions.length).toBeLessThanOrEqual(5);
    expect(s5!.questions.length).toBeGreaterThan(0);
  });

  it("mistakes_only prefers atoms with mistakeWeight", () => {
    const selected = selectAtomsForMode({
      mode: "mistakes_only",
      pool: [a1, a2],
    });
    expect(selected[0]?.knowledgeUnitId).toBe("u2");
  });

  it("grades Nevím as incorrect with corrective feedback", () => {
    const q = buildValidatedQuestion(a1, [a1, a2])!;
    const grade = gradeTestingAnswer({
      question: q,
      rawAnswer: DONT_KNOW_TOKEN,
    });
    expect(grade.result).toBe("incorrect");
    expect(grade.remainsInRotation).toBe(true);
    expect(grade.correctiveFeedback.length).toBeGreaterThan(5);
  });

  it("correct answers remain in rotation", () => {
    const q = buildValidatedQuestion(a1, [a1, a2], 0, "short_answer")!;
    const grade = gradeTestingAnswer({
      question: q,
      rawAnswer: a1.statement,
    });
    expect(["correct", "partial"]).toContain(grade.result);
    expect(grade.remainsInRotation).toBe(true);
  });

  it("builds session summary with required Czech sections", () => {
    const summary = buildTestingSessionSummary({
      mode: "quick_5",
      attempts: [
        {
          questionId: "1",
          knowledgeUnitId: "u1",
          topic: "Realismus",
          result: "correct",
          studentAnswer: "ok",
          coverage: 1,
        },
        {
          questionId: "2",
          knowledgeUnitId: "u2",
          topic: "Romantismus",
          result: "incorrect",
          studentAnswer: "x",
          coverage: 0,
        },
      ],
    });
    expect(summary.whatYouKnow).toContain("Realismus");
    expect(summary.whatToReview).toContain("Romantismus");
    expect(summary.biggestMistakeToday).toBeTruthy();
    expect(summary.nextRecommendedStep.label.length).toBeGreaterThan(3);
  });
});
