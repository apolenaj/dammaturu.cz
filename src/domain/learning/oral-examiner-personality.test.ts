import { describe, expect, it } from "vitest";
import {
  analyzeOralDelivery,
  enrichOralReport,
  followUpCountForPersonality,
  styleFollowUps,
  styleOpeningPrompt,
} from "@/domain/learning/oral-examiner-personality";
import {
  buildOralExaminerBrief,
  gradeOralSimulation,
  textUtterance,
} from "@/domain/learning/oral-maturity-simulation";
import {
  createLiteratureBook,
  setManualField,
} from "@/domain/learning/literature-maturity";

const now = "2026-07-21T12:00:00.000Z";

function richBook() {
  let book = createLiteratureBook({
    id: "11111111-1111-4111-8111-111111111111",
    titleCs: "Máj",
    authorCs: "Karel Hynek Mácha",
    nowIso: now,
  });
  for (const [k, v] of [
    ["literaryMovement", "Romantismus"],
    ["themes", "vina láska smrt"],
    ["characters", "Jarmila Vilém"],
    ["composition", "čtyři zpěvy"],
  ] as const) {
    book = setManualField(book, k, v, now);
  }
  return book;
}

describe("oral-examiner-personality (D-054)", () => {
  it("changes questioning style but not factual grade", () => {
    const brief = buildOralExaminerBrief({
      mode: "book",
      books: [richBook()],
      bookId: "11111111-1111-4111-8111-111111111111",
    });
    const answer =
      "Máj Karel Hynek Mácha romantismus vina láska smrt Jarmila Vilém čtyři zpěvy";
    const base = gradeOralSimulation({
      brief,
      mainAnswer: textUtterance(answer, now),
      followUpAnswers: {},
      followUpAskedIds: [],
      confidenceSelf: 3,
    });

    const supportive = enrichOralReport({
      report: base,
      mainAnswerText: answer,
      personality: "supportive_teacher",
      bookHref: brief.relatedLearnHref,
    });
    const strict = enrichOralReport({
      report: base,
      mainAnswerText: answer,
      personality: "strict_examiner",
      bookHref: brief.relatedLearnHref,
    });

    expect(supportive.overallScore).toBe(strict.overallScore);
    expect(supportive.dimensions).toEqual(strict.dimensions);
    expect(supportive.personalityLabelCs).not.toBe(strict.personalityLabelCs);

    const introS = styleOpeningPrompt("supportive_teacher", brief);
    const introX = styleOpeningPrompt("strict_examiner", brief);
    expect(introS.textCs.toLowerCase()).toMatch(/klid|pomáh|nanečisto|ahoj/);
    expect(introX.textCs.toLowerCase()).toMatch(/fakta|struktur/);
    expect(followUpCountForPersonality("supportive_teacher")).toBeLessThan(
      followUpCountForPersonality("strict_examiner"),
    );
  });

  it("styles follow-ups without changing checklist ids", () => {
    const brief = buildOralExaminerBrief({
      mode: "book",
      books: [richBook()],
      bookId: "11111111-1111-4111-8111-111111111111",
    });
    const fus = brief.followUps.slice(0, 2);
    const styled = styleFollowUps("maturitni_komise", fus, brief.checklist);
    expect(styled[0]!.checklistItemId).toBe(fus[0]!.checklistItemId);
    expect(styled[0]!.textCs.toLowerCase()).toMatch(/komise|kandidát/);
  });

  it("measures filler and structure delivery", () => {
    const noisy = analyzeOralDelivery(
      "No vlastně jako ehm Máj je prostě o lásce. Jako víš, že jo, a takhle dál bez struktury.",
    );
    expect(noisy.fillerCount).toBeGreaterThan(2);
    expect(noisy.fillerNoteCs).toBeTruthy();

    const structured = analyzeOralDelivery(
      "Nejprve uvedu autora Máchu. Dále kompozici čtyř zpěvů. Na závěr témata viny a lásky, protože to je jádro díla.",
    );
    expect(structured.structureMarkerCount).toBeGreaterThanOrEqual(2);
    expect(structured.structureNoteCs).toMatch(/struktury|Dobré/i);
  });

  it("report includes next practice recommendations", () => {
    const brief = buildOralExaminerBrief({
      mode: "book",
      books: [richBook()],
      bookId: "11111111-1111-4111-8111-111111111111",
    });
    const base = gradeOralSimulation({
      brief,
      mainAnswer: textUtterance("krátké", now),
      followUpAnswers: {},
      followUpAskedIds: [],
      confidenceSelf: 2,
    });
    const enriched = enrichOralReport({
      report: base,
      mainAnswerText: "krátké",
      personality: "standard_teacher",
      bookHref: "/app/literature/x",
    });
    expect(enriched.nextPractice.length).toBeGreaterThan(0);
    expect(enriched.delivery.wordCount).toBeGreaterThan(0);
  });
});
