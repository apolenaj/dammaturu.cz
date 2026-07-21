import { describe, expect, it } from "vitest";
import {
  buildLiteratureHubView,
  computeBookMastery,
  createLiteratureBook,
  drawLiteratureBook,
  emptyFields,
  emptyLiteratureList,
  extractFieldsFromKnowledgeUnits,
  importSelectedBooksFromExamProfile,
  setManualField,
  weakestLiteratureBooks,
} from "@/domain/learning/literature-maturity";
import type { LearnerKnowledgeUnit } from "@/domain/learning/learner-knowledge";

const now = "2026-07-21T12:00:00.000Z";

describe("literature-maturity (D-052)", () => {
  it("creates a book with all labeled empty fields and low mastery", () => {
    const book = createLiteratureBook({
      id: "11111111-1111-4111-8111-111111111111",
      titleCs: "Máj",
      authorCs: "Mácha",
      nowIso: now,
    });
    expect(book.fields.author.valueCs).toBe("Mácha");
    expect(book.fields.themes.valueCs).toBeNull();
    expect(book.fields.themes.sourceLabelCs).toMatch(/prázdné/i);
    expect(book.mastery.fieldsFilled).toBe(1);
    expect(book.mastery.band).toBe("new");
  });

  it("imports fields from verified material KUs without inventing", () => {
    const units = [
      {
        id: "22222222-2222-4222-8222-222222222222",
        kind: "fact",
        title: "Autor",
        statement: "Karel Hynek Mácha napsal Máj.",
        grounded: {
          literaryWork: "Máj",
          author: "Karel Hynek Mácha",
          literaryMovement: "Romantismus",
          datePeriod: "1836",
        },
        provenance: {
          documentId: "33333333-3333-4333-8333-333333333333",
          chunkId: "44444444-4444-4444-8444-444444444444",
          sourceRef: null,
          pageStart: 1,
          pageEnd: 1,
          sectionPath: [],
          headingPath: null,
          sourceText: "Karel Hynek Mácha napsal Máj.",
          confidence: 0.9,
        },
        flags: [],
        flagNotes: [],
        reviewStatus: "needs_review",
        importance: 4,
        difficulty: 2,
        examRelevance: "high",
        confidence: 0.9,
        tags: [],
      },
    ] as unknown as LearnerKnowledgeUnit[];

    const fields = extractFieldsFromKnowledgeUnits(
      units,
      "33333333-3333-4333-8333-333333333333",
    );
    expect(fields.author?.valueCs).toBe("Karel Hynek Mácha");
    expect(fields.author?.source).toBe("student_material");
    expect(fields.literaryMovement?.valueCs).toBe("Romantismus");
    expect(fields.genre).toBeUndefined();
  });

  it("draws and ranks weakest by mastery", () => {
    const a = createLiteratureBook({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      titleCs: "A",
      nowIso: now,
    });
    let b = createLiteratureBook({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      titleCs: "B",
      nowIso: now,
    });
    b = setManualField(b, "themes", "vina a trest", now);
    b = setManualField(b, "motifs", "voda", now);
    b = setManualField(b, "characters", "hlavní hrdina", now);
    b = {
      ...b,
      mastery: computeBookMastery({
        fields: b.fields,
        practiceCount: 5,
        lastPracticedAt: now,
        nowIso: now,
      }),
    };
    const weak = weakestLiteratureBooks([a, b], 2);
    expect(weak[0]!.titleCs).toBe("A");
    const drawn = drawLiteratureBook([a, b], () => 0.01);
    expect(drawn).not.toBeNull();
  });

  it("imports exam-profile selected books into the list", () => {
    const list = emptyLiteratureList("learner1", now);
    const next = importSelectedBooksFromExamProfile(
      list,
      [{ id: "sel1", titleCs: "Kytice", authorCs: "Erben" }],
      now,
      () => "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
    expect(next.books).toHaveLength(1);
    expect(next.books[0]!.titleCs).toBe("Kytice");
    expect(next.books[0]!.examProfileBookId).toBe("sel1");
  });

  it("hub exposes draw and weakest CTAs", () => {
    const list = emptyLiteratureList("l1", now);
    list.books.push(
      createLiteratureBook({
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        titleCs: "Babička",
        nowIso: now,
      }),
    );
    const view = buildLiteratureHubView({ list });
    expect(view.ctaDrawCs).toBe("Vylosuj mi knihu");
    expect(view.ctaWeakCs).toBe("Nejslabší knihy");
    expect(view.books[0]!.href).toContain("/app/literature/");
    void emptyFields;
  });
});
