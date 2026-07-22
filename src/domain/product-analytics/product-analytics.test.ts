import { describe, expect, it } from "vitest";
import {
  anonymizeLearnerKey,
  answerEventForResult,
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

describe("product-analytics learning funnel", () => {
  it("defines the learning conversion funnel", () => {
    expect(productFunnelSteps).toEqual([
      "homepage",
      "start",
      "first_material",
      "first_answer",
      "first_lesson_complete",
      "return_next_day",
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

  it("maps answer results to privacy-safe events", () => {
    expect(answerEventForResult("correct")).toBe("answer_correct");
    expect(answerEventForResult("partial")).toBe("answer_partial");
    expect(answerEventForResult("incorrect")).toBe("answer_wrong");
  });

  it("tracks first answer, lesson complete, and next-day return", () => {
    let state = emptyProductLearnerState("u1", "2026-07-01T10:00:00.000Z");

    const guest = buildProductEvent({
      learnerKey: "u1",
      event: "guest_start",
      at: "2026-07-01T10:00:00.000Z",
    });
    state = applyProductEventToState(state, guest).state;
    expect(state.guestStartedAt).toBeTruthy();

    const material = buildProductEvent({
      learnerKey: "u1",
      event: "material_open",
      topicSlug: "romantismus",
      at: "2026-07-01T10:01:00.000Z",
    });
    state = applyProductEventToState(state, material).state;
    expect(state.firstMaterialAt).toBeTruthy();

    const attempt = buildProductEvent({
      learnerKey: "u1",
      event: "retrieval_attempt",
      at: "2026-07-01T10:02:00.000Z",
    });
    state = applyProductEventToState(state, attempt).state;
    expect(state.firstAnswerAt).toBeTruthy();
    expect(state.firstLearningInteractionAt).toBeTruthy();

    const done = buildProductEvent({
      learnerKey: "u1",
      event: "lesson_complete",
      topicSlug: "romantismus",
      at: "2026-07-01T10:20:00.000Z",
    });
    state = applyProductEventToState(state, done).state;
    expect(state.firstLessonCompleteAt).toBeTruthy();
    expect(state.lessonsCompleted).toBe(1);

    const open = buildProductEvent({
      learnerKey: "u1",
      event: "app_opened",
      at: "2026-07-02T12:00:00.000Z",
    });
    const ret = applyProductEventToState(state, open);
    expect(ret.state.returnNextDayAt).toBeTruthy();
    expect(ret.milestones.map((m) => m.funnelStep)).toContain(
      "return_next_day",
    );
  });

  it("builds learning metrics and anonymized export", () => {
    const events = [
      buildProductEvent({
        event: "homepage_view",
        funnelStep: "homepage",
        at: "2026-07-20T08:00:00.000Z",
      }),
      buildProductEvent({
        learnerKey: "secret-learner",
        event: "guest_start",
        funnelStep: "start",
        at: "2026-07-20T09:00:00.000Z",
      }),
      buildProductEvent({
        learnerKey: "secret-learner",
        event: "answer_correct",
        correct: true,
        at: "2026-07-20T10:00:00.000Z",
      }),
      buildProductEvent({
        learnerKey: "secret-learner",
        event: "lesson_start",
        topicSlug: "maj",
        at: "2026-07-20T09:30:00.000Z",
      }),
      buildProductEvent({
        learnerKey: "secret-learner",
        event: "lesson_complete",
        topicSlug: "maj",
        at: "2026-07-20T10:30:00.000Z",
      }),
    ];

    let state = emptyProductLearnerState(
      "secret-learner",
      "2026-07-20T09:00:00.000Z",
    );
    for (const e of events.filter((x) => x.learnerKey)) {
      state = applyProductEventToState(state, e).state;
    }

    const dash = buildProductAnalyticsDashboard(events, [state]);
    expect(dash.funnel[0]?.step).toBe("homepage");
    expect(dash.funnel[0]?.count).toBe(1);
    expect(dash.outcomes.learning.lessonCompletionPct).toBe(100);
    expect(
      dash.outcomes.learning.timeToFirstInteractionSecMedian,
    ).not.toBeNull();

    const exp = buildAnonymizedProductExport(events, [state]);
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
    expect(
      assignExperimentVariant({ ...exp, status: "draft" }, "learner-x"),
    ).toBeNull();
  });
});
