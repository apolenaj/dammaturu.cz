import { describe, expect, it } from "vitest";
import {
  INSUFFICIENT_EVIDENCE_CS,
  extractKeyPhrasesFromSource,
  mapEvidenceConfidence,
} from "@/domain/learning/grounded-study";
import type { LearnerKnowledgeUnit } from "@/domain/learning/learner-knowledge";
import type { LearnerMaterial } from "@/domain/learning/learner-materials";
import {
  buildGroundedStudySession,
  explainFromMaterials,
} from "@/server/learner-materials/grounded-generate";
import { gradeAgainstSource } from "@/server/learner-materials/grounded-grade";
import {
  hasSufficientEvidence,
  retrieveRelevantChunks,
} from "@/server/learner-materials/retrieve";

const DOC = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const CHUNK = "11111111-1111-1111-1111-111111111111";
const KU = "22222222-2222-2222-2222-222222222222";

function makeUnit(
  overrides: Partial<LearnerKnowledgeUnit> &
    Pick<LearnerKnowledgeUnit, "statement" | "title">,
): LearnerKnowledgeUnit {
  const { title, statement, grounded, provenance, flags, flagNotes, ...rest } =
    overrides;
  return {
    id: KU,
    kind: "person",
    title,
    statement,
    grounded: {
      topic: "Romantismus",
      subtopic: null,
      definition: null,
      author: "Karel Hynek Mácha",
      literaryWork: "Máj",
      literaryMovement: "Romantismus",
      datePeriod: "1810–1836",
      concept: null,
      relationshipType: "authored",
      relationshipSubject: "Karel Hynek Mácha",
      relationshipObject: "Máj",
      importantFact: statement,
      examRelevance: "high",
      ...grounded,
    },
    provenance: {
      documentId: DOC,
      chunkId: CHUNK,
      sourceRef: `material:${DOC}|chunk:0|page:1`,
      pageStart: 1,
      pageEnd: 1,
      sectionPath: ["Romantismus"],
      headingPath: "Romantismus",
      sourceText: statement,
      confidence: 0.62,
      ...provenance,
    },
    flags: flags ?? [],
    flagNotes: flagNotes ?? [],
    reviewStatus: "needs_review",
    importance: 4,
    difficulty: 2,
    examRelevance: "high",
    confidence: 0.62,
    tags: ["cjl"],
    ...rest,
  };
}

function makeMaterial(units: LearnerKnowledgeUnit[]): LearnerMaterial {
  const now = new Date().toISOString();
  return {
    id: DOC,
    learnerId: "study_learner",
    title: "ČJL poznámky",
    originalFilename: "cjl.txt",
    format: "txt",
    mimeType: "text/plain",
    byteSize: 100,
    contentSha256: "a".repeat(64),
    storageFilename: `${DOC}.txt`,
    status: "ready",
    statusMessage: "ok",
    plainTextLength: 200,
    chunkCount: 1,
    topicCount: 1,
    knowledgePointCount: units.length,
    topics: [{ id: "t1", title: "Romantismus", source: "heading" }],
    knowledgeUnits: units,
    chunks: [
      {
        id: CHUNK,
        chunkIndex: 0,
        text: units.map((u) => u.statement).join("\n"),
        pageStart: 1,
        pageEnd: 1,
        sectionPath: ["Romantismus"],
        headingPath: "Romantismus",
        sourceRef: `material:${DOC}|chunk:0|page:1`,
      },
    ],
    createdAt: now,
    updatedAt: now,
    processedAt: now,
  };
}

describe("confidence mapping", () => {
  it("maps verified / likely / needs_review", () => {
    expect(
      mapEvidenceConfidence({
        confidence: 0.62,
        flags: [],
        hasSourceText: true,
      }),
    ).toBe("verified_from_source");
    expect(
      mapEvidenceConfidence({
        confidence: 0.45,
        flags: ["low_confidence"],
        hasSourceText: true,
      }),
    ).toBe("likely");
    expect(
      mapEvidenceConfidence({
        confidence: 0.7,
        flags: ["conflicting"],
        hasSourceText: true,
      }),
    ).toBe("needs_review");
    expect(
      mapEvidenceConfidence({
        confidence: 0.9,
        flags: [],
        hasSourceText: false,
      }),
    ).toBe("insufficient");
  });
});

describe("retrieval + grounded explain", () => {
  it("retrieves matching chunks and refuses when evidence is missing", () => {
    const material = makeMaterial([
      makeUnit({
        title: "Mácha",
        statement: "Karel Hynek Mácha (1810–1836) napsal Máj.",
      }),
    ]);

    const hits = retrieveRelevantChunks([material], "Mácha Máj romantismus");
    expect(hits.length).toBeGreaterThan(0);
    expect(hasSufficientEvidence(hits, [])).toBe(true);

    const ok = explainFromMaterials([material], "Co říká materiál o Máchovi?");
    expect(ok.insufficient).toBe(false);
    expect(ok.text).toContain("Mácha");
    expect(ok.citations[0]?.pageStart).toBe(1);
    expect(ok.citations[0]?.documentTitle).toBe("ČJL poznámky");

    const miss = explainFromMaterials(
      [material],
      "Jaký je vzorec kvadratické rovnice v matematice?",
    );
    expect(miss.insufficient).toBe(true);
    expect(miss.text).toBe(INSUFFICIENT_EVIDENCE_CS);
    expect(miss.confidence).toBe("insufficient");
  });
});

describe("study session generation", () => {
  it("builds items only from source-backed units and skips needs_review", () => {
    const session = buildGroundedStudySession([
      makeMaterial([
        makeUnit({
          title: "Mácha",
          statement: "Karel Hynek Mácha (1810–1836) napsal Máj.",
          confidence: 0.62,
        }),
        makeUnit({
          id: "33333333-3333-3333-3333-333333333333",
          title: "Konflikt",
          statement: "Karel Hynek Mácha (1810–1840)",
          confidence: 0.7,
          flags: ["conflicting", "ambiguous"],
        }),
      ]),
    ]);

    expect(session.items.length).toBe(1);
    expect(session.skippedNeedsReview).toBe(1);
    expect(session.items[0]!.confidence).toBe("verified_from_source");
    expect(session.items[0]!.citations[0]!.sourceText).toContain("Mácha");
  });
});

describe("source-grounded grading", () => {
  it("accepts answers grounded in source and refuses unsupported claims", () => {
    const session = buildGroundedStudySession([
      makeMaterial([
        makeUnit({
          title: "Mácha",
          statement: "Karel Hynek Mácha (1810–1836) napsal Máj.",
        }),
      ]),
    ]);
    const item = session.items[0]!;
    expect(extractKeyPhrasesFromSource(item.groundedAnswer).length).toBeGreaterThan(
      0,
    );

    const good = gradeAgainstSource({
      item,
      studentAnswer: "Mácha napsal Máj v letech 1810 až 1836.",
    });
    expect(["correct", "partial"]).toContain(good.result);
    expect(good.showInsufficientMessage).toBe(false);

    const bad = gradeAgainstSource({
      item,
      studentAnswer: "Shakespeare napsal Hamleta v roce 1599.",
    });
    expect(bad.unsupportedClaims.length).toBeGreaterThan(0);
    expect(
      bad.showInsufficientMessage ||
        bad.feedback.includes(INSUFFICIENT_EVIDENCE_CS),
    ).toBe(true);
  });
});
