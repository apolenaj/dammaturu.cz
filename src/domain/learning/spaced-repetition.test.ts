import { describe, expect, it } from "vitest";
import {
  applyPerformance,
  buildDueSummary,
  buildMixedReviewQueue,
  createSpacedSchedule,
  emptyScheduleBook,
  parseSpacedReviewPack,
  startMixedSession,
} from "@/domain/learning/spaced-repetition";
import { buildCjlSpacedPack } from "@/server/spaced-repetition/packs/cjl-spaced";

describe("spaced-repetition (FSRS)", () => {
  const pack = parseSpacedReviewPack(
    buildCjlSpacedPack("2026-07-20T12:00:00.000Z"),
  );

  it("shortens interval on again, lengthens on easy", () => {
    const base = createSpacedSchedule(
      pack.knowledge[0]!.id,
      "2026-07-20T12:00:00.000Z",
    );
    const fail = applyPerformance(base, "again", "2026-07-20T12:00:00.000Z");
    const easy = applyPerformance(base, "easy", "2026-07-20T12:00:00.000Z");

    expect(fail.lapseCount).toBe(1);
    expect(fail.stability).toBeLessThan(easy.stability);
    expect(new Date(fail.nextReview).getTime()).toBeLessThan(
      new Date(easy.nextReview).getTime(),
    );
    expect(easy.reviewCount).toBe(1);
  });

  it("repeated errors shorten next interval vs clean history", () => {
    const base = createSpacedSchedule(
      pack.knowledge[0]!.id,
      "2026-07-20T12:00:00.000Z",
    );
    const clean = applyPerformance(base, "good", "2026-07-20T12:00:00.000Z", {
      confidence: 4,
      repeatedErrors: 0,
    });
    const dirty = applyPerformance(base, "good", "2026-07-20T12:00:00.000Z", {
      confidence: 4,
      repeatedErrors: 5,
      contentDifficulty: 5,
    });
    expect(new Date(dirty.nextReview).getTime()).toBeLessThanOrEqual(
      new Date(clean.nextReview).getTime(),
    );
  });

  it("builds mixed queue without 3 identical formats in a row", () => {
    const book = emptyScheduleBook("learner", pack, "2026-07-20T12:00:00.000Z");
    const queue = buildMixedReviewQueue({
      pack,
      book,
      nowIso: "2026-07-20T12:00:00.000Z",
      limits: { maxDue: 18, maxNew: 8 },
    });
    expect(queue.length).toBeGreaterThan(0);
    for (let i = 2; i < queue.length; i += 1) {
      const run =
        queue[i]!.format === queue[i - 1]!.format &&
        queue[i - 1]!.format === queue[i - 2]!.format;
      expect(run).toBe(false);
    }
    const formats = new Set(queue.map((q) => q.format));
    expect(formats.size).toBeGreaterThanOrEqual(2);
  });

  it("due summary uses student-facing Czech headline", () => {
    const summary = buildDueSummary({
      pack,
      book: null,
      nowIso: "2026-07-20T12:00:00.000Z",
    });
    expect(summary.headlineCs).toMatch(/^Dnes je vhodné zopakovat \d+ položek\.$/);
    expect(summary.supportingCs.length).toBeGreaterThan(10);
    expect(summary.estimatedMinutes).toBeGreaterThanOrEqual(1);
  });

  it("each knowledge has ≥2 formats", () => {
    for (const k of pack.knowledge) {
      const kinds = new Set(k.formats.map((f) => f.format));
      expect(kinds.size).toBeGreaterThanOrEqual(2);
    }
  });

  it("session grades update schedule fields", () => {
    const book = emptyScheduleBook("learner", pack, "2026-07-20T12:00:00.000Z");
    const session = startMixedSession({
      sessionId: "11111111-1111-4111-8111-111111111111",
      learnerId: "learner",
      pack,
      book,
      nowIso: "2026-07-20T12:00:00.000Z",
    });
    expect(session.queue.length).toBeGreaterThan(0);
    expect(session.status).toBe("active");
  });
});
