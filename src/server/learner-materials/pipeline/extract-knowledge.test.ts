import { describe, expect, it } from "vitest";
import { extractGroundedKnowledgeUnits } from "@/server/learner-materials/pipeline/extract-knowledge";
import { flagAmbiguousKnowledgeUnits } from "@/server/learner-materials/pipeline/flag-knowledge";
import type { MaterialChunk } from "@/domain/learning/learner-materials";

const DOC = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function chunk(
  id: string,
  text: string,
  extras?: Partial<MaterialChunk>,
): MaterialChunk {
  return {
    id,
    chunkIndex: 0,
    text,
    sectionPath: extras?.sectionPath ?? ["Romantismus"],
    headingPath: extras?.headingPath ?? "Romantismus",
    pageStart: extras?.pageStart ?? 1,
    pageEnd: extras?.pageEnd ?? 1,
    sourceRef: extras?.sourceRef ?? `material:${DOC}|chunk:0|page:1`,
    ...extras,
  };
}

describe("grounded knowledge extraction", () => {
  it("extracts author, years, work, movement, definition with provenance", () => {
    const chunks = [
      chunk(
        "11111111-1111-1111-1111-111111111111",
        [
          "Karel Hynek Mácha (1810–1836)",
          "Mácha napsal Máj.",
          "Romantismus je literární směr zdůrazňující cit a individualitu.",
          "Mácha patří k romantismu.",
        ].join("\n"),
      ),
    ];

    const units = extractGroundedKnowledgeUnits({
      documentId: DOC,
      chunks,
      topics: [{ id: "t1", title: "Romantismus", source: "heading" }],
    });

    expect(units.length).toBeGreaterThanOrEqual(3);

    const person = units.find((u) => u.kind === "person");
    expect(person?.grounded.author).toBe("Karel Hynek Mácha");
    expect(person?.grounded.datePeriod).toBe("1810–1836");
    expect(person?.provenance.documentId).toBe(DOC);
    expect(person?.provenance.sourceText).toContain("Mácha");
    expect(person?.provenance.pageStart).toBe(1);
    expect(person?.confidence).toBeGreaterThan(0);
    expect(person?.reviewStatus).toBe("needs_review");

    const work = units.find((u) => u.kind === "work");
    expect(work?.grounded.literaryWork).toMatch(/Máj/i);
    expect(work?.grounded.author).toMatch(/Mácha/i);
    expect(work?.grounded.relationshipType).toBe("authored");

    const def = units.find(
      (u) => u.grounded.definition || u.kind === "term" || u.kind === "concept",
    );
    expect(def?.grounded.definition || def?.statement).toMatch(/Romantismus/i);
    expect(def?.grounded.topic).toBe("Romantismus");
  });

  it("does not invent facts from vague prose", () => {
    const units = extractGroundedKnowledgeUnits({
      documentId: DOC,
      chunks: [
        chunk(
          "22222222-2222-2222-2222-222222222222",
          "Dnes je hezké počasí a večer půjdeme ven. Nic literárního tu není.",
        ),
      ],
      topics: [{ id: "t1", title: "Poznámky", source: "document" }],
    });
    expect(units).toEqual([]);
  });

  it("flags conflicting biographical years instead of inventing certainty", () => {
    const raw = extractGroundedKnowledgeUnits({
      documentId: DOC,
      chunks: [
        chunk(
          "33333333-3333-3333-3333-333333333333",
          "Karel Hynek Mácha (1810–1836)",
        ),
        chunk(
          "44444444-4444-4444-4444-444444444444",
          "Karel Hynek Mácha (1810–1840)",
          {
            chunkIndex: 1,
            pageStart: 2,
            pageEnd: 2,
            sourceRef: `material:${DOC}|chunk:1|page:2`,
          },
        ),
      ],
      topics: [{ id: "t1", title: "Romantismus", source: "heading" }],
    });

    const flagged = flagAmbiguousKnowledgeUnits(raw);
    expect(flagged.length).toBeGreaterThanOrEqual(2);
    const conflicted = flagged.filter((u) => u.flags.includes("conflicting"));
    expect(conflicted.length).toBeGreaterThanOrEqual(1);
    for (const u of conflicted) {
      expect(u.reviewStatus).toBe("needs_review");
      expect(u.confidence).toBeLessThan(0.5);
    }
  });

  it("sets exam relevance only when source signals support it", () => {
    const withSignal = extractGroundedKnowledgeUnits({
      documentId: DOC,
      chunks: [
        chunk(
          "55555555-5555-5555-5555-555555555555",
          "Pro maturitu je důležité, že Máj vyšel roku 1836 a patří k romantismu.",
        ),
      ],
      topics: [{ id: "t1", title: "Máj", source: "heading" }],
    });
    expect(withSignal.length).toBeGreaterThanOrEqual(1);
    expect(
      withSignal.some(
        (u) =>
          u.examRelevance === "high" || u.examRelevance === "medium",
      ),
    ).toBe(true);

    const noSignal = extractGroundedKnowledgeUnits({
      documentId: DOC,
      chunks: [
        chunk(
          "66666666-6666-6666-6666-666666666666",
          "Večer jsme četli noviny a potom šli spát bez dalších podrobností.",
        ),
      ],
      topics: [{ id: "t1", title: "X", source: "document" }],
    });
    expect(noSignal).toEqual([]);
  });
});
