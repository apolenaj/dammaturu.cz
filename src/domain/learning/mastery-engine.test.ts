import { describe, expect, it } from "vitest";
import {
  applyDecay,
  applyMasteryEvidence,
  bandFromScore,
  computeMasteryAggregate,
  emptyMasteryState,
  masteryConfig,
  MASTERY_TRANSPARENCY_DISCLAIMER_CS,
  toTransparentMasteryState,
} from "@/domain/learning/mastery-engine";

const KU = "ku-realismus-znaky";

describe("mastery-engine", () => {
  it("does not raise score on page_view — only introduces", () => {
    const r = applyMasteryEvidence(
      null,
      {
        kind: "page_view",
        at: "2026-07-20T12:00:00.000Z",
        difficulty: 3,
        hintsUsed: 0,
        speedRelevant: false,
        isTransfer: false,
      },
      KU,
    );
    expect(r.state.score).toBe(0);
    expect(r.state.band).toBe("introduced");
    expect(r.delta).toBe(0);
  });

  it("raises score on correct practice; hints reduce gain", () => {
    const base = applyMasteryEvidence(
      null,
      {
        kind: "practice",
        correctness: "correct",
        difficulty: 3,
        hintsUsed: 0,
        at: "2026-07-20T12:00:00.000Z",
        speedRelevant: false,
        isTransfer: false,
      },
      KU,
    );
    const withHints = applyMasteryEvidence(
      null,
      {
        kind: "practice",
        correctness: "correct",
        difficulty: 3,
        hintsUsed: 2,
        at: "2026-07-20T12:00:00.000Z",
        speedRelevant: false,
        isTransfer: false,
      },
      KU,
    );
    expect(base.state.score).toBeGreaterThan(withHints.state.score);
    expect(base.state.score).toBeGreaterThan(0);
    expect(base.state.band).not.toBe("not_seen");
  });

  it("applies diagnostic floor/ceiling", () => {
    const ok = applyMasteryEvidence(
      null,
      {
        kind: "diagnostic",
        correctness: "correct",
        difficulty: 3,
        hintsUsed: 0,
        at: "2026-07-20T12:00:00.000Z",
        speedRelevant: false,
        isTransfer: false,
      },
      KU,
    );
    expect(ok.state.score).toBeGreaterThanOrEqual(
      masteryConfig.diagnosticCorrectFloor,
    );

    const bad = applyMasteryEvidence(
      null,
      {
        kind: "diagnostic",
        correctness: "incorrect",
        difficulty: 3,
        hintsUsed: 0,
        at: "2026-07-20T12:00:00.000Z",
        speedRelevant: false,
        isTransfer: false,
      },
      KU,
    );
    expect(bad.state.score).toBeLessThanOrEqual(18);
  });

  it("rewards transfer success more than plain practice", () => {
    const plain = applyMasteryEvidence(
      emptyMasteryState(KU, "2026-07-20T12:00:00.000Z"),
      {
        kind: "practice",
        correctness: "correct",
        difficulty: 4,
        hintsUsed: 0,
        at: "2026-07-20T12:00:00.000Z",
        speedRelevant: false,
        isTransfer: false,
      },
    );
    const transfer = applyMasteryEvidence(
      emptyMasteryState(KU, "2026-07-20T12:00:00.000Z"),
      {
        kind: "transfer",
        correctness: "correct",
        difficulty: 4,
        hintsUsed: 0,
        at: "2026-07-20T12:00:00.000Z",
        speedRelevant: false,
        isTransfer: true,
      },
    );
    expect(transfer.state.score).toBeGreaterThan(plain.state.score);
    expect(transfer.state.transferSuccesses).toBe(1);
  });

  it("penalizes overconfident incorrect answers", () => {
    const seeded: ReturnType<typeof emptyMasteryState> = {
      ...emptyMasteryState(KU, "2026-07-20T12:00:00.000Z"),
      score: 50,
      band: "familiar",
      introducedAt: "2026-07-20T11:00:00.000Z",
      peakBand: "familiar",
      evidenceCount: 3,
      lastEvidenceAt: "2026-07-20T11:00:00.000Z",
      lastSuccessfulRecallAt: "2026-07-20T11:00:00.000Z",
    };
    const calm = applyMasteryEvidence(seeded, {
      kind: "practice",
      correctness: "incorrect",
      difficulty: 3,
      hintsUsed: 0,
      selfConfidence: 2,
      at: "2026-07-20T12:00:00.000Z",
      speedRelevant: false,
      isTransfer: false,
    });
    const cocky = applyMasteryEvidence(seeded, {
      kind: "practice",
      correctness: "incorrect",
      difficulty: 3,
      hintsUsed: 0,
      selfConfidence: 5,
      at: "2026-07-20T12:00:00.000Z",
      speedRelevant: false,
      isTransfer: false,
    });
    expect(cocky.state.score).toBeLessThan(calm.state.score);
  });

  it("applies speed adjustment when speedRelevant", () => {
    const fast = applyMasteryEvidence(
      emptyMasteryState(KU, "2026-07-20T12:00:00.000Z"),
      {
        kind: "speed",
        correctness: "correct",
        difficulty: 2,
        hintsUsed: 0,
        responseMs: 800,
        expectedMs: 4000,
        speedRelevant: true,
        isTransfer: false,
        at: "2026-07-20T12:00:00.000Z",
      },
    );
    const slow = applyMasteryEvidence(
      emptyMasteryState(KU, "2026-07-20T12:00:00.000Z"),
      {
        kind: "speed",
        correctness: "correct",
        difficulty: 2,
        hintsUsed: 0,
        responseMs: 15_000,
        expectedMs: 4000,
        speedRelevant: true,
        isTransfer: false,
        at: "2026-07-20T12:00:00.000Z",
      },
    );
    expect(fast.state.score).toBeGreaterThan(slow.state.score);
  });

  it("decays score after long gap and can mark at_risk", () => {
    let state = emptyMasteryState(KU, "2026-07-01T12:00:00.000Z");
    // Build up to familiar+
    for (let i = 0; i < 8; i += 1) {
      const r = applyMasteryEvidence(state, {
        kind: "practice",
        correctness: "correct",
        difficulty: 3,
        hintsUsed: 0,
        at: `2026-07-01T12:0${i}:00.000Z`,
        speedRelevant: false,
        isTransfer: false,
      });
      state = r.state;
    }
    expect(state.score).toBeGreaterThanOrEqual(
      masteryConfig.thresholds.familiar,
    );

    const decayed = applyDecay(state, "2026-08-01T12:00:00.000Z");
    expect(decayed.score).toBeLessThan(state.score);
    expect(decayed.band === "at_risk" || decayed.score < state.score).toBe(
      true,
    );
  });

  it("maps bands from score with mastered gates", () => {
    expect(
      bandFromScore(10, {
        evidenceCount: 1,
        retrievalEvidenceCount: 1,
        correctStreak: 0,
        transferSuccesses: 0,
        introducedAt: "2026-07-20T12:00:00.000Z",
        successfulRecalls: 0,
        delayedSuccessfulRecalls: 0,
      }),
    ).toBe("introduced");

    expect(
      bandFromScore(85, {
        evidenceCount: 2,
        retrievalEvidenceCount: 2,
        correctStreak: 1,
        transferSuccesses: 0,
        introducedAt: "2026-07-20T12:00:00.000Z",
        successfulRecalls: 2,
        delayedSuccessfulRecalls: 0,
      }),
    ).toBe("strong");

    expect(
      bandFromScore(85, {
        evidenceCount: 6,
        retrievalEvidenceCount: 5,
        correctStreak: 3,
        transferSuccesses: 0,
        introducedAt: "2026-07-20T12:00:00.000Z",
        successfulRecalls: 4,
        delayedSuccessfulRecalls: 1,
      }),
    ).toBe("mastered");
  });

  it("does not raise mastery from self_grade alone toward retrieval streak", () => {
    const r = applyMasteryEvidence(
      null,
      {
        kind: "self_grade",
        correctness: "correct",
        difficulty: 3,
        hintsUsed: 0,
        at: "2026-07-20T12:00:00.000Z",
        speedRelevant: false,
        isTransfer: false,
      },
      KU,
    );
    expect(r.state.score).toBeLessThanOrEqual(
      masteryConfig.selfGradeCorrectCap + 0.5,
    );
    expect(r.state.successfulRecalls).toBe(0);
    expect(r.state.retrievalEvidenceCount).toBe(0);
    expect(toTransparentMasteryState(r.state)).toBe("new");
  });

  it("maps transparent states NEW LEARNING FRAGILE STABLE MASTERED", () => {
    expect(
      toTransparentMasteryState({
        band: "not_seen",
        score: 0,
        retrievalEvidenceCount: 0,
        successfulRecalls: 0,
      }),
    ).toBe("new");
    expect(
      toTransparentMasteryState({
        band: "learning",
        score: 20,
        retrievalEvidenceCount: 2,
        successfulRecalls: 1,
      }),
    ).toBe("learning");
    expect(
      toTransparentMasteryState({
        band: "familiar",
        score: 45,
        retrievalEvidenceCount: 3,
        successfulRecalls: 2,
      }),
    ).toBe("fragile");
    expect(
      toTransparentMasteryState({
        band: "at_risk",
        score: 50,
        retrievalEvidenceCount: 4,
        successfulRecalls: 2,
      }),
    ).toBe("fragile");
    expect(
      toTransparentMasteryState({
        band: "strong",
        score: 70,
        retrievalEvidenceCount: 5,
        successfulRecalls: 4,
      }),
    ).toBe("stable");
    expect(
      toTransparentMasteryState({
        band: "mastered",
        score: 90,
        retrievalEvidenceCount: 8,
        successfulRecalls: 6,
      }),
    ).toBe("mastered");
  });

  it("aggregate disclaimer is not a pass probability", () => {
    const agg = computeMasteryAggregate({
      items: [
        { score: 80, examWeight: 2, evidenceCount: 5 },
        { score: 40, examWeight: 1, evidenceCount: 1 },
      ],
    });
    expect(agg.labeledAs).toBe("mastery_aggregate");
    expect(agg.disclaimer).toBe(MASTERY_TRANSPARENCY_DISCLAIMER_CS);
    expect(agg.disclaimer.toLowerCase()).toMatch(
      /neříkají|jestli maturitu/,
    );
    expect(agg.lowEvidence).toBe(true);
  });
});
