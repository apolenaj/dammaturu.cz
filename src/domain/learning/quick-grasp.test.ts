import { describe, expect, it } from "vitest";
import {
  assertQuickGraspStructure,
  computeQuickGraspStats,
  parseQuickGraspPack,
} from "@/domain/learning/quick-grasp";
import { buildRealismusQuickGrasp } from "@/server/quick-grasp/packs/realismus";

describe("Realismus Rychle pochopit", () => {
  const pack = buildRealismusQuickGrasp("2026-07-20T12:00:00.000Z");

  it("has 6 micros + 2 checkpoints (8 steps)", () => {
    expect(pack.steps).toHaveLength(8);
    expect(pack.steps.filter((s) => s.type === "micro")).toHaveLength(6);
    expect(pack.steps.filter((s) => s.type === "checkpoint")).toHaveLength(2);
  });

  it("places checkpoints after 3 micros", () => {
    expect(pack.steps[3]!.type).toBe("checkpoint");
    expect(pack.steps[7]!.type).toBe("checkpoint");
  });

  it("each micro has idea + example + check", () => {
    for (const step of pack.steps) {
      if (step.type !== "micro") continue;
      expect(step.idea.length).toBeGreaterThan(10);
      expect(step.example.length).toBeGreaterThan(10);
      expect(step.check.choices.length).toBeGreaterThanOrEqual(2);
      expect(step.estimatedSeconds).toBeGreaterThanOrEqual(90);
      expect(step.estimatedSeconds).toBeLessThanOrEqual(300);
    }
  });

  it("computes progress labels", () => {
    const mid = computeQuickGraspStats(pack, {
      learnerId: "x",
      packId: pack.id,
      packSlug: pack.slug,
      currentStepIndex: 3,
      completedStepIds: pack.steps.slice(0, 3).map((s) => s.id),
      checksAnswered: 3,
      checksCorrect: 2,
      status: "in_progress",
      startedAt: "2026-07-20T12:00:00.000Z",
      completedAt: null,
      updatedAt: "2026-07-20T12:05:00.000Z",
    });
    expect(mid.label).toBe("3/8 bloků");
    expect(mid.remainingLabel).toMatch(/min zbývá/);
    expect(mid.successRate).toBeCloseTo(2 / 3);
  });
});

describe("assertQuickGraspStructure", () => {
  it("rejects checkpoint too early", () => {
    const pack = buildRealismusQuickGrasp("2026-07-20T12:00:00.000Z");
    const micros = pack.steps.filter((s) => s.type === "micro");
    const checkpoints = pack.steps.filter((s) => s.type === "checkpoint");
    const broken = {
      ...pack,
      steps: [
        micros[0]!,
        micros[1]!,
        checkpoints[0]!, // only 2 micros — invalid
        micros[2]!,
        micros[3]!,
        micros[4]!,
        checkpoints[1]!,
      ],
    };
    expect(() => assertQuickGraspStructure(broken as typeof pack)).toThrow(
      /checkpoint/,
    );
  });

  it("round-trips parse", () => {
    const pack = buildRealismusQuickGrasp("2026-07-20T12:00:00.000Z");
    expect(parseQuickGraspPack(JSON.parse(JSON.stringify(pack))).slug).toBe(
      "realismus",
    );
  });
});
