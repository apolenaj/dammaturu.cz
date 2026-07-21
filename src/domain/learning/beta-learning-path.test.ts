import { describe, expect, it } from "vitest";
import {
  adaptTopicOrder,
  betaPathBlueprints,
  buildBetaLearningPath,
  diagnosticFromAreaScores,
  emptyDiagnosticSnapshot,
  flattenPackTopics,
  interleaveByModule,
  resolveSelectorTopics,
  respectPrerequisites,
  type CurriculumPackLike,
  type CurriculumTopicRef,
} from "@/domain/learning/beta-learning-path";
import { buildCurriculumPack } from "@/server/curriculum/build";
import { cjlBetaDefinition } from "@/server/curriculum/definitions/cjl-beta";

function packLike(): CurriculumPackLike {
  const pack = buildCurriculumPack(cjlBetaDefinition, "2026-07-20T12:00:00.000Z");
  return pack;
}

describe("beta-learning-path (D-040)", () => {
  it("resolves phase topics from curriculum pack (not hardcoded titles)", () => {
    const pack = packLike();
    const basics = betaPathBlueprints.find((b) => b.id === "basics")!;
    const topics = basics.selectors.flatMap((s) =>
      resolveSelectorTopics(pack, s),
    );
    const slugs = topics.map((t) => t.slug);
    expect(slugs).toContain("romantismus");
    expect(slugs).toContain("realismus");
    expect(slugs).toContain("homonyma");
    expect(slugs.some((s) => s.startsWith("no-"))).toBe(true);

    const world = betaPathBlueprints.find((b) => b.id === "world_realism")!;
    const worldTopics = world.selectors.flatMap((s) =>
      resolveSelectorTopics(pack, s),
    );
    expect(worldTopics.map((t) => t.slug)).toEqual([
      "realismus-francie",
      "realismus-anglie",
      "realismus-rusko",
    ]);

    const czech = betaPathBlueprints.find((b) => b.id === "czech_lit")!;
    const czechSlugs = czech.selectors.flatMap((s) =>
      resolveSelectorTopics(pack, s).map((t) => t.slug),
    );
    expect(czechSlugs).toContain("rozbor-maj");
    expect(czechSlugs).toContain("rozbor-kytice");
    expect(czechSlugs).toContain("jirasek");
    expect(czechSlugs).toContain("ceske-realisticke-drama");
  });

  it("builds 6 phases until Aug 31 from pack", () => {
    const path = buildBetaLearningPath({
      pack: packLike(),
      diagnostic: emptyDiagnosticSnapshot(),
      now: new Date(2026, 6, 21, 12, 0, 0),
    });
    expect(path.targetDate).toBe("2026-08-31");
    expect(path.phases).toHaveLength(6);
    expect(path.phases.map((p) => p.id)).toEqual([
      "diagnostics",
      "basics",
      "world_realism",
      "czech_lit",
      "interleaved_review",
      "simulation_repair",
    ]);
    expect(path.curriculumSlug).toBe("cjl-beta");
    expect(path.phases[0]!.topics).toHaveLength(0);
    expect(path.phases[1]!.topics.length).toBeGreaterThan(5);
    expect(path.phases[4]!.topics.length).toBeGreaterThan(5);
    expect(path.diagnosticApplied).toBe(false);
  });

  it("adapts basics order so weakest module cluster comes first", () => {
    const pack = packLike();
    const basicsTopics = betaPathBlueprints
      .find((b) => b.id === "basics")!
      .selectors.flatMap((s) => resolveSelectorTopics(pack, s));

    const diagnostic = diagnosticFromAreaScores({
      completed: true,
      areaScores: [
        { id: "jazyk", pct: 20 },
        { id: "literarni-smery", pct: 70 },
        { id: "narodni-obrozeni", pct: 55 },
      ],
      completedAt: "2026-07-21T10:00:00.000Z",
    });

    const { topics, adapted } = adaptTopicOrder(
      basicsTopics,
      diagnostic,
      true,
    );
    expect(adapted).toBe(true);
    expect(topics[0]?.moduleSlug).toBe("jazyk");

    const path = buildBetaLearningPath({
      pack,
      diagnostic,
      now: new Date(2026, 6, 21, 12, 0, 0),
    });
    expect(path.diagnosticApplied).toBe(true);
    expect(path.phases[1]!.adaptedOrder).toBe(true);
    expect(path.phases[1]!.topics[0]?.moduleSlug).toBe("jazyk");
    expect(path.adaptationNoteCs.toLowerCase()).toMatch(/diagnostik/);
  });

  it("respectPrerequisites keeps prereq before dependent", () => {
    const topics: CurriculumTopicRef[] = [
      {
        id: "2",
        slug: "realismus",
        title: "Realismus",
        moduleSlug: "literarni-smery",
        moduleTitle: "Směry",
        orderIndex: 1,
        examRelevance: "critical",
        prerequisiteSlugs: ["romantismus"],
      },
      {
        id: "1",
        slug: "romantismus",
        title: "Romantismus",
        moduleSlug: "literarni-smery",
        moduleTitle: "Směry",
        orderIndex: 0,
        examRelevance: "critical",
        prerequisiteSlugs: [],
      },
    ];
    const ordered = respectPrerequisites(topics);
    expect(ordered.map((t) => t.slug)).toEqual(["romantismus", "realismus"]);
  });

  it("interleaveByModule mixes modules", () => {
    const pack = packLike();
    const all = flattenPackTopics(pack).slice(0, 9);
    const mixed = interleaveByModule(all);
    expect(mixed).toHaveLength(all.length);
    // Not identical to original flat module order for multi-module sets
    const mods = new Set(all.map((t) => t.moduleSlug));
    if (mods.size > 1) {
      expect(mixed.map((t) => t.moduleSlug).join()).not.toBe(
        all.map((t) => t.moduleSlug).join(),
      );
    }
  });

  it("simulation phase prioritizes weak topics after diagnostic", () => {
    const diagnostic = diagnosticFromAreaScores({
      completed: true,
      areaScores: [
        { id: "rozbory", pct: 15 },
        { id: "jazyk", pct: 80 },
        { id: "literarni-smery", pct: 70 },
      ],
      completedAt: "2026-07-21T10:00:00.000Z",
    });
    const path = buildBetaLearningPath({
      pack: packLike(),
      diagnostic,
      now: new Date(2026, 6, 21, 12, 0, 0),
    });
    const sim = path.phases.find((p) => p.id === "simulation_repair")!;
    expect(sim.topics.length).toBeGreaterThan(0);
    expect(sim.topics[0]?.moduleSlug).toBe("rozbory-del");
  });
});
