import { describe, expect, it } from "vitest";
import {
  createFsrsCard,
  daysBetween,
  forgettingPriority,
  retrievability,
  reviewFsrs,
} from "@/domain/learning/fsrs";

describe("FSRS-4.5 scheduler", () => {
  const now = "2026-07-20T12:00:00.000Z";

  it("shortens interval on again vs easy", () => {
    const base = createFsrsCard(now);
    const fail = reviewFsrs({ card: base, rating: 1, nowIso: now });
    const easy = reviewFsrs({ card: base, rating: 4, nowIso: now });
    expect(fail.card.lapses).toBe(1);
    expect(new Date(fail.card.dueAt).getTime()).toBeLessThan(
      new Date(easy.card.dueAt).getTime(),
    );
    expect(easy.card.stability).toBeGreaterThan(fail.card.stability);
  });

  it("grows stability across successful reviews", () => {
    let card = createFsrsCard(now);
    card = reviewFsrs({ card, rating: 3, nowIso: now }).card;
    const s1 = card.stability;
    card = reviewFsrs({
      card,
      rating: 3,
      nowIso: "2026-07-21T12:00:00.000Z",
    }).card;
    expect(card.stability).toBeGreaterThan(s1);
    expect(card.reps).toBeGreaterThanOrEqual(2);
  });

  it("raises difficulty with repeated errors", () => {
    const base = createFsrsCard(now);
    const plain = reviewFsrs({ card: base, rating: 3, nowIso: now });
    const withErrors = reviewFsrs({
      card: base,
      rating: 3,
      nowIso: now,
      repeatedErrors: 4,
      contentDifficulty: 5,
    });
    expect(withErrors.card.difficulty).toBeGreaterThanOrEqual(
      plain.card.difficulty,
    );
    expect(withErrors.intervalDays).toBeLessThanOrEqual(plain.intervalDays + 0.01);
  });

  it("confidence can nudge rating", () => {
    const base = createFsrsCard(now);
    const low = reviewFsrs({
      card: base,
      rating: 3,
      nowIso: now,
      confidence: 1,
    });
    const high = reviewFsrs({
      card: base,
      rating: 3,
      nowIso: now,
      confidence: 5,
    });
    expect(low.rating).toBeLessThanOrEqual(3);
    expect(high.rating).toBeGreaterThanOrEqual(3);
  });

  it("retrievability drops with elapsed time", () => {
    const r0 = retrievability(10, 0);
    const r1 = retrievability(10, 10);
    expect(r0).toBeGreaterThan(r1);
    expect(daysBetween(now, "2026-07-22T12:00:00.000Z")).toBeCloseTo(2, 5);
  });

  it("forgetting priority ranks fragile cards lower", () => {
    const fragile = forgettingPriority(
      {
        stability: 0.5,
        lastReviewAt: "2026-07-18T12:00:00.000Z",
        state: "review",
      },
      now,
    );
    const solid = forgettingPriority(
      {
        stability: 20,
        lastReviewAt: "2026-07-19T12:00:00.000Z",
        state: "review",
      },
      now,
    );
    expect(fragile).toBeLessThan(solid);
  });
});
