import { describe, expect, it } from "vitest";
import {
  filterEventsByKinds,
  filterEventsByRange,
  isChronologicalOrder,
  pickChronoQuizPairs,
  sortEventsChronologically,
} from "@/domain/learning/timeline";
import { buildLiterarniHistorieTimeline } from "@/server/timeline/packs/literarni-historie";

describe("literary history timeline pack", () => {
  const pack = buildLiterarniHistorieTimeline("2026-07-20T12:00:00.000Z");

  it("covers NO, romantismus, realismus eras", () => {
    const eras = new Set(pack.events.flatMap((e) => e.eras));
    expect(eras.has("narodni-obrozeni")).toBe(true);
    expect(eras.has("romantismus")).toBe(true);
    expect(eras.has("realismus")).toBe(true);
  });

  it("has all event kinds", () => {
    const kinds = new Set(pack.events.map((e) => e.kind));
    expect(kinds.has("author")).toBe(true);
    expect(kinds.has("work")).toBe(true);
    expect(kinds.has("event")).toBe(true);
    expect(kinds.has("movement")).toBe(true);
  });

  it("filters by zoom and kind", () => {
    const no = filterEventsByRange(pack.events, 1770, 1860);
    expect(no.length).toBeGreaterThan(5);
    const authors = filterEventsByKinds(no, ["author"]);
    expect(authors.every((e) => e.kind === "author")).toBe(true);
  });

  it("builds chrono quiz and validates order", () => {
    const sorted = sortEventsChronologically(pack.events);
    const pairs = pickChronoQuizPairs(sorted, 3);
    expect(pairs.length).toBeGreaterThan(0);
    const ids = sorted.slice(0, 4).map((e) => e.id);
    expect(isChronologicalOrder(ids, ids)).toBe(true);
    expect(isChronologicalOrder([...ids].reverse(), ids)).toBe(false);
  });
});
