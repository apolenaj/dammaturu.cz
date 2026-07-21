import { describe, expect, it } from "vitest";
import {
  buildBeforeAfterReport,
  diagnosticBaselineSchema,
} from "@/domain/learning/beta-feedback";

describe("beta before/after report (Beta 1.0)", () => {
  it("computes accuracy improvement from baseline", () => {
    const baseline = diagnosticBaselineSchema.parse({
      completedAt: "2026-07-21T10:00:00.000Z",
      attempts: 10,
      correct: 4,
      accuracyPct: 40,
      readinessPct: 30,
      packSlug: "cjl-otazky",
    });
    const report = buildBeforeAfterReport({
      displayName: "Tereza",
      targetDate: "2026-08-31",
      baseline,
      finalMasteryPct: 55,
      recentAccuracyPct: 62,
      retentionProxyPct: 70,
      topicsMastered: [{ id: "a", title: "Homonyma", score: 82 }],
      studyTimeMinutes: 120,
      weaknessesRemaining: [{ labelCs: "Rozbory", pct: 40 }],
      nowIso: "2026-08-31T12:00:00.000Z",
    });
    expect(report.accuracyImprovementPct).toBe(22);
    expect(report.summaryCs).toMatch(/\+25/);
    expect(report.topicsMastered).toHaveLength(1);
  });
});
