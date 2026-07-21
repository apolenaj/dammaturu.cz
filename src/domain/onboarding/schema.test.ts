import { describe, expect, it } from "vitest";
import {
  BETA_TARGET_DATE,
  onboardingInputSchema,
  stepSchemas,
} from "@/domain/onboarding/schema";
import { buildStudyPlan } from "@/domain/onboarding/study-plan";

const validInput = {
  displayName: "Tereza",
  targetDate: BETA_TARGET_DATE,
  schoolType: "gymnazium" as const,
  subjects: ["cjl" as const],
  readinessFeeling: 3 as const,
  dailyMinutes: 25,
  preferredStudyTime: "evening" as const,
  studyMode: "standard" as const,
  wantsDiagnostic: true,
};

describe("onboardingInputSchema", () => {
  it("accepts valid beta payload", () => {
    const result = onboardingInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects past target date", () => {
    const result = onboardingInputSchema.safeParse({
      ...validInput,
      targetDate: "2020-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects intensive mode under 25 minutes", () => {
    const result = onboardingInputSchema.safeParse({
      ...validInput,
      studyMode: "intensive",
      dailyMinutes: 15,
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one subject", () => {
    const result = stepSchemas.schoolSubjects.safeParse({
      schoolType: "gymnazium",
      subjects: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("buildStudyPlan", () => {
  it("creates diagnostic first mission when requested", () => {
    const plan = buildStudyPlan(validInput, new Date("2026-07-20T12:00:00"));
    expect(plan.firstMission.kind).toBe("diagnostic");
    expect(plan.targetDate).toBe(BETA_TARGET_DATE);
    expect(plan.daysRemaining).toBeGreaterThan(0);
    expect(plan.weeklyFocus).toHaveLength(3);
  });

  it("creates learn mission when diagnostic is off", () => {
    const plan = buildStudyPlan(
      { ...validInput, wantsDiagnostic: false },
      new Date("2026-07-20T12:00:00"),
    );
    expect(plan.firstMission.kind).toBe("learn");
    expect(plan.firstMission.title).toMatch(/Český jazyk/);
  });
});
