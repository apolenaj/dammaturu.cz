import { describe, expect, it } from "vitest";
import {
  BETA_EXPERIMENT_FRAMING,
  buildExperimentReport,
  classifyRetentionWindow,
  createEmptyExperimentBook,
  daysBetween,
  pickCheckpointQuestions,
  planAdherencePct,
  weekKeyFromDateKey,
} from "@/domain/learning/beta-experiment";

describe("beta-experiment N=1 framing", () => {
  it("declares N=1 validation, not scientific proof", () => {
    expect(BETA_EXPERIMENT_FRAMING.design).toBe("N=1 beta validation");
    expect(BETA_EXPERIMENT_FRAMING.n).toBe(1);
    expect(BETA_EXPERIMENT_FRAMING.noFalseStatsCs.length).toBeGreaterThan(20);
  });
});

describe("retention windows", () => {
  it("classifies immediate / 1d / 3d / 7d / 14d", () => {
    expect(classifyRetentionWindow(0.01)).toBe("immediate");
    expect(classifyRetentionWindow(1)).toBe("1d");
    expect(classifyRetentionWindow(3)).toBe("3d");
    expect(classifyRetentionWindow(7)).toBe("7d");
    expect(classifyRetentionWindow(14)).toBe("14d");
    expect(classifyRetentionWindow(20)).toBeNull();
  });

  it("computes day deltas", () => {
    expect(
      daysBetween("2026-07-01T12:00:00.000Z", "2026-07-08T12:00:00.000Z"),
    ).toBe(7);
  });
});

describe("pickCheckpointQuestions", () => {
  const qs = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      kind: "single_choice",
      knowledgeUnits: [{ id: "ku-a" }],
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      kind: "long_answer",
      knowledgeUnits: [{ id: "ku-a" }],
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      kind: "error_spotting",
      knowledgeUnits: [{ id: "ku-b" }],
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      kind: "true_false",
      knowledgeUnits: [{ id: "ku-c" }],
    },
  ];

  it("excludes seen questions and prefers transfer + KU overlap", () => {
    const { questionIds, transferQuestionIds } = pickCheckpointQuestions({
      questions: qs,
      excludeQuestionIds: new Set([qs[0]!.id]),
      preferKuIds: new Set(["ku-a"]),
      maxQuestions: 3,
      preferTransfer: true,
    });
    expect(questionIds).not.toContain(qs[0]!.id);
    expect(questionIds[0]).toBe(qs[1]!.id);
    expect(transferQuestionIds).toContain(qs[1]!.id);
  });
});

describe("plan adherence + report honesty", () => {
  it("caps adherence at 100", () => {
    expect(planAdherencePct(40, 25)).toBe(100);
    expect(planAdherencePct(10, 25)).toBe(40);
  });

  it("builds report with caveats and no false significance", () => {
    const book = createEmptyExperimentBook({
      learnerId: "learner1",
      targetDate: "2026-08-31",
      nowIso: "2026-07-21T10:00:00.000Z",
    });
    book.baseline = {
      startedAt: "2026-07-21T09:00:00.000Z",
      completedAt: "2026-07-21T09:30:00.000Z",
      durationMinutes: 30,
      diagnosticAccuracyPct: 40,
      diagnosticAttempts: 8,
      diagnosticCorrect: 3,
      overallMasteryPct: 10,
      topicMastery: [
        { topicId: "literarni-smery", title: "Literární směry", masteryPct: 10 },
      ],
      confidence: 3,
      packSlug: "cjl-otazky",
      objectiveKuIds: ["ku-1"],
    };
    book.methodStats[0]!.attempts = 5;
    book.methodStats[0]!.correct = 4;
    book.methodStats[0]!.scoreSum = 4;
    book.methodStats[0]!.accuracyPct = 80;
    book.methodStats[1]!.attempts = 5;
    book.methodStats[1]!.correct = 1;
    book.methodStats[1]!.scoreSum = 1;
    book.methodStats[1]!.accuracyPct = 20;

    const report = buildExperimentReport({
      book,
      displayName: "Tester",
      currentTopicMastery: [
        { topicId: "literarni-smery", title: "Literární směry", masteryPct: 55 },
        { topicId: "jazyk", title: "Jazyk", masteryPct: 12 },
      ],
      currentOverallMasteryPct: 40,
      recentAccuracyPct: 62,
      nowIso: "2026-07-21T12:00:00.000Z",
    });

    expect(report.framing).toBe("N=1 beta validation");
    expect(report.n).toBe(1);
    expect(report.topImprovements[0]?.deltaPct).toBe(45);
    expect(report.topWeaknesses[0]?.title).toBe("Jazyk");
    expect(report.caveatsCs.some((c) => c.includes("statistick"))).toBe(true);
    expect(report.mostEffectiveMethods[0]?.accuracyPct).toBe(80);
  });

  it("formats week keys", () => {
    expect(weekKeyFromDateKey("2026-07-21")).toMatch(/^2026-W\d{2}$/);
  });
});
