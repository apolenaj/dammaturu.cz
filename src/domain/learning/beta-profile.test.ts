import { describe, expect, it } from "vitest";
import {
  BETA_COHORT_ID,
  buildAdminBetaDashboard,
  buildProductInsights,
  buildStudentBetaPulse,
  computeCoveragePct,
  createBetaEnrollment,
  daysRemainingToTarget,
  isBetaTargetDate,
  type BetaTelemetryEvent,
} from "@/domain/learning/beta-profile";
import { stateWithScore } from "@/domain/learning/readiness";
import type { ReadinessUnit } from "@/domain/learning/readiness";

describe("beta-profile (D-039)", () => {
  const nowIso = "2026-07-21T10:00:00.000Z";

  it("recognizes private beta target date", () => {
    expect(isBetaTargetDate("2026-08-31")).toBe(true);
    expect(isBetaTargetDate("2026-09-01")).toBe(false);
    expect(createBetaEnrollment(nowIso).cohortId).toBe(BETA_COHORT_ID);
  });

  it("builds student pulse with coverage, mastery, adherence", () => {
    const units: ReadinessUnit[] = [
      {
        id: "u1",
        title: "A",
        areaId: "literarni-smery",
        examWeight: 1,
        state: stateWithScore("u1", 70, nowIso, 3),
      },
      {
        id: "u2",
        title: "B",
        areaId: "rozbory",
        examWeight: 1,
        state: stateWithScore("u2", 0, nowIso, 0),
      },
    ];
    units[1]!.state.band = "not_seen";
    units[1]!.state.evidenceCount = 0;

    const pulse = buildStudentBetaPulse({
      enrollment: createBetaEnrollment(nowIso),
      targetDate: "2026-08-31",
      units,
      readiness: {
        overall: {
          scorePct: 55,
          provisionalPct: 55,
          confidence: "moderate",
          attemptsNeeded: 0,
          messageCs: "ok",
          scoredDimensionCount: 3,
          totalEvidence: 30,
        },
        dimensions: [],
        trend: "improving",
        trendLabelCs: "Zlepšuje se",
        trendDeltaPct: 3,
        overallPct: 55,
        weekDeltaPct: 3,
        areas: [],
        strongAreas: [],
        weakAreas: [
          {
            id: "rozbory",
            labelCs: "Rozbory",
            pct: 20,
            reasonCs: "nízké",
            sessionHref: "/app/mistakes",
            sessionLabelCs: "x",
          },
        ],
        history: [],
        formulaVersion: "2026.07-evidence-v1",
        lowEvidence: false,
        labeledAs: "evidence_readiness",
        disclaimerCs: "",
        computedAt: nowIso,
      },
      minutesStudied: 120,
      planDaysCompleted: 8,
      planDaysExpected: 10,
      now: new Date(2026, 6, 21, 12, 0, 0),
    });

    expect(pulse.coveragePct).toBe(50);
    expect(pulse.masteryPct).toBe(55);
    expect(pulse.daysRemaining).toBeGreaterThan(30);
    expect(pulse.planAdherencePct).toBe(80);
    expect(pulse.weakLabelsCs).toContain("Rozbory");
    expect(pulse.targetDateLabelCs).toMatch(/31/);
  });

  it("computeCoveragePct ignores not_seen", () => {
    expect(computeCoveragePct([])).toBe(0);
  });

  it("admin dashboard aggregates product metrics without PII fields", () => {
    const events: BetaTelemetryEvent[] = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        learnerKey: "abc",
        kind: "mission_day",
        feature: "daily_mission",
        minutes: 27,
        dateKey: "2026-07-20",
        at: nowIso,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        learnerKey: "abc",
        kind: "question_answered",
        feature: "question_engine",
        correct: true,
        dateKey: "2026-07-20",
        at: nowIso,
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        learnerKey: "abc",
        kind: "question_answered",
        feature: "question_engine",
        correct: false,
        dateKey: "2026-07-20",
        at: nowIso,
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        learnerKey: "abc",
        kind: "drop_off",
        feature: "teach_it_back",
        dropOffAt: "/app/learn/nauc-zpatky/cjl-teach-back",
        dateKey: "2026-07-19",
        at: nowIso,
      },
      {
        id: "55555555-5555-4555-8555-555555555555",
        learnerKey: "abc",
        kind: "drop_off",
        feature: "teach_it_back",
        dropOffAt: "/app/learn/nauc-zpatky/cjl-teach-back",
        dateKey: "2026-07-18",
        at: nowIso,
      },
      {
        id: "66666666-6666-4666-8666-666666666666",
        learnerKey: "abc",
        kind: "feature_used",
        feature: "flashcards",
        minutes: 10,
        errorType: "wrong_author",
        dateKey: "2026-07-18",
        at: nowIso,
      },
      {
        id: "77777777-7777-4777-8777-777777777777",
        learnerKey: "abc",
        kind: "feature_used",
        feature: "error_memory",
        errorType: "wrong_author",
        dateKey: "2026-07-17",
        at: nowIso,
      },
      {
        id: "88888888-8888-4888-8888-888888888888",
        learnerKey: "abc",
        kind: "feature_used",
        feature: "error_memory",
        errorType: "wrong_author",
        dateKey: "2026-07-16",
        at: nowIso,
      },
    ];

    const dash = buildAdminBetaDashboard({
      events,
      learnerKeys: ["abc"],
      masteryDeltaPct: 6,
      neglectedTopics: [
        { topicSlug: "romantismus", lastSeenDateKey: "2026-07-01", daysSince: 20 },
      ],
      now: new Date(2026, 6, 21, 12, 0, 0),
    });

    expect(dash.sessionsCompleted).toBe(1);
    expect(dash.minutesStudied).toBe(37);
    expect(dash.questionsAnswered).toBe(2);
    expect(dash.accuracyPct).toBe(50);
    expect(dash.masteryDeltaPct).toBe(6);
    expect(dash.dropOffPoints[0]?.dropOffAt).toContain("nauc-zpatky");
    expect(dash.mostCommonErrors[0]?.errorType).toBe("wrong_author");
    expect(dash.insights.some((i) => i.id === "drop-off" || i.id === "mastery-up")).toBe(
      true,
    );
    expect(JSON.stringify(dash)).not.toMatch(/@|email|telefon/i);
  });

  it("daysRemainingToTarget never negative", () => {
    expect(
      daysRemainingToTarget("2026-07-01", new Date(2026, 6, 21)),
    ).toBe(0);
  });

  it("buildProductInsights flags low accuracy", () => {
    const insights = buildProductInsights({
      sessionsCompleted: 10,
      minutesStudied: 200,
      accuracyPct: 30,
      masteryDeltaPct: 2,
      topicsNeglected: [],
      dropOffPoints: [],
      mostCommonErrors: [],
      featureUsage: [],
    });
    expect(insights.some((i) => i.id === "accuracy-low")).toBe(true);
  });
});
