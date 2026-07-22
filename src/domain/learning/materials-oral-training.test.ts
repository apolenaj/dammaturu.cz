import { describe, expect, it } from "vitest";
import {
  MATERIALS_ORAL_LOW_CONFIDENCE_CS,
  analyzeOralStructure,
  buildMaterialsOralReport,
  buildMaterialsOralSelectView,
  materialsOralModeLabelsCs,
  materialsOralModes,
  type MaterialsOralPrompt,
} from "@/domain/learning/materials-oral-training";
import { evaluateOpenAnswer } from "@/domain/learning/open-answer-eval";
import { buildMaterialsOralSession } from "@/server/learner-materials/materials-oral-build";
import type { LearnerMaterial } from "@/domain/learning/learner-materials";
import type { LearnerKnowledgeUnit } from "@/domain/learning/learner-knowledge";

function unit(partial: Partial<LearnerKnowledgeUnit> & { id: string; title: string }): LearnerKnowledgeUnit {
  return {
    kind: "concept",
    statement: partial.statement ?? "Romantismus klade důraz na cit a individualitu.",
    grounded: {
      topic: partial.grounded?.topic ?? "Romantismus",
      concept: "romantismus",
      definition: "Směr 1. poloviny 19. století.",
      importantFact: "Důraz na cit.",
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
        "Romantismus klade důraz na cit a individualitu. Směr 1. poloviny 19. století.",
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
    byteSize: 100,
    contentSha256: "a".repeat(64),
    storageFilename: "notes.txt",
    status: "ready",
    statusMessage: null,
    plainTextLength: 200,
    chunkCount: 1,
    topicCount: 1,
    knowledgePointCount: units.length,
    knowledgeUnits: units,
    createdAt: "2026-07-20T12:00:00.000Z",
    updatedAt: "2026-07-20T12:00:00.000Z",
    processedAt: "2026-07-20T12:00:00.000Z",
  };
}

const samplePrompt = (): MaterialsOralPrompt => ({
  id: "33333333-3333-3333-3333-333333333333",
  mode: "question_drill",
  topicCs: "Romantismus",
  questionCs: "Ústně vysvětli romantismus podle materiálu.",
  idealOutlineCs: "• Romantismus klade důraz na cit\n• 1. polovina 19. století",
  keyPoints: [
    { id: "k1", label: "cit", required: true },
    { id: "k2", label: "individualitu", required: true },
    { id: "k3", label: "19", required: true },
  ],
  citations: [
    {
      documentId: "11111111-1111-1111-1111-111111111111",
      documentTitle: "Školní zápisky",
      chunkId: "22222222-2222-2222-2222-222222222222",
      knowledgeUnitId: "44444444-4444-4444-4444-444444444444",
      pageStart: 1,
      pageEnd: 1,
      sectionPath: [],
      headingPath: null,
      sourceText: "Romantismus klade důraz na cit a individualitu.",
      sourceRef: null,
    },
  ],
  confidence: "verified_from_source",
  knowledgeUnitIds: ["44444444-4444-4444-4444-444444444444"],
  materialId: "11111111-1111-1111-1111-111111111111",
  materialTitle: "Školní zápisky",
  sourceHref: "/app/materials/11111111-1111-1111-1111-111111111111/study",
  prepSeconds: 60,
  hideHints: true,
});

describe("materials-oral-training", () => {
  it("exposes five Czech modes without national oral rules branding", () => {
    expect([...materialsOralModes]).toEqual([
      "question_drill",
      "full_topic",
      "random_topic",
      "weak_spots",
      "quick_review",
    ]);
    expect(materialsOralModeLabelsCs.question_drill).toBe("Otázka nanečisto");
    expect(materialsOralModeLabelsCs.weak_spots).toBe("Moje slabiny");
    const select = buildMaterialsOralSelectView({
      materials: [],
      topics: [],
      hasWeakSpots: false,
    });
    expect(select.disclaimerCs.toLowerCase()).toMatch(/školní|materiál/);
    expect(select.disclaimerCs.toLowerCase()).not.toMatch(/cermat ústní katalog/);
  });

  it("builds session prompts only from material KUs", () => {
    const m = material([
      unit({
        id: "44444444-4444-4444-4444-444444444444",
        title: "Romantismus",
      }),
    ]);
    const session = buildMaterialsOralSession({
      mode: "question_drill",
      materials: [m],
    });
    expect("error" in session).toBe(false);
    if ("error" in session) return;
    expect(session.prompts.length).toBe(1);
    expect(session.prompts[0]!.idealOutlineCs).toMatch(/Romantismus|cit/);
    expect(session.prompts[0]!.citations[0]!.sourceText.length).toBeGreaterThan(10);
  });

  it("reports low confidence instead of fake certainty", () => {
    const prompt = {
      ...samplePrompt(),
      confidence: "needs_review" as const,
      keyPoints: [{ id: "k1", label: "cit", required: true }],
    };
    const report = buildMaterialsOralReport({
      prompt,
      studentAnswer: "Něco o literatuře.",
      openEvaluation: null,
      evaluationConfidence: "needs_review",
    });
    expect(report.lowConfidence).toBe(true);
    expect(report.result).toBe("insufficient");
    expect(report.lowConfidenceNoteCs).toBe(MATERIALS_ORAL_LOW_CONFIDENCE_CS);
    expect(report.expectedKeyPoints.length).toBeGreaterThan(0);
  });

  it("identifies correct/missing points from source rubric", () => {
    const prompt = samplePrompt();
    const open = evaluateOpenAnswer({
      studentAnswer:
        "Romantismus klade důraz na cit a individualitu v 19. století. Je to literární směr.",
      keyIdeas: prompt.keyPoints.map((k) => ({
        id: k.id,
        label: k.label,
        synonyms: [],
        required: true,
      })),
      idealAnswer: prompt.idealOutlineCs,
      sourceEvidence: {
        quote: prompt.citations[0]!.sourceText,
        sourceLabel: prompt.materialTitle,
      },
    });
    const report = buildMaterialsOralReport({
      prompt,
      studentAnswer:
        "Romantismus klade důraz na cit a individualitu v 19. století. Je to literární směr.",
      openEvaluation: open,
      evaluationConfidence: "verified_from_source",
    });
    expect(report.lowConfidence).toBe(false);
    expect(report.correctKeyPoints.length).toBeGreaterThan(0);
    expect(report.retryWithoutHintsAvailable).toBe(true);
    expect(report.sourceHref).toContain("/app/materials/");
  });

  it("flags unclear oral structure", () => {
    expect(analyzeOralStructure("ok").flag).toBe("too_short");
    expect(
      analyzeOralStructure(
        "První myšlenka je jasná. Druhá věta rozvíjí téma podle materiálu a shrnuje závěr.",
      ).flag,
    ).toBe("ok");
  });
});
