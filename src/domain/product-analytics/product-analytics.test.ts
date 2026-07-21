import { describe, expect, it } from "vitest";
import {
  anonymizeLearnerKey,
  applyProductEventToState,
  buildAnonymizedProductExport,
  buildProductAnalyticsDashboard,
  buildProductEvent,
  emptyProductLearnerState,
  PRODUCT_ANALYTICS_DENIED,
  productFunnelSteps,
} from "@/domain/product-analytics";
import {
  assignExperimentVariant,
  resolveFlagEnabled,
  stickyBucket,
  type Experiment,
  type FeatureFlag,
} from "@/domain/feature-flags";

describe("product-analytics (D-062)", () => {
  it("defines the full acquisition funnel", () => {
    expect(productFunnelSteps).toEqual([
      "homepage",
      "registration",
      "onboarding_completed",
      "first_document_uploaded",
      "first_study_session",
      "first_10_questions",
      "day_2_return",
      "day_7_return",
      "first_mock_exam",
      "upgrade",
    ]);
  });

  it("denies sensitive student content categories", () => {
    expect(PRODUCT_ANALYTICS_DENIED.join(" ")).toMatch(/document/);
    expect(PRODUCT_ANALYTICS_DENIED.join(" ")).toMatch(/answer/);
    expect(PRODUCT_ANALYTICS_DENIED.join(" ")).toMatch(/email/i);
  });

  it("anonymizes learner keys", () => {
    const a = anonymizeLearnerKey("learner-a");
    expect(a).toHaveLength(16);
    expect(a).not.toBe("learner-a");
    expect(anonymizeLearnerKey("learner-a")).toBe(a);
  });

  it("emits first_10_questions and day returns as milestones", () => {
    let state = emptyProductLearnerState(
      "u1",
      "2026-07-01T10:00:00.000Z",
    );

    for (let i = 0; i < 9; i++) {
      const ev = buildProductEvent({
        learnerKey: "u1",
        event: "question_answered",
        at: `2026-07-01T10:0${i}:00.000Z`,
      });
      const r = applyProductEventToState(state, ev);
      state = r.state;
      expect(r.milestones).toHaveLength(0);
    }

    const tenth = buildProductEvent({
      learnerKey: "u1",
      event: "question_answered",
      at: "2026-07-01T11:00:00.000Z",
    });
    const at10 = applyProductEventToState(state, tenth);
    expect(at10.milestones.map((m) => m.event)).toContain("first_10_questions");
    state = at10.state;

    const open = buildProductEvent({
      learnerKey: "u1",
      event: "app_opened",
      at: "2026-07-08T12:00:00.000Z",
    });
    const ret = applyProductEventToState(state, open);
    expect(ret.milestones.map((m) => m.event)).toEqual(
      expect.arrayContaining(["day_2_return", "day_7_return"]),
    );
  });

  it("builds funnel dashboard and anonymized export without raw keys", () => {
    const events = [
      buildProductEvent({
        event: "homepage_viewed",
        funnelStep: "homepage",
        at: "2026-07-20T08:00:00.000Z",
      }),
      buildProductEvent({
        learnerKey: "secret-learner",
        event: "registration_completed",
        funnelStep: "registration",
        at: "2026-07-20T09:00:00.000Z",
      }),
      buildProductEvent({
        learnerKey: "secret-learner",
        event: "question_answered",
        correct: true,
        at: "2026-07-20T10:00:00.000Z",
      }),
    ];
    const states = [
      emptyProductLearnerState("secret-learner", "2026-07-20T09:00:00.000Z"),
    ];
    const dash = buildProductAnalyticsDashboard(events, states);
    expect(dash.funnel[0]?.count).toBe(1);
    expect(dash.funnel[1]?.count).toBe(1);
    expect(dash.outcomes.questionsAnswered).toBeGreaterThanOrEqual(1);

    const exp = buildAnonymizedProductExport(events, states);
    expect(JSON.stringify(exp)).not.toContain("secret-learner");
    expect(exp.events[1]?.learnerKeyHash).toHaveLength(16);
  });
});

describe("feature-flags (D-062)", () => {
  it("uses sticky buckets for rollout", () => {
    const b = stickyBucket("learner-1", "flag:minute_study_entry");
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(100);
    expect(stickyBucket("learner-1", "flag:minute_study_entry")).toBe(b);
  });

  it("resolves flags by rollout percent", () => {
    const flag: FeatureFlag = {
      key: "test_flag",
      descriptionCs: "test",
      enabled: true,
      rolloutPercent: 0,
      updatedAt: new Date().toISOString(),
    };
    expect(resolveFlagEnabled(flag, "anyone")).toBe(false);
    expect(resolveFlagEnabled({ ...flag, rolloutPercent: 100 }, "anyone")).toBe(
      true,
    );
  });

  it("assigns experiment variants sticky", () => {
    const exp: Experiment = {
      id: "cta_test",
      nameCs: "CTA",
      status: "running",
      variants: [
        { id: "control", labelCs: "A", weight: 50 },
        { id: "variant_a", labelCs: "B", weight: 50 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const a = assignExperimentVariant(exp, "learner-x");
    expect(a).toMatch(/control|variant_a/);
    expect(assignExperimentVariant(exp, "learner-x")).toBe(a);
    expect(assignExperimentVariant({ ...exp, status: "draft" }, "learner-x")).toBeNull();
  });
});
