import { describe, expect, it } from "vitest";
import {
  SPEED_ROUND_DURATION_MS,
  applySpeedAnswer,
  computeBestStreak,
  parseSpeedRoundPack,
  startSpeedSession,
  summarizeSpeedSession,
} from "@/domain/learning/speed-round";
import { buildCjlSpeedPack } from "@/server/speed-round/packs/cjl-speed";

describe("speed-round", () => {
  const pack = parseSpeedRoundPack(
    buildCjlSpeedPack("2026-07-20T12:00:00.000Z"),
  );

  it("packs factual kinds only and lasts 60s", () => {
    expect(pack.durationMs).toBe(SPEED_ROUND_DURATION_MS);
    expect(pack.questions.length).toBeGreaterThanOrEqual(20);
    const kinds = new Set(pack.questions.map((q) => q.kind));
    expect(kinds.size).toBe(4);
    for (const q of pack.questions) {
      expect(q.prompt.length).toBeLessThanOrEqual(160);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("scores answers and tracks streak", () => {
    let session = startSpeedSession({
      sessionId: "11111111-1111-4111-8111-111111111111",
      learnerId: "learner-1",
      pack,
      nowIso: "2026-07-20T12:00:00.000Z",
    });
    const q1 = pack.questions.find((q) => q.id === session.queue[0])!;
    const ok = applySpeedAnswer(session, pack, {
      questionId: q1.id,
      optionId: q1.correctOptionId,
      responseMs: 800,
      nowIso: "2026-07-20T12:00:01.000Z",
    })!;
    expect(ok.correct).toBe(true);
    session = ok.session;

    const q2 = pack.questions.find((q) => q.id === session.queue[1])!;
    const wrongOpt = q2.options.find((o) => o.id !== q2.correctOptionId)!;
    const bad = applySpeedAnswer(session, pack, {
      questionId: q2.id,
      optionId: wrongOpt.id,
      responseMs: 1200,
      nowIso: "2026-07-20T12:00:02.000Z",
    })!;
    expect(bad.correct).toBe(false);
    session = bad.session;

    expect(computeBestStreak(session.answers)).toBe(1);

    const summary = summarizeSpeedSession(session, pack);
    expect(summary.score).toBe(1);
    expect(summary.answered).toBe(2);
    expect(summary.accuracyPct).toBe(50);
    expect(summary.avgResponseMs).toBe(1000);
  });

  it("rejects answers after timeout and can finish", () => {
    const session = startSpeedSession({
      sessionId: "22222222-2222-4222-8222-222222222222",
      learnerId: "learner-1",
      pack,
      nowIso: "2026-07-20T12:00:00.000Z",
    });
    const q = pack.questions.find((x) => x.id === session.queue[0])!;
    const after = applySpeedAnswer(session, pack, {
      questionId: q.id,
      optionId: q.correctOptionId,
      responseMs: 500,
      nowIso: "2026-07-20T12:01:01.000Z",
    })!;
    expect(after.completed).toBe(true);
    expect(after.session.status).toBe("completed");
  });
});
