import { describe, expect, it } from "vitest";
import {
  assertStoryPackIntegrity,
  parseStoryPack,
  safeResolveEvidenceText,
  type StoryPack,
} from "@/domain/learning/story-mode";

function minimalPack(overrides?: Partial<StoryPack>): StoryPack {
  const evidence = {
    a: {
      qaItemId: "q1",
      knowledgeUnitId: "k1",
      publishedStatement: "Josef Dobrovský zakladatel slavistiky.",
      validationStatus: "verified_from_source" as const,
      filename: "Národní obrození v Čechách.docx",
    },
    b: {
      qaItemId: "q2",
      knowledgeUnitId: "k2",
      publishedStatement: "Tradičně bývá literární historií děleno do 4 etap.",
      validationStatus: "verified_from_source" as const,
      filename: "Národní obrození v Čechách.docx",
    },
    c: {
      qaItemId: "q3",
      knowledgeUnitId: "k3",
      publishedStatement: "Vyhlásil němčinu za jediný úřední jazyk.",
      validationStatus: "corrected" as const,
      filename: "Národní obrození v Čechách.docx",
    },
    d: {
      qaItemId: "q4",
      knowledgeUnitId: "k4",
      publishedStatement: "Češtinu používal pouze venkovský lid.",
      validationStatus: "verified_from_source" as const,
      filename: "Národní obrození v Čechách.docx",
    },
  };

  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    slug: "test-story",
    title: "Test",
    topicSlug: "narodni-obrozeni",
    curriculumSlug: "cjl-beta",
    summary: "Test pack",
    evidence,
    requiresVerifiedOnly: true,
    beats: [
      {
        type: "timeline",
        id: "6ba7b810-9dad-41d1-80b4-00c04fd430c1",
        title: "T1",
        eraLabelEvidenceId: "b",
        bodyEvidenceIds: ["b"],
      },
      {
        type: "cause_effect",
        id: "6ba7b810-9dad-41d1-80b4-00c04fd430c2",
        title: "CE",
        causeEvidenceIds: ["c"],
        effectEvidenceIds: ["d"],
      },
      {
        type: "person_card",
        id: "6ba7b810-9dad-41d1-80b4-00c04fd430c3",
        title: "Josef Dobrovský",
        nameEvidenceId: "a",
        roleEvidenceIds: ["a"],
      },
      {
        type: "what_next",
        id: "6ba7b810-9dad-41d1-80b4-00c04fd430c4",
        title: "WN",
        prompt: "Co dál?",
        options: [
          { label: "4 etapy", isCorrect: true, evidenceIds: ["b"] },
          { label: "Nic", isCorrect: false, evidenceIds: [] },
        ],
      },
      {
        type: "decision_moment",
        id: "6ba7b810-9dad-41d1-80b4-00c04fd430c5",
        title: "DM",
        situationEvidenceIds: ["c"],
        outcomeEvidenceIds: ["d"],
        reflectionPrompt: "Proč?",
      },
      {
        type: "checkpoint",
        id: "6ba7b810-9dad-41d1-80b4-00c04fd430c6",
        title: "CP",
        items: [
          {
            question: "Kolik etap?",
            choices: ["4", "2"],
            correctIndex: 0,
            evidenceIds: ["b"],
            explanationEvidenceIds: ["b"],
          },
          {
            question: "Kdo je Dobrovský?",
            choices: ["slavistika", "Mácha"],
            correctIndex: 0,
            evidenceIds: ["a"],
            explanationEvidenceIds: ["a"],
          },
        ],
      },
    ],
    createdAt: "2026-07-20T12:00:00.000Z",
    updatedAt: "2026-07-20T12:00:00.000Z",
    ...overrides,
  };
}

describe("Story Mode integrity", () => {
  it("accepts a verified-only pack with all beat types", () => {
    expect(() => assertStoryPackIntegrity(minimalPack())).not.toThrow();
    expect(parseStoryPack(minimalPack()).slug).toBe("test-story");
  });

  it("rejects unverified evidence", () => {
    const pack = minimalPack();
    expect(() =>
      assertStoryPackIntegrity({
        ...pack,
        evidence: {
          ...pack.evidence,
          a: {
            ...pack.evidence.a!,
            validationStatus: "needs_fact_check",
          } as unknown as StoryPack["evidence"][string],
        },
      }),
    ).toThrow(/verified/);
  });

  it("rejects what_next correct option without evidence", () => {
    const pack = minimalPack();
    const beat = pack.beats.find((b) => b.type === "what_next")!;
    if (beat.type === "what_next") {
      beat.options[0]!.evidenceIds = [];
    }
    expect(() => assertStoryPackIntegrity(pack)).toThrow(/evidence/);
  });

  it("safeResolveEvidenceText skips missing ids instead of throwing", () => {
    const pack = minimalPack();
    expect(safeResolveEvidenceText(pack, ["a", "missing", "b"])).toEqual([
      pack.evidence.a!.publishedStatement,
      pack.evidence.b!.publishedStatement,
    ]);
  });
});
