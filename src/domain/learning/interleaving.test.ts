import { describe, expect, it } from "vitest";
import {
  describeInterleave,
  interleaveKnowledgeOrder,
  prioritizeForSelection,
  resolveClusterId,
  resolveEntityKey,
  resolveInterleavePhase,
} from "@/domain/learning/interleaving";
import {
  applyPerformance,
  buildMixedReviewQueue,
  createSpacedSchedule,
  emptyScheduleBook,
  type LearnerScheduleBook,
  type SpacedReviewPack,
} from "@/domain/learning/spaced-repetition";
import { buildCjlSpacedPack } from "@/server/spaced-repetition/packs/cjl-spaced";

const NOW = "2026-07-20T12:00:00.000Z";

function stabilizeCluster(
  pack: SpacedReviewPack,
  book: LearnerScheduleBook,
  clusterId: string,
  count: number,
): LearnerScheduleBook {
  const next = { ...book, byKnowledgeId: { ...book.byKnowledgeId } };
  let n = 0;
  for (const k of pack.knowledge) {
    if (resolveClusterId(k) !== clusterId) continue;
    if (n >= count) break;
    let sch = createSpacedSchedule(k.id, NOW);
    sch = applyPerformance(sch, "good", NOW);
    sch = applyPerformance(sch, "good", "2026-07-21T12:00:00.000Z");
    // Force due now for queue tests
    sch = { ...sch, nextReview: NOW, stability: 1.2 };
    next.byKnowledgeId[k.id] = sch;
    n += 1;
  }
  return next;
}

describe("interleaving (D-033)", () => {
  const pack = buildCjlSpacedPack(NOW);

  it("pack has Balzac, Dickens, Dostojevskij, romantismus, realismus, Máj, Kytice", () => {
    const entities = new Set(pack.knowledge.map(resolveEntityKey));
    for (const e of [
      "balzac",
      "dickens",
      "dostojevskij",
      "romantismus",
      "realismus",
      "maj",
      "kytice",
    ]) {
      expect(entities.has(e)).toBe(true);
    }
    expect(pack.knowledge.some((k) => k.tags.includes("distinguish"))).toBe(
      true,
    );
  });

  it("beginner stays in one cluster — no chaos mix", () => {
    const book = emptyScheduleBook("learner", pack, NOW);
    const meta = describeInterleave(pack, book);
    expect(meta.phase).toBe("beginner_focus");
    expect(meta.focusClusterId).toBe("czech-romantic-works");

    const queue = buildMixedReviewQueue({
      pack,
      book,
      nowIso: NOW,
      limits: { maxDue: 18, maxNew: 8 },
    });
    expect(queue.length).toBeGreaterThan(0);
    const byId = new Map(pack.knowledge.map((k) => [k.id, k]));
    for (const q of queue) {
      const k = byId.get(q.knowledgeId)!;
      expect(resolveClusterId(k)).toBe("czech-romantic-works");
    }
  });

  it("full interleave mixes entities and caps same-author spam", () => {
    let book = emptyScheduleBook("learner", pack, NOW);
    book = stabilizeCluster(pack, book, "czech-romantic-works", 3);
    book = stabilizeCluster(pack, book, "movements", 3);
    book = stabilizeCluster(pack, book, "realist-authors", 4);
    book = stabilizeCluster(pack, book, "czech-realist-works", 3);

    expect(resolveInterleavePhase(pack, book)).toBe("full_interleave");

    // Make every scheduled item due
    const byKnowledgeId = { ...book.byKnowledgeId };
    for (const id of Object.keys(byKnowledgeId)) {
      byKnowledgeId[id] = { ...byKnowledgeId[id]!, nextReview: NOW };
    }
    book = { ...book, byKnowledgeId };

    const queue = buildMixedReviewQueue({
      pack,
      book,
      nowIso: NOW,
      limits: { maxDue: 18, maxNew: 0 },
    });
    expect(queue.length).toBeGreaterThanOrEqual(8);

    const byId = new Map(pack.knowledge.map((k) => [k.id, k]));
    const entities = queue.map((q) => resolveEntityKey(byId.get(q.knowledgeId)!));
    const unique = new Set(entities);
    expect(unique.size).toBeGreaterThanOrEqual(4);

    // No 20× Balzac: entity fraction ≤ ~22% + small slack for short queues
    const balzacShare =
      entities.filter((e) => e === "balzac").length / entities.length;
    expect(balzacShare).toBeLessThanOrEqual(0.35);

    // No long same-entity run (full_interleave max = 1, forced may be 2)
    let maxRun = 1;
    let run = 1;
    for (let i = 1; i < entities.length; i += 1) {
      if (entities[i] === entities[i - 1]) {
        run += 1;
        maxRun = Math.max(maxRun, run);
      } else {
        run = 1;
      }
    }
    expect(maxRun).toBeLessThanOrEqual(2);
  });

  it("prioritizeForSelection puts focus cluster first for beginners", () => {
    const book = emptyScheduleBook("learner", pack, NOW);
    const meta = describeInterleave(pack, book);
    const ordered = prioritizeForSelection(pack.knowledge, meta);
    expect(resolveClusterId(ordered[0]!)).toBe(meta.focusClusterId);
  });

  it("interleaveKnowledgeOrder respects max entity run in full phase", () => {
    let book = emptyScheduleBook("learner", pack, NOW);
    book = stabilizeCluster(pack, book, "czech-romantic-works", 2);
    book = stabilizeCluster(pack, book, "movements", 2);
    book = stabilizeCluster(pack, book, "realist-authors", 3);

    const realist = pack.knowledge.filter(
      (k) => resolveClusterId(k) === "realist-authors",
    );
    // Overwhelm with balzac-like by duplicating selection of goriot + dickens + raskolnikov
    const candidates = [...realist, ...realist, ...pack.knowledge.slice(0, 6)];
    const { ordered, meta } = interleaveKnowledgeOrder({
      candidates,
      pack,
      book,
    });
    expect(["light_mix", "full_interleave"]).toContain(meta.phase);

    const entities = ordered.map(resolveEntityKey);
    let maxRun = 1;
    let run = 1;
    for (let i = 1; i < entities.length; i += 1) {
      if (entities[i] === entities[i - 1]) {
        run += 1;
        maxRun = Math.max(maxRun, run);
      } else run = 1;
    }
    expect(maxRun).toBeLessThanOrEqual(
      meta.phase === "full_interleave" ? 2 : 3,
    );
  });
});
