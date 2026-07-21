import { describe, expect, it } from "vitest";
import { pickOneMinuteStudy } from "@/domain/learning/one-minute-study";

describe("one-minute-study (D-059)", () => {
  it("prefers due flashcards first", () => {
    const plan = pickOneMinuteStudy({
      flashcardDueCount: 3,
      reviewDueCount: 10,
      hasCermat: true,
      hasSpeedRound: true,
      speedRoundHref: "/app/learn/speed-round/demo",
    });
    expect(plan.mode).toBe("flashcards");
    expect(plan.href).toBe("/app/review");
  });

  it("falls back to mixed review when no flashcards due", () => {
    const plan = pickOneMinuteStudy({
      flashcardDueCount: 0,
      reviewDueCount: 5,
      hasCermat: true,
      hasSpeedRound: true,
      speedRoundHref: "/app/learn/speed-round/demo",
    });
    expect(plan.mode).toBe("review");
    expect(plan.href).toBe("/app/review/mixed");
  });

  it("uses CERMAT before speed when no due queue", () => {
    const plan = pickOneMinuteStudy({
      flashcardDueCount: 0,
      reviewDueCount: 0,
      hasCermat: true,
      hasSpeedRound: true,
      speedRoundHref: "/app/learn/speed-round/demo",
    });
    expect(plan.mode).toBe("cermat");
    expect(plan.href).toBe("/app/cermat");
  });

  it("uses speed round when available and nothing else", () => {
    const plan = pickOneMinuteStudy({
      flashcardDueCount: 0,
      reviewDueCount: 0,
      hasCermat: false,
      hasSpeedRound: true,
      speedRoundHref: "/app/learn/speed-round/demo",
    });
    expect(plan.mode).toBe("speed");
    expect(plan.href).toBe("/app/learn/speed-round/demo");
  });

  it("falls back to learn hub", () => {
    const plan = pickOneMinuteStudy({
      flashcardDueCount: 0,
      reviewDueCount: 0,
      hasCermat: false,
      hasSpeedRound: false,
    });
    expect(plan.href).toBe("/app/learn");
  });
});
