import { describe, expect, it } from "vitest";
import {
  buildSignalsFromPack,
  buildZachranMePlan,
  computePriority,
  estimateForgettingRisk,
  zachranMeBucketLabelsCs,
  zachranMeConfig,
} from "@/domain/learning/zachran-me";
import { buildCurriculumPack } from "@/server/curriculum/build";
import { cjlBetaDefinition } from "@/server/curriculum/definitions/cjl-beta";

describe("zachran-me (D-041)", () => {
  const pack = buildCurriculumPack(
    cjlBetaDefinition,
    "2026-07-20T12:00:00.000Z",
  );

  it("priority multiplies exam × weakness × forgetting × prereq", () => {
    const p = computePriority({
      examRelevance: 1,
      weakness: 0.8,
      forgettingRisk: 0.5,
      prerequisiteImportance: 0.5,
    });
    expect(p).toBe(0.2);
  });

  it("builds triage buckets — not learn-everything-faster", () => {
    const signals = buildSignalsFromPack({
      pack,
      masteryBySlug: {
        romantismus: 90,
        realismus: 30,
        "rozbor-maj": 25,
        homonyma: 85,
      },
      masteryByModule: {
        "narodni-obrozeni": 55,
        "svetovy-realismus": 35,
      },
      forgettingBySlug: {
        realismus: 0.8,
        "rozbor-maj": 0.7,
        romantismus: 0.15,
      },
    });

    const plan = buildZachranMePlan({
      request: {
        deadline: zachranMeConfig.betaTargetDate,
        dailyMinutes: 30,
        subjects: ["cjl"],
      },
      signals,
      now: new Date(2026, 6, 21, 12, 0, 0),
    });

    expect(plan.deadline).toBe("2026-08-31");
    expect(plan.daysRemaining).toBeGreaterThan(30);
    expect(plan.manifestoCs.toLowerCase()).toMatch(/neznamená|triáž/);
    expect(plan.mustToday.length).toBeGreaterThan(0);
    expect(plan.mustToday.length).toBeLessThanOrEqual(4);
    // 30 min / 12 ≈ 2 items
    expect(plan.mustToday.length).toBeLessThanOrEqual(2);

    expect(plan.alreadyKnows.some((i) => i.slug === "romantismus")).toBe(true);
    expect(plan.todayDirectiveCs.toLowerCase()).toMatch(/dnes musíš/);

    // Labels required by product copy
    expect(zachranMeBucketLabelsCs.must_today).toMatch(/Dnes musíš/);
    expect(zachranMeBucketLabelsCs.can_wait).toMatch(/počkat/);
    expect(zachranMeBucketLabelsCs.already_knows).toMatch(/umíš/);
    expect(zachranMeBucketLabelsCs.risk).toMatch(/riziko/);

    // High priority weak items should dominate must_today
    const mustSlugs = plan.mustToday.map((i) => i.slug);
    expect(
      mustSlugs.includes("realismus") || mustSlugs.includes("rozbor-maj"),
    ).toBe(true);
  });

  it("caps must_today by daily minutes — never dumps full curriculum", () => {
    const signals = buildSignalsFromPack({ pack });
    const plan = buildZachranMePlan({
      request: {
        deadline: "2026-08-31",
        dailyMinutes: 15,
        subjects: ["cjl"],
      },
      signals,
      now: new Date(2026, 6, 21),
    });
    expect(plan.mustToday.length).toBe(1);
    expect(plan.canWait.length + plan.risk.length).toBeGreaterThan(5);
  });

  it("marks unsupported subjects explicitly", () => {
    const plan = buildZachranMePlan({
      request: {
        deadline: "2026-08-31",
        dailyMinutes: 45,
        subjects: ["cjl", "mat"],
      },
      signals: buildSignalsFromPack({ pack }),
      now: new Date(2026, 6, 21),
    });
    expect(plan.unsupportedSubjectsCs).toContain("Matematika");
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
