import { describe, expect, it } from "vitest";
import {
  buildFillChallenge,
  getNeighbors,
  isFillComplete,
  parseConnectionMapPack,
  pathsForRoot,
  scoreFillAnswers,
} from "@/domain/learning/connection-map";
import { buildLiterarniSouvislostiMap } from "@/server/connection-map/packs/literarni-souvislosti";

describe("connection map pack", () => {
  const pack = buildLiterarniSouvislostiMap("2026-07-20T12:00:00.000Z");

  it("parses and covers user example chains", () => {
    const validated = parseConnectionMapPack(pack);
    expect(validated.paths.some((p) => p.slug === "realismus-francie-balzac")).toBe(
      true,
    );
    expect(
      validated.paths.some((p) => p.slug === "realismus-rusko-dostojevskij"),
    ).toBe(true);
    expect(validated.paths.some((p) => p.slug === "no-romantismus-macha")).toBe(
      true,
    );
  });

  it("filters paths by root focus", () => {
    const realism = pathsForRoot(pack, "realismus");
    expect(realism.every((p) => p.rootSlug === "realismus")).toBe(true);
    expect(realism.length).toBeGreaterThanOrEqual(3);
  });

  it("exposes neighbors for learning, not decoration", () => {
    const { outgoing } = getNeighbors(pack, "realismus");
    const titles = outgoing.map((n) => n.slug);
    expect(titles).toContain("francie");
    expect(titles).toContain("rusko");
    expect(titles).toContain("cesko");
  });

  it("builds fill challenge that hides intermediates", () => {
    const path = pack.paths.find((p) => p.slug === "realismus-francie-balzac")!;
    const challenge = buildFillChallenge(pack, path, { hideCount: 2 });
    expect(challenge.blanks.length).toBeGreaterThanOrEqual(1);
    expect(challenge.slots[0]?.hidden).toBe(false);
    expect(challenge.slots[challenge.slots.length - 1]?.hidden).toBe(false);
    const wrong: Record<number, string> = {};
    for (const b of challenge.blanks) wrong[b.index] = "wrong";
    expect(isFillComplete(challenge, wrong)).toBe(false);
    const right: Record<number, string> = {};
    for (const b of challenge.blanks) right[b.index] = b.correctSlug;
    expect(isFillComplete(challenge, right)).toBe(true);
    expect(scoreFillAnswers(challenge, right)).toEqual({
      correct: challenge.blanks.length,
      total: challenge.blanks.length,
    });
  });
});
