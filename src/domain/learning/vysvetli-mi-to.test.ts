import { describe, expect, it } from "vitest";
import { INSUFFICIENT_EVIDENCE_CS } from "@/domain/learning/grounded-study";
import {
  compareFromEvidence,
  insufficientVysvetliResponse,
  mnemonicFromSourceTokens,
  simplifyParagraphFromSource,
  summarizeFromEvidence,
  vysvetliTaskLabelsCs,
  vysvetliTasks,
} from "@/domain/learning/vysvetli-mi-to";
import {
  resolveVysvetliAiStatus,
  runVysvetliAssistant,
} from "@/server/learner-materials/vysvetli-engine";
import type { LearnerMaterial } from "@/domain/learning/learner-materials";
import type { LearnerKnowledgeUnit } from "@/domain/learning/learner-knowledge";

function unit(
  partial: Partial<LearnerKnowledgeUnit> & { id: string; title: string },
): LearnerKnowledgeUnit {
  return {
    kind: "concept",
    statement:
      partial.statement ??
      "Romantismus klade důraz na cit a individualitu autora.",
    grounded: {
      topic: "Romantismus",
      concept: "romantismus",
      definition: "Literární směr 1. poloviny 19. století.",
      ...partial.grounded,
    },
    provenance: {
      documentId: "11111111-1111-1111-1111-111111111111",
      chunkId: "22222222-2222-2222-2222-222222222222",
      sourceRef: "p.1",
      pageStart: 1,
      pageEnd: 1,
      sectionPath: ["Literatura"],
      headingPath: "Romantismus",
      sourceText:
        partial.provenance?.sourceText ??
        "Romantismus klade důraz na cit a individualitu autora. Literární směr 1. poloviny 19. století.",
      confidence: 0.9,
    },
    flags: [],
    flagNotes: [],
    reviewStatus: "needs_review",
    importance: 4,
    difficulty: 3,
    examRelevance: "high",
    confidence: 0.9,
    tags: [],
    ...partial,
  };
}

function material(units: LearnerKnowledgeUnit[]): LearnerMaterial {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    learnerId: "learner1",
    title: "Školní zápisky",
    originalFilename: "notes.txt",
    format: "txt",
    mimeType: "text/plain",
    byteSize: 200,
    contentSha256: "a".repeat(64),
    storageFilename: "notes.txt",
    status: "ready",
    statusMessage: null,
    plainTextLength: 200,
    chunkCount: 1,
    topicCount: 1,
    knowledgePointCount: units.length,
    knowledgeUnits: units,
    chunks: [
      {
        id: "22222222-2222-2222-2222-222222222222",
        chunkIndex: 0,
        text: "Romantismus klade důraz na cit a individualitu autora. Literární směr 1. poloviny 19. století.",
        pageStart: 1,
        pageEnd: 1,
        sectionPath: ["Literatura"],
        headingPath: "Romantismus",
      },
    ],
    createdAt: "2026-07-20T12:00:00.000Z",
    updatedAt: "2026-07-20T12:00:00.000Z",
    processedAt: "2026-07-20T12:00:00.000Z",
  };
}

describe("Vysvětli mi to", () => {
  it("exposes all allowed tasks and exact insufficient copy", () => {
    expect([...vysvetliTasks]).toContain("explain_paragraph");
    expect([...vysvetliTasks]).toContain("mnemonic");
    expect(vysvetliTaskLabelsCs.summarize_topic).toMatch(/Shrň/);
    expect(INSUFFICIENT_EVIDENCE_CS).toBe(
      "V dostupných materiálech to nemám dostatečně podložené.",
    );
    expect(insufficientVysvetliResponse("give_example").bodyCs).toBe(
      INSUFFICIENT_EVIDENCE_CS,
    );
  });

  it("summarizes only from retrieved material evidence with citations", () => {
    const m = material([
      unit({
        id: "44444444-4444-4444-4444-444444444444",
        title: "Romantismus",
      }),
    ]);
    const res = runVysvetliAssistant({
      request: {
        task: "summarize_topic",
        query: "romantismus cit",
        materialIds: [m.id],
        includeApprovedCatalog: false,
      },
      materials: [m],
      catalogEntries: [],
      aiStatus: "disabled",
    });
    expect(res.insufficient).toBe(false);
    expect(res.bodyCs.toLowerCase()).toMatch(/romantismus|cit/);
    expect(res.citations.length).toBeGreaterThan(0);
    expect(res.citations[0]!.sourceKind).toBe("uploaded_material");
    expect(res.aiStatus).toBe("disabled");
  });

  it("refuses unsupported exam facts outside sources", () => {
    const m = material([
      unit({
        id: "44444444-4444-4444-4444-444444444444",
        title: "Romantismus",
      }),
    ]);
    const res = runVysvetliAssistant({
      request: {
        task: "summarize_topic",
        query: "kvadratická rovnice derivace integral",
        materialIds: [m.id],
        includeApprovedCatalog: false,
      },
      materials: [m],
      catalogEntries: [],
      aiStatus: "not_used",
    });
    expect(res.insufficient).toBe(true);
    expect(res.bodyCs).toBe(INSUFFICIENT_EVIDENCE_CS);
  });

  it("builds mnemonic only from source tokens", () => {
    const mnemo = mnemonicFromSourceTokens(
      "Romantismus klade důraz na cit individualitu autora století",
      "romantismus",
    );
    expect(mnemo).toBeTruthy();
    expect(mnemo!).toMatch(/Zapamatuj si/);
    expect(mnemonicFromSourceTokens("a b")).toBeNull();
  });

  it("compares only when both sides have evidence", () => {
    expect(
      compareFromEvidence({
        conceptA: "A",
        conceptB: "B",
        snippetsA: ["text a"],
        snippetsB: [],
      }),
    ).toBe(INSUFFICIENT_EVIDENCE_CS);
    expect(
      summarizeFromEvidence(["Bod jedna ze zdroje."], "téma"),
    ).toMatch(/Shrnutí/);
    expect(simplifyParagraphFromSource("První věta ze zdroje je jasná. Druhá věta doplňuje kontext materiálu.")).toMatch(/Jednoduše/);
  });

  it("AI status degrades without blocking core", () => {
    expect(
      resolveVysvetliAiStatus({
        aiExplanationsEntitled: false,
        aiProviderAvailable: false,
      }),
    ).toBe("not_entitled");
    expect(
      resolveVysvetliAiStatus({
        aiExplanationsEntitled: true,
        aiProviderAvailable: false,
      }),
    ).toBe("unavailable");
  });

  it("explains why an answer is wrong against source", () => {
    const m = material([
      unit({
        id: "44444444-4444-4444-4444-444444444444",
        title: "Romantismus",
      }),
    ]);
    const res = runVysvetliAssistant({
      request: {
        task: "why_wrong",
        query: "romantismus",
        studentAnswer: "Shakespeare napsal Hamleta v roce 1599.",
        materialIds: [m.id],
        includeApprovedCatalog: false,
      },
      materials: [m],
      catalogEntries: [],
      aiStatus: "not_used",
    });
    expect(res.insufficient).toBe(false);
    expect(res.bodyCs.toLowerCase()).toMatch(/proč|chybí|správně|zdroj/);
  });
});
