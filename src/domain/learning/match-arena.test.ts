import { describe, expect, it } from "vitest";
import {
  applyMatchAttempt,
  enqueueWrongPair,
  emptyReviewQueue,
  gradeMatch,
  parseMatchArenaPack,
  startMatchSession,
  summarizeMatchSession,
} from "@/domain/learning/match-arena";
import { buildLiterarniParyPack } from "@/server/match-arena/packs/literarni-pary";

describe("match-arena", () => {
  const pack = parseMatchArenaPack(buildLiterarniParyPack("2026-07-20T12:00:00.000Z"));

  it("parses pack with all six pair kinds", () => {
    const kinds = new Set(pack.pairs.map((p) => p.kind));
    expect(kinds.size).toBe(6);
    expect(pack.rounds).toHaveLength(6);
    expect(pack.pairs.length).toBeGreaterThanOrEqual(24);
  });

  it("grades correct and wrong matches with explanation", () => {
    const pair = pack.pairs[0]!;
    const ok = gradeMatch({
      pack,
      leftId: pair.left.id,
      rightId: pair.right.id,
    });
    expect(ok?.correct).toBe(true);

    const other = pack.pairs.find(
      (p) => p.kind === pair.kind && p.id !== pair.id,
    )!;
    const bad = gradeMatch({
      pack,
      leftId: pair.left.id,
      rightId: other.right.id,
    });
    expect(bad?.correct).toBe(false);
    expect(bad?.explanation).toContain(pair.right.label);
    expect(bad?.explanation).toContain(pair.explanation.slice(0, 20));
  });

  it("advances rounds and completes session", () => {
    let session = startMatchSession({
      sessionId: "11111111-1111-4111-8111-111111111111",
      learnerId: "learner-1",
      pack,
      nowIso: "2026-07-20T12:00:00.000Z",
    });
    expect(session.openPairIds).toHaveLength(4);

    // solve first round
    for (const pairId of [...session.openPairIds]) {
      const pair = pack.pairs.find((p) => p.id === pairId)!;
      const res = applyMatchAttempt(session, pack, {
        leftId: pair.left.id,
        rightId: pair.right.id,
        elapsedMs: 800,
        nowIso: "2026-07-20T12:00:01.000Z",
      });
      expect(res).not.toBeNull();
      session = res!.session;
    }
    expect(session.cursor).toBe(1);
    expect(session.openPairIds.length).toBe(4);
  });

  it("enqueues wrong pairs and summarizes weak pairs", () => {
    let session = startMatchSession({
      sessionId: "22222222-2222-4222-8222-222222222222",
      learnerId: "learner-1",
      pack,
      nowIso: "2026-07-20T12:00:00.000Z",
    });
    const pair = pack.pairs.find((p) => p.id === session.openPairIds[0])!;
    const other = pack.pairs.find(
      (p) => p.kind === pair.kind && p.id !== pair.id,
    )!;

    const wrong = applyMatchAttempt(session, pack, {
      leftId: pair.left.id,
      rightId: other.right.id,
      elapsedMs: 2400,
      nowIso: "2026-07-20T12:00:02.000Z",
    })!;
    session = wrong.session;
    expect(wrong.grade.correct).toBe(false);

    let queue = emptyReviewQueue(
      "learner-1",
      pack,
      "2026-07-20T12:00:02.000Z",
    );
    queue = enqueueWrongPair(
      queue,
      pair.id,
      2400,
      "2026-07-20T12:00:02.000Z",
    );
    expect(queue.pairIds[0]).toBe(pair.id);
    expect(queue.byPairId[pair.id]?.wrongCount).toBe(1);

    // finish remaining correctly including the failed pair
    const open = [...session.openPairIds];
    for (const pairId of open) {
      const p = pack.pairs.find((x) => x.id === pairId)!;
      const res = applyMatchAttempt(session, pack, {
        leftId: p.left.id,
        rightId: p.right.id,
        elapsedMs: 500,
        nowIso: "2026-07-20T12:00:03.000Z",
      })!;
      session = res.session;
    }

    // complete all rounds quickly for summary shape
    while (session.status === "active") {
      for (const pairId of [...session.openPairIds]) {
        const p = pack.pairs.find((x) => x.id === pairId)!;
        const res = applyMatchAttempt(session, pack, {
          leftId: p.left.id,
          rightId: p.right.id,
          elapsedMs: 400,
          nowIso: "2026-07-20T12:05:00.000Z",
        })!;
        session = res.session;
      }
    }

    const summary = summarizeMatchSession(session, pack);
    expect(summary.wrongCount).toBeGreaterThanOrEqual(1);
    expect(summary.accuracyPct).toBeLessThan(100);
    expect(summary.weakPairs[0]?.pairId).toBe(pair.id);
    expect(summary.avgMs).toBeGreaterThan(0);
  });
});
