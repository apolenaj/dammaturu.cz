import { describe, expect, it } from "vitest";
import { buildCurriculumPack, getTopicDependencyGraph } from "@/server/curriculum/build";
import { cjlBetaDefinition } from "@/server/curriculum/definitions/cjl-beta";
import { deterministicUuid } from "@/server/curriculum/ids";

describe("deterministicUuid", () => {
  it("is stable for the same key", () => {
    expect(deterministicUuid("ns", "a")).toBe(deterministicUuid("ns", "a"));
    expect(deterministicUuid("ns", "a")).not.toBe(deterministicUuid("ns", "b"));
  });
});

describe("CJL beta curriculum", () => {
  const pack = buildCurriculumPack(cjlBetaDefinition, "2026-07-20T12:00:00.000Z");

  it("builds subject + 6 modules A–F", () => {
    expect(pack.subject.slug).toBe("cesky-jazyk-a-literatura");
    expect(pack.curriculum.slug).toBe("cjl-beta");
    expect(pack.modules.map((m) => m.code)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
    ]);
  });

  it("includes expected topic counts", () => {
    const counts = Object.fromEntries(
      pack.modules.map((m) => [m.code, m.topics.length]),
    );
    expect(counts).toEqual({ A: 5, B: 4, C: 9, D: 4, E: 6, F: 3 });
  });

  it("builds an acyclic topic dependency graph", () => {
    expect(pack.topicPrerequisites.length).toBeGreaterThan(10);
    const graph = getTopicDependencyGraph(pack);
    const maj = graph.find((n) => n.slug === "rozbor-maj");
    expect(maj?.prerequisiteTopicIds.length).toBe(2);
  });

  it("links source DOCX to topics", () => {
    const maj = pack.modules
      .flatMap((m) => m.topics)
      .find((t) => t.slug === "rozbor-maj");
    expect(maj?.sourceFilenames).toContain("Máj.docx");
  });

  it("is idempotent on rebuild", () => {
    const again = buildCurriculumPack(
      cjlBetaDefinition,
      "2026-07-20T12:00:00.000Z",
    );
    expect(again.curriculum.id).toBe(pack.curriculum.id);
    expect(again.modules[0]!.id).toBe(pack.modules[0]!.id);
  });
});
