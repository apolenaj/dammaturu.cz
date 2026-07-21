import { describe, expect, it } from "vitest";
import {
  buildCermatCandidates,
  buildLanguageTopicCandidates,
  buildNextStudySession,
  buildOralLiteratureCandidates,
  buildZachranMePlan,
  computeImpactScore,
  estimateForgettingRisk,
  timePressureFromDays,
  zachranMeBucketLabelsCs,
  zachranMeComponents,
  zachranMeConfig,
  type EmergencyCandidate,
} from "@/domain/learning/zachran-me";
import { emptyCategoryStats } from "@/domain/learning/cermat-prep";
import { buildCurriculumPack } from "@/server/curriculum/build";
import { cjlBetaDefinition } from "@/server/curriculum/definitions/cjl-beta";
import { createLiteratureBook } from "@/domain/learning/literature-maturity";

describe("zachran-me emergency planner (D-056)", () => {
  const pack = buildCurriculumPack(
    cjlBetaDefinition,
    "2026-07-20T12:00:00.000Z",
  );

  it("exposes only supported components and five triage buckets", () => {
    expect([...zachranMeComponents]).toEqual([
      "cermat_didactic",
      "oral_literature",
      "language_topics",
    ]);
    expect(zachranMeBucketLabelsCs.must_know).toBe("MUSÍŠ UMĚT");
    expect(zachranMeBucketLabelsCs.high_impact).toBe("HIGH IMPACT");
    expect(zachranMeBucketLabelsCs.should_know).toBe("MĚL/A BYS UMĚT");
    expect(zachranMeBucketLabelsCs.if_time).toBe("POKUD ZBUDE ČAS");
    expect(zachranMeBucketLabelsCs.already_knows).toMatch(/UŽ UMÍŠ/);
  });

  it("raises time pressure as exam approaches", () => {
    expect(timePressureFromDays(2)).toBeGreaterThan(timePressureFromDays(40));
    expect(computeImpactScore({
      importance: 1,
      weakness: 0.8,
      forgettingRisk: 0.5,
      timePressure: 1,
    })).toBeGreaterThan(
      computeImpactScore({
        importance: 1,
        weakness: 0.8,
        forgettingRisk: 0.5,
        timePressure: 0.3,
      }),
    );
  });

  it("builds plan with buckets and exact next session from real candidates", () => {
    const cermat = buildCermatCandidates({
      byCategory: emptyCategoryStats().map((row) =>
        row.category === "orthography"
          ? { ...row, attempts: 4, correct: 1, accuracyPct: 25 }
          : row.category === "syntax"
            ? { ...row, attempts: 3, correct: 3, accuracyPct: 100 }
            : row,
      ),
      forgettingBase: 0.2,
    });
    const oral = buildOralLiteratureCandidates({
      books: [
        createLiteratureBook({
          id: "book-maj",
          titleCs: "Máj",
          authorCs: "Mácha",
          nowIso: "2026-07-20T12:00:00.000Z",
        }),
      ],
      forgettingBase: 0.5,
    });
    // Force weak oral book
    oral[0]!.readinessPct = 20;
    oral[0]!.importance = 0.95;

    const topics = buildLanguageTopicCandidates({
      pack,
      masteryBySlug: {
        romantismus: 90,
        realismus: 25,
        "rozbor-maj": 20,
      },
      forgettingBySlug: {
        realismus: 0.8,
        "rozbor-maj": 0.7,
        romantismus: 0.15,
      },
    });

    const candidates: EmergencyCandidate[] = [...cermat, ...oral, ...topics];

    const plan = buildZachranMePlan({
      request: {
        examDate: "2026-07-28",
        availableHours: 1,
        components: ["cermat_didactic", "oral_literature", "language_topics"],
      },
      candidates,
      overallReadinessPct: 42,
      now: new Date(2026, 6, 21, 12, 0, 0),
    });

    expect(plan.daysRemaining).toBe(7);
    expect(plan.analysis.timePressure).toBeGreaterThan(0.7);
    expect(plan.mustKnow.length + plan.highImpact.length).toBeGreaterThan(0);
    expect(
      plan.alreadyKnows.some(
        (i) => i.id === "cermat-syntax" || i.id === "topic-romantismus",
      ),
    ).toBe(true);
    expect(plan.nextSession.steps.length).toBeGreaterThan(0);
    expect(plan.nextSession.totalMinutes).toBeLessThanOrEqual(60);
    expect(plan.nextSession.startHref).toBeTruthy();
    expect(plan.manifestoCs.toLowerCase()).toMatch(/nouzový|triáž/);

    // Never invent components outside selection
    const onlyCermat = buildZachranMePlan({
      request: {
        examDate: zachranMeConfig.betaTargetDate,
        availableHours: 2,
        components: ["cermat_didactic"],
      },
      candidates,
      now: new Date(2026, 6, 21),
    });
    expect(
      [
        ...onlyCermat.mustKnow,
        ...onlyCermat.highImpact,
        ...onlyCermat.shouldKnow,
        ...onlyCermat.ifTime,
        ...onlyCermat.alreadyKnows,
      ].every((i) => i.component === "cermat_didactic"),
    ).toBe(true);
  });

  it("packs next session within available minutes", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      id: `x-${i}`,
      component: "cermat_didactic" as const,
      componentLabelCs: "Didaktický test CERMAT",
      titleCs: `Položka ${i}`,
      detailCs: "",
      href: "/app/cermat",
      readinessPct: 20,
      importance: 0.9,
      impactScore: 1 - i * 0.05,
      factors: {
        readinessPct: 20,
        weakness: 0.8,
        importance: 0.9,
        forgettingRisk: 0.5,
        timePressure: 0.9,
        impactScore: 1 - i * 0.05,
      },
      bucket: "must_know" as const,
      reasonCs: "test",
      estimatedMinutes: 20,
    }));
    const session = buildNextStudySession({
      mustKnow: items,
      highImpact: [],
      shouldKnow: [],
      availableMinutes: 45,
      daysRemaining: 5,
    });
    expect(session.totalMinutes).toBeLessThanOrEqual(45);
    expect(session.steps.length).toBeGreaterThan(0);
    expect(session.steps.length).toBeLessThanOrEqual(3);
  });

  it("estimateForgettingRisk rises with overdue and lapses", () => {
    expect(
      estimateForgettingRisk({
        isDue: false,
        daysOverdue: 0,
        lapseCount: 0,
        stabilityDays: 10,
        bandAtRisk: false,
      }),
    ).toBeLessThan(0.3);
    expect(
      estimateForgettingRisk({
        isDue: true,
        daysOverdue: 5,
        lapseCount: 3,
        stabilityDays: 0.5,
        bandAtRisk: true,
      }),
    ).toBeGreaterThan(0.85);
  });
});
