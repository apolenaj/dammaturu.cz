import { describe, expect, it } from "vitest";
import {
  buildCermatTriageCandidates,
  buildHorizonPlan,
  buildMaterialsTriageCandidates,
  buildMistakeTriageCandidates,
  buildOverdueTriageCandidate,
  buildZachranMePlan,
  computePriorityScore,
  evidenceDisclaimerCs,
  resolveEvidenceLevel,
  timePressureFromDays,
  zachranMeBucketLabelsCs,
  zachranMeScopes,
  type PriorityItem,
  type TriageCandidate,
} from "@/domain/learning/zachran-me";
import { emptyCategoryStats } from "@/domain/learning/cermat-prep";

function baseItem(
  overrides: Partial<PriorityItem> & Pick<PriorityItem, "id" | "titleCs">,
): PriorityItem {
  return {
    lane: "cermat",
    laneLabelCs: "CERMAT",
    detailCs: "",
    href: "/app/cermat",
    masteryPct: 30,
    hasLearningEvidence: true,
    importance: 0.9,
    priorityScore: 0.5,
    factors: {
      masteryPct: 30,
      weakness: 0.7,
      importance: 0.9,
      errorPressure: 0.4,
      overduePressure: 0.3,
      coveragePressure: 0.5,
      timePressure: 0.8,
      priorityScore: 0.5,
    },
    bucket: "must_know",
    reasonCs: "test",
    estimatedMinutes: 15,
    remainingUnits: 2,
    repeatedErrors: 1,
    overdueReviews: 1,
    ...overrides,
  };
}

describe("zachran-me deadline triage", () => {
  it("exposes only A/B/C scopes and three Czech buckets", () => {
    expect([...zachranMeScopes]).toEqual(["materials", "cermat", "both"]);
    expect(zachranMeBucketLabelsCs.must_know).toBe("MUSÍM UMĚT");
    expect(zachranMeBucketLabelsCs.important).toBe("DŮLEŽITÉ");
    expect(zachranMeBucketLabelsCs.if_time).toBe("POKUD ZBUDE ČAS");
  });

  it("raises time pressure as exam approaches", () => {
    expect(timePressureFromDays(2)).toBeGreaterThan(timePressureFromDays(40));
    expect(
      computePriorityScore({
        importance: 1,
        weakness: 0.8,
        errorPressure: 0.5,
        overduePressure: 0.5,
        coveragePressure: 0.5,
        timePressure: 1,
      }),
    ).toBeGreaterThan(
      computePriorityScore({
        importance: 1,
        weakness: 0.8,
        errorPressure: 0.5,
        overduePressure: 0.5,
        coveragePressure: 0.5,
        timePressure: 0.3,
      }),
    );
  });

  it("never invents mastery % when CERMAT has zero attempts", () => {
    const candidates = buildCermatTriageCandidates({
      byCategory: emptyCategoryStats(),
    });
    expect(candidates.every((c) => c.masteryPct == null)).toBe(true);
    expect(candidates.every((c) => !c.hasLearningEvidence)).toBe(true);
    expect(resolveEvidenceLevel({ candidates })).toBe("insufficient");
    expect(evidenceDisclaimerCs("insufficient")).toMatch(/pokrytí obsahu/);
  });

  it("builds materials empty-state without unimplemented subjects", () => {
    const empty = buildMaterialsTriageCandidates({ materials: [] });
    expect(empty).toHaveLength(1);
    expect(empty[0]!.href).toBe("/app/materials");
    expect(empty[0]!.detailCs.toLowerCase()).toMatch(/matematika|aj/);
  });

  it("builds plan with Dnes/Zítra/Týden and exact CTA", () => {
    const cermat = buildCermatTriageCandidates({
      byCategory: emptyCategoryStats().map((row) =>
        row.category === "orthography"
          ? { ...row, attempts: 4, correct: 1, accuracyPct: 25 }
          : row.category === "syntax"
            ? { ...row, attempts: 3, correct: 3, accuracyPct: 100 }
            : row,
      ),
      errorsByCategory: { orthography: 3 },
      overdueByCategory: { orthography: 5 },
    });
    const materials = buildMaterialsTriageCandidates({
      materials: [
        {
          id: "m1",
          title: "Školní zápisky Máj",
          status: "ready",
          knowledgePointCount: 12,
          topicCount: 3,
        },
      ],
      masteryByMaterialId: { m1: 28 },
      errorsByMaterialId: { m1: 2 },
    });
    const mistakes = buildMistakeTriageCandidates({
      scope: "both",
      activeMistakes: [
        {
          id: "e1",
          titleCs: "Špatný autor Máje",
          occurrenceCount: 4,
          examValue: 5,
        },
      ],
    });
    const overdue = buildOverdueTriageCandidate({
      scope: "both",
      dueCount: 9,
    });

    const candidates: TriageCandidate[] = [
      ...cermat,
      ...materials,
      ...mistakes,
      ...(overdue ? [overdue] : []),
    ];

    const plan = buildZachranMePlan({
      request: {
        examDate: "2026-07-28",
        dailyMinutes: 30,
        scope: "both",
      },
      candidates,
      totalAttemptsHint: 20,
      now: new Date(2026, 6, 21, 12, 0, 0),
    });

    expect(plan.daysRemaining).toBe(7);
    expect(plan.ctaLabelCs).toBe("Začít dnešní plán");
    expect(plan.horizon.today.titleCs).toBe("Dnes");
    expect(plan.horizon.tomorrow.titleCs).toBe("Zítra");
    expect(plan.horizon.thisWeek.titleCs).toBe("Tento týden");
    expect(plan.mustKnow.length + plan.important.length).toBeGreaterThan(0);
    expect(plan.horizon.today.totalMinutes).toBeLessThanOrEqual(30);
    expect(plan.startTodayHref).toBeTruthy();
    expect(plan.analysis.evidenceLevel).not.toBe("insufficient");

    // Scope filter — materials-only must not include CERMAT lane items
    const onlyMat = buildZachranMePlan({
      request: {
        examDate: "2026-08-31",
        dailyMinutes: 20,
        scope: "materials",
      },
      candidates,
      totalAttemptsHint: 5,
      now: new Date(2026, 6, 21),
    });
    expect(
      [...onlyMat.mustKnow, ...onlyMat.important, ...onlyMat.ifTime].every(
        (i) => i.lane === "materials",
      ),
    ).toBe(true);
  });

  it("packs horizon within daily minutes", () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      baseItem({
        id: `x-${i}`,
        titleCs: `Položka ${i}`,
        estimatedMinutes: 20,
        priorityScore: 1 - i * 0.05,
      }),
    );
    const horizon = buildHorizonPlan({
      mustKnow: items,
      important: [],
      ifTime: [],
      dailyMinutes: 45,
      daysRemaining: 10,
    });
    expect(horizon.today.totalMinutes).toBeLessThanOrEqual(45);
    expect(horizon.today.steps.length).toBeGreaterThan(0);
    expect(horizon.today.steps.length).toBeLessThanOrEqual(3);
  });

  it("shows insufficient-evidence disclaimer when no attempts", () => {
    const plan = buildZachranMePlan({
      request: {
        examDate: "2026-09-01",
        dailyMinutes: 25,
        scope: "cermat",
      },
      candidates: buildCermatTriageCandidates({
        byCategory: emptyCategoryStats(),
      }),
      totalAttemptsHint: 0,
      now: new Date(2026, 6, 21),
    });
    expect(plan.analysis.evidenceLevel).toBe("insufficient");
    expect(plan.analysis.evidenceDisclaimerCs).toMatch(/pokrytí obsahu/);
    expect(
      plan.mustKnow.concat(plan.important, plan.ifTime).every(
        (i) => i.masteryPct == null || i.hasLearningEvidence,
      ),
    ).toBe(true);
  });
});
