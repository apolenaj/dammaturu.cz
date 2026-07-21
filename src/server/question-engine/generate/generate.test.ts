import { describe, expect, it } from "vitest";
import {
  difficultyBandToScore,
  type VerifiedKnowledgeUnitInput,
} from "@/domain/learning/question-generation";
import {
  buildPackFromGeneratedQuestions,
  generateQuestionsFromKnowledgeUnits,
  isAnswerSupportedBySource,
  isStatementGrounded,
} from "@/server/question-engine/generate";

const DOC = "a1000000-0000-4000-8000-000000000001";

function unit(
  partial: Partial<VerifiedKnowledgeUnitInput> &
    Pick<
      VerifiedKnowledgeUnitInput,
      "id" | "title" | "statement" | "kind"
    >,
): VerifiedKnowledgeUnitInput {
  const { sourceEvidence: evidencePartial, ...rest } = partial;
  const quote = evidencePartial?.quote ?? partial.statement;
  return {
    verification: "verified_from_source",
    examRelevance: "high",
    ...rest,
    sourceEvidence: {
      quote,
      sourceLabel: "Test materiál",
      pageStart: 1,
      pageEnd: 1,
      documentId: DOC,
      ...evidencePartial,
    },
  };
}

const POOL: VerifiedKnowledgeUnitInput[] = [
  unit({
    id: "a1000000-0000-4000-8000-000000000011",
    title: "Mácha",
    kind: "person",
    statement: "Karel Hynek Mácha (1810–1836) napsal Máj.",
    author: "Karel Hynek Mácha",
    literaryWork: "Máj",
    literaryMovement: "Romantismus",
    datePeriod: "1810–1836",
    sourceEvidence: {
      quote: "Karel Hynek Mácha (1810–1836) napsal Máj. Patří k romantismu.",
      sourceLabel: "ČJL poznámky",
      pageStart: 1,
    },
  }),
  unit({
    id: "a1000000-0000-4000-8000-000000000012",
    title: "Erben",
    kind: "person",
    statement: "Karel Jaromír Erben (1811–1870) napsal Kytici.",
    author: "Karel Jaromír Erben",
    literaryWork: "Kytice",
    literaryMovement: "Romantismus",
    datePeriod: "1811–1870",
    sourceEvidence: {
      quote: "Karel Jaromír Erben (1811–1870) napsal Kytici. Řadí se k romantismu.",
      sourceLabel: "ČJL poznámky",
      pageStart: 2,
    },
  }),
  unit({
    id: "a1000000-0000-4000-8000-000000000013",
    title: "Neruda",
    kind: "person",
    statement: "Jan Neruda (1834–1891) psal v realismu.",
    author: "Jan Neruda",
    literaryWork: "Povídky malostranské",
    literaryMovement: "Realismus",
    datePeriod: "1834–1891",
    sourceEvidence: {
      quote:
        "Jan Neruda (1834–1891) psal Povídky malostranské. Patří k realismu.",
      sourceLabel: "ČJL poznámky",
      pageStart: 3,
    },
  }),
  unit({
    id: "a1000000-0000-4000-8000-000000000014",
    title: "Romantismus",
    kind: "concept",
    statement:
      "Romantismus je literární směr zdůrazňující cit a individualitu.",
    concept: "Romantismus",
    literaryMovement: "Romantismus",
    definition:
      "Romantismus je literární směr zdůrazňující cit a individualitu.",
    sourceEvidence: {
      quote:
        "Romantismus je literární směr zdůrazňující cit a individualitu.",
      sourceLabel: "ČJL poznámky",
      pageStart: 1,
    },
  }),
  unit({
    id: "a1000000-0000-4000-8000-000000000015",
    title: "Realismus",
    kind: "concept",
    statement:
      "Realismus je literární směr zobrazující soudobou společnost.",
    concept: "Realismus",
    literaryMovement: "Realismus",
    definition:
      "Realismus je literární směr zobrazující soudobou společnost.",
    sourceEvidence: {
      quote:
        "Realismus je literární směr zobrazující soudobou společnost.",
      sourceLabel: "ČJL poznámky",
      pageStart: 4,
    },
  }),
  unit({
    id: "a1000000-0000-4000-8000-000000000016",
    title: "Němcová",
    kind: "work",
    statement: "Božena Němcová (1820–1862) napsala Babičku.",
    author: "Božena Němcová",
    literaryWork: "Babička",
    literaryMovement: "Realismus",
    datePeriod: "1820–1862",
    sourceEvidence: {
      quote: "Božena Němcová (1820–1862) napsala Babičku. Spadá do realismu.",
      sourceLabel: "ČJL poznámky",
      pageStart: 5,
    },
  }),
];

describe("question generation support", () => {
  it("maps difficulty bands", () => {
    expect(difficultyBandToScore("easy")).toBe(1);
    expect(difficultyBandToScore("medium")).toBe(3);
    expect(difficultyBandToScore("hard")).toBe(4);
    expect(difficultyBandToScore("exam-like")).toBe(5);
  });

  it("requires source support for answers", () => {
    const evidence = POOL[0]!.sourceEvidence;
    expect(isAnswerSupportedBySource("Mácha", evidence)).toBe(true);
    expect(isAnswerSupportedBySource("1836", evidence)).toBe(true);
    expect(isAnswerSupportedBySource("Shakespeare", evidence)).toBe(false);
    expect(isStatementGrounded(POOL[0]!.statement, evidence)).toBe(true);
  });
});

describe("generateQuestionsFromKnowledgeUnits", () => {
  it("emits supported question kinds with rubric, evidence, KU ids", () => {
    const result = generateQuestionsFromKnowledgeUnits(POOL, {
      maxQuestions: 40,
      maxPerUnit: 6,
    });

    expect(result.stats.emitted).toBeGreaterThan(8);
    expect(result.questions.length).toBe(result.stats.emitted);

    for (const q of result.questions) {
      expect(q.knowledgeUnitIds.length).toBeGreaterThan(0);
      expect(q.sourceEvidence.quote.length).toBeGreaterThan(0);
      expect(q.gradingRubric.fullCreditCriteria.length).toBeGreaterThan(0);
      expect(q.gradingRubric.keyTerms.length).toBeGreaterThan(0);
      expect(q.correctAnswer).toBeDefined();
      expect(["easy", "medium", "hard", "exam-like"]).toContain(
        q.difficultyBand,
      );
      if (q.engineQuestion) {
        expect(q.engineQuestion.knowledgeUnits.length).toBeGreaterThan(0);
        expect(q.engineQuestion.explanation.length).toBeGreaterThanOrEqual(40);
        expect(q.engineQuestion.source.length).toBeGreaterThan(0);
      }
    }

    const kinds = new Set(result.questions.map((q) => q.generationKind));
    expect(kinds.has("open_answer")).toBe(true);
    expect(kinds.has("true_false")).toBe(true);
    expect(kinds.has("fill_blank") || kinds.has("multiple_choice")).toBe(true);
  });

  it("rejects unverified units and unsupported statements", () => {
    const bad: VerifiedKnowledgeUnitInput = {
      ...POOL[0]!,
      id: "a1000000-0000-4000-8000-000000000077",
      verification: "verified_from_source",
      statement: "Úplně vymyšlený fakt o neexistujícím autorovi.",
      sourceEvidence: {
        quote: "Karel Hynek Mácha napsal Máj.",
        sourceLabel: "x",
      },
    };
    const result = generateQuestionsFromKnowledgeUnits([bad], {
      maxQuestions: 10,
    });
    expect(result.stats.emitted).toBe(0);
    expect(result.skipped.some((s) => /podložený|quote/i.test(s.reason))).toBe(
      true,
    );
  });

  it("dedupes trivial fingerprint collisions", () => {
    const result = generateQuestionsFromKnowledgeUnits(POOL, {
      difficulties: ["easy"],
      maxPerUnit: 8,
      maxQuestions: 80,
    });
    const fps = result.questions.map((q) => q.fingerprint);
    expect(new Set(fps).size).toBe(fps.length);
  });

  it("can assemble a Question Engine pack when coverage is enough", () => {
    const result = generateQuestionsFromKnowledgeUnits(POOL, {
      maxQuestions: 60,
      maxPerUnit: 8,
    });
    const pack = buildPackFromGeneratedQuestions({
      questions: result.questions,
      slug: "qg-test-cjl",
      title: "QG test",
      summary: "Generováno z ověřených KU pro test.",
    });
    // May be null if <8 engine kinds — assert honestly
    if (pack) {
      expect(pack.questions.length).toBeGreaterThanOrEqual(8);
      const kinds = new Set(pack.questions.map((q) => q.kind));
      expect(kinds.size).toBeGreaterThanOrEqual(8);
    } else {
      const engineKinds = new Set(
        result.questions
          .filter((q) => q.engineQuestion)
          .map((q) => q.engineQuestion!.kind),
      );
      expect(engineKinds.size).toBeLessThan(8);
    }
  });
});
