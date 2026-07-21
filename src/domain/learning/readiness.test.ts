import { describe, expect, it } from "vitest";
import {
  attemptsNeededCs,
  buildReadinessSnapshot,
  computeTrend,
  confidenceFromEvidence,
  dimensionEvidenceThresholds,
  formatWeekDeltaCs,
  readinessDisclaimerCs,
  stateWithScore,
  type ReadinessBook,
  type ReadinessHistoryPoint,
} from "@/domain/learning/readiness";
import { buildDemoReadinessBook } from "@/server/readiness/seed";

describe("evidence-based readiness", () => {
  const NOW = "2026-07-20T12:00:00.000Z";

  it("withholds confident overall % without enough evidence", () => {
    const book: ReadinessBook = {
      learnerId: "x",
      updatedAt: NOW,
      weeklyHistory: [],
      units: [
        {
          id: "ku-a",
          title: "A",
          areaId: "jazyk",
          examWeight: 1,
          state: stateWithScore("ku-a", 80, NOW, 2),
        },
      ],
    };
    const snap = buildReadinessSnapshot(book, NOW, {
      didacticEvidenceCount: 2,
      didacticAccuracyPct: 80,
      oralEvidenceCount: 0,
      oralScorePct: null,
      writingEvidenceCount: 0,
      writingScorePct: null,
      materialsEvidenceCount: 0,
      materialsScorePct: null,
      retentionEvidenceCount: 0,
      retentionScorePct: null,
      consistencyEvidenceCount: 0,
      consistencyScorePct: null,
      history: [],
    });
    expect(snap.overall.scorePct).toBeNull();
    expect(snap.overall.confidence).toBe("insufficient");
    expect(snap.overall.messageCs).toMatch(/Potřebujeme ještě/);
    expect(snap.labeledAs).toBe("evidence_readiness");
    expect(snap.disclaimerCs).toBe(readinessDisclaimerCs);
  });

  it("shows overall % when multiple dimensions have enough evidence", () => {
    const book = buildDemoReadinessBook("learner", NOW);
    const snap = buildReadinessSnapshot(book, NOW, {
      didacticEvidenceCount: 20,
      didacticAccuracyPct: 70,
      oralEvidenceCount: 4,
      oralScorePct: 62,
      writingEvidenceCount: 5,
      writingScorePct: 55,
      materialsEvidenceCount: 6,
      materialsScorePct: 60,
      retentionEvidenceCount: 10,
      retentionScorePct: 68,
      consistencyEvidenceCount: 8,
      consistencyScorePct: 75,
      history: [],
    });
    expect(snap.overall.scorePct).not.toBeNull();
    expect(snap.overall.scorePct).toBeGreaterThan(40);
    expect(snap.overall.scorePct).toBeLessThan(90);
    expect(snap.dimensions).toHaveLength(6);
    expect(snap.dimensions.every((d) => d.scorePct != null)).toBe(true);
  });

  it("dimension messages ask for more attempts when insufficient", () => {
    expect(attemptsNeededCs(3)).toBe(
      "Potřebujeme ještě 3 pokusy pro spolehlivější odhad.",
    );
    expect(attemptsNeededCs(1)).toMatch(/1 pokus/);
    expect(
      confidenceFromEvidence(2, dimensionEvidenceThresholds.didactic_test),
    ).toBe("insufficient");
    expect(
      confidenceFromEvidence(20, dimensionEvidenceThresholds.didactic_test),
    ).toBe("moderate");
  });

  it("computes improving / declining / stable trends", () => {
    const hist = (pcts: number[]): ReadinessHistoryPoint[] =>
      pcts.map((p, i) => ({
        at: `2026-07-${String(10 + i).padStart(2, "0")}T12:00:00.000Z`,
        formulaVersion: "2026.07-evidence-v1",
        provisionalPct: p,
        overallPct: p,
        confidence: "moderate" as const,
        trend: "stable" as const,
        dimensions: {},
        totalEvidence: 20,
      }));

    expect(computeTrend(hist([50, 52, 55, 60]), 62).trend).toBe("improving");
    expect(computeTrend(hist([70, 68, 65, 60]), 58).trend).toBe("declining");
    expect(computeTrend(hist([60, 61, 60, 62]), 61).trend).toBe("stable");
    expect(computeTrend([], null).trend).toBe("unknown");
  });

  it("keeps curriculum area bars from mastery book", () => {
    const book = buildDemoReadinessBook("learner", NOW);
    const snap = buildReadinessSnapshot(book, NOW);
    expect(snap.areas).toHaveLength(4);
    expect(snap.weakAreas[0]!.id).toBe("rozbory");
    expect(formatWeekDeltaCs(snap.weekDeltaPct)).toMatch(/% tento týden/);
  });

  it("never claims P(pass) in disclaimer", () => {
    const book = buildDemoReadinessBook("learner", NOW);
    const snap = buildReadinessSnapshot(book, NOW);
    expect(snap.disclaimerCs.toLowerCase()).toMatch(
      /predikce|šance|maturity/,
    );
  });
});
