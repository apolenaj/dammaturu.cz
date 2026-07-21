import { describe, expect, it } from "vitest";
import {
  buildReadinessSnapshot,
  formatWeekDeltaCs,
  readinessDisclaimerCs,
  stateWithScore,
  type ReadinessBook,
} from "@/domain/learning/readiness";
import { buildDemoReadinessBook } from "@/server/readiness/seed";

describe("readiness (D-036)", () => {
  const NOW = "2026-07-20T12:00:00.000Z";

  it("demo book targets ~64 % overall and area bars", () => {
    const book = buildDemoReadinessBook("learner", NOW);
    const snap = buildReadinessSnapshot(book, NOW);
    expect(snap.overallPct).toBeGreaterThanOrEqual(62);
    expect(snap.overallPct).toBeLessThanOrEqual(66);
    expect(snap.labeledAs).toBe("mastery_coverage");
    expect(snap.disclaimerCs).toBe(readinessDisclaimerCs);
    expect(snap.disclaimerCs.toLowerCase()).toMatch(/predikce|šance|pravděpodobnost|maturity/);

    const byId = Object.fromEntries(snap.areas.map((a) => [a.id, a.pct]));
    expect(byId["literarni-smery"]).toBeGreaterThanOrEqual(78);
    expect(byId["autori-dila"]).toBeGreaterThanOrEqual(55);
    expect(byId["autori-dila"]).toBeLessThanOrEqual(65);
    expect(byId["rozbory"]).toBeLessThanOrEqual(52);
    expect(byId["jazyk"]).toBeGreaterThanOrEqual(70);
  });

  it("shows week delta vs history", () => {
    const book = buildDemoReadinessBook("learner", NOW);
    const snap = buildReadinessSnapshot(book, NOW);
    expect(snap.weekDeltaPct).toBe(5);
    expect(formatWeekDeltaCs(snap.weekDeltaPct)).toBe("+5 % tento týden");
  });

  it("exposes 3 strong and 3 weak with session links", () => {
    const book = buildDemoReadinessBook("learner", NOW);
    const snap = buildReadinessSnapshot(book, NOW);
    expect(snap.strongAreas).toHaveLength(3);
    expect(snap.weakAreas).toHaveLength(3);
    expect(snap.weakAreas[0]!.pct).toBeLessThanOrEqual(snap.weakAreas[2]!.pct);
    for (const w of snap.weakAreas) {
      expect(w.sessionHref.startsWith("/app/")).toBe(true);
      expect(w.sessionLabelCs.length).toBeGreaterThan(3);
    }
    // weakest should be rozbory in demo
    expect(snap.weakAreas[0]!.id).toBe("rozbory");
  });

  it("does not invent P(pass) — aggregate from mastery only", () => {
    const book: ReadinessBook = {
      learnerId: "x",
      updatedAt: NOW,
      weeklyHistory: [],
      units: [
        {
          id: "ku-a",
          title: "A",
          areaId: "jazyk",
          examWeight: 1,
          state: stateWithScore("ku-a", 100, NOW, 5),
        },
        {
          id: "ku-b",
          title: "B",
          areaId: "jazyk",
          examWeight: 1,
          state: stateWithScore("ku-b", 0, NOW, 0),
        },
      ],
    };
    const snap = buildReadinessSnapshot(book, NOW);
    expect(snap.overallPct).toBe(50);
    expect(snap.disclaimerCs).not.toMatch(/složíš|uspěješ|pravděpodobnost úspěchu/i);
  });
});
