import { describe, expect, it } from "vitest";
import {
  buildOralExaminerBrief,
  gradeOralSimulation,
  textUtterance,
} from "@/domain/learning/oral-maturity-simulation";
import {
  createLiteratureBook,
  setManualField,
} from "@/domain/learning/literature-maturity";
import {
  createTextInputPort,
  createVoiceInputPortStub,
} from "@/domain/learning/oral-io-ports";

const now = "2026-07-21T12:00:00.000Z";

function richBook() {
  let book = createLiteratureBook({
    id: "11111111-1111-4111-8111-111111111111",
    titleCs: "Máj",
    authorCs: "Karel Hynek Mácha",
    nowIso: now,
  });
  book = setManualField(book, "literaryMovement", "Romantismus", now);
  book = setManualField(book, "themes", "vina láska smrt", now);
  book = setManualField(book, "characters", "Jarmila Vilém", now);
  book = setManualField(book, "composition", "čtyři zpěvy", now);
  book = {
    ...book,
    fields: {
      ...book.fields,
      literaryMovement: {
        ...book.fields.literaryMovement,
        source: "student_material",
        sourceLabelCs: "Ověřený materiál",
        materialId: "33333333-3333-4333-8333-333333333333",
        confidence: 0.9,
      },
    },
  };
  return book;
}

describe("oral-maturity-simulation (D-053)", () => {
  it("builds brief from book fields with labeled evidence", () => {
    const brief = buildOralExaminerBrief({
      mode: "book",
      books: [richBook()],
      bookId: "11111111-1111-4111-8111-111111111111",
    });
    expect(brief.evidenceSufficient).toBe(true);
    expect(brief.checklist.length).toBeGreaterThanOrEqual(4);
    expect(
      brief.checklist.every((c) => c.evidence.length > 0),
    ).toBe(true);
    expect(brief.evidenceSummaryCs.join(" ")).toMatch(/materiál|Karta|Škol/i);
  });

  it("refuses fake score when evidence is insufficient", () => {
    const thin = createLiteratureBook({
      id: "22222222-2222-4222-8222-222222222222",
      titleCs: "Neznámé",
      nowIso: now,
    });
    const brief = buildOralExaminerBrief({
      mode: "book",
      books: [thin],
      bookId: thin.id,
    });
    expect(brief.evidenceSufficient).toBe(false);
    const report = gradeOralSimulation({
      brief,
      mainAnswer: textUtterance("Krátká odpověď bez podkladů.", now),
      followUpAnswers: {},
      followUpAskedIds: [],
      confidenceSelf: 5,
    });
    expect(report.insufficientEvidence).toBe(true);
    expect(report.overallScore).toBe(0);
    expect(report.isOfficialSchoolGrade).toBe(false);
    expect(report.disclaimerCs.toLowerCase()).toMatch(/skóre|podklad/);
  });

  it("grades with evidence trail and never school marks", () => {
    const brief = buildOralExaminerBrief({
      mode: "full",
      books: [richBook()],
      bookId: "11111111-1111-4111-8111-111111111111",
    });
    const report = gradeOralSimulation({
      brief,
      mainAnswer: textUtterance(
        "Máj od Karla Hynka Máchy je romantismus. Témata vina láska smrt. Postavy Jarmila Vilém. Kompozice čtyři zpěvy.",
        now,
      ),
      followUpAnswers: {},
      followUpAskedIds: [],
      confidenceSelf: 3,
    });
    expect(report.insufficientEvidence).toBe(false);
    expect(report.isOfficialSchoolGrade).toBe(false);
    expect(report.dimensionEvidence.length).toBe(6);
    expect(report.gradedAgainstCs.length).toBeGreaterThan(0);
    expect(report.evidenceTrailCs.some((l) => /Rubrika|Shoda|Chybí/i.test(l))).toBe(
      true,
    );
    expect(report.overallScore).toBeGreaterThan(0);
  });

  it("resolves weak_area and random_book modes", () => {
    const a = createLiteratureBook({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      titleCs: "A",
      nowIso: now,
    });
    let b = richBook();
    b = { ...b, id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", titleCs: "B" };
    const weak = buildOralExaminerBrief({
      mode: "weak_area",
      books: [a, b],
    });
    expect(weak.bookTitleCs).toBe("A");
    const rnd = buildOralExaminerBrief({
      mode: "random_book",
      books: [a, b],
    });
    expect(["A", "B"]).toContain(rnd.bookTitleCs);
  });

  it("voice input port still yields text for grading", async () => {
    const port = createVoiceInputPortStub({
      transcribe: async () => "Přepis hlasu o Máchovi",
    });
    const u = await port.captureAnswer({ maxSeconds: 60 });
    expect(u.modality).toBe("voice");
    expect(u.textCs).toMatch(/Mách/);
    const textPort = createTextInputPort(() => "Textová odpověď");
    const t = await textPort.captureAnswer({ maxSeconds: 60 });
    expect(t.modality).toBe("text");
  });
});
