import { describe, expect, it } from "vitest";
import {
  KYTICE_BALLAD_ORDER,
  buildGuiltMatchGame,
  buildRecognizeGame,
  extractBalladSummaryFromSource,
  gradeGuiltMatch,
  gradeRecognize,
  kyticeGameModeLabelsCs,
  parseKyticeExperiencePack,
  type KyticeBallad,
} from "@/domain/learning/kytice-experience";
import { buildKyticeExperiencePack } from "@/server/kytice-experience/build";

describe("kytice-experience (D-043)", () => {
  it("defines 13 ballad slugs and game labels", () => {
    expect(KYTICE_BALLAD_ORDER).toHaveLength(13);
    expect(kyticeGameModeLabelsCs.recognize).toMatch(/Poznej baladu/);
    expect(kyticeGameModeLabelsCs.match).toMatch(/provinění/);
    expect(kyticeGameModeLabelsCs.which).toMatch(/Která balada/);
  });

  it("extracts ballad summary between headers", () => {
    const fake = `\nShrnutí:\n\nKytice\n\nDětem zemřela matka.\n\nPoklad\n\nŽena šla ke skále.\n`;
    const s = extractBalladSummaryFromSource(fake, "Kytice", [
      "Kytice",
      "Poklad",
    ]);
    expect(s).toContain("Dětem zemřela matka");
    expect(s).not.toContain("Žena šla");
  });

  it("builds pack from verified SOURCE with 13 ballads + games", async () => {
    const pack = await buildKyticeExperiencePack();
    const parsed = parseKyticeExperiencePack(pack);
    expect(parsed.ballads).toHaveLength(13);
    expect(parsed.requiresVerifiedOnly).toBe(true);
    expect(parsed.sourceFilename).toBe("Kytice.docx");
    for (const b of parsed.ballads) {
      expect(b.evidence.validationStatus).toMatch(/verified_from_source|corrected/);
      expect(b.evidence.filename).toBe("Kytice.docx");
      expect(b.storyBrief.length).toBeGreaterThan(20);
      expect(b.mainConflict.length).toBeGreaterThan(5);
      expect(b.guilt.length).toBeGreaterThan(5);
      expect(b.punishment.length).toBeGreaterThan(5);
      expect(b.motif.length).toBeGreaterThan(3);
      expect(b.memorablePoint.length).toBeGreaterThan(5);
    }
    expect(parsed.games.recognizeByStory.length).toBeGreaterThanOrEqual(5);
    expect(parsed.games.matchGuiltConsequence.length).toBeGreaterThanOrEqual(5);
    expect(parsed.games.whichBallad.length).toBeGreaterThanOrEqual(5);
    expect(
      parsed.ballads.filter((b) => b.storyReconstructionSlug).length,
    ).toBeGreaterThanOrEqual(3);
  }, 60_000);

  it("grades recognize and match games", () => {
    const ballads = [
      stubBallad("a", "A", "story A long enough here"),
      stubBallad("b", "B", "story B long enough here"),
      stubBallad("c", "C", "story C long enough here"),
      stubBallad("d", "D", "story D long enough here"),
      stubBallad("e", "E", "story E long enough here"),
    ];
    const recognize = buildRecognizeGame(ballads);
    expect(gradeRecognize(recognize[0]!, recognize[0]!.correctIndex)).toBe(true);
    const match = buildGuiltMatchGame(ballads);
    const mapping = Object.fromEntries(
      match.map((p) => [p.id, p.punishment]),
    );
    expect(gradeGuiltMatch(match, mapping).perfect).toBe(true);
  });
});

function stubBallad(
  slug: string,
  title: string,
  story: string,
): KyticeBallad {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    slug,
    title,
    orderIndex: 0,
    storyBrief: story,
    mainConflict: `Konflikt ${title}`,
    guilt: `Vina ${title}`,
    punishment: `Trest ${title}`,
    motif: `motiv ${title}`,
    memorablePoint: `bod ${title}`,
    evidence: {
      qaItemId: "q",
      knowledgeUnitId: "k",
      publishedStatement: story,
      validationStatus: "verified_from_source",
      filename: "Kytice.docx",
    },
    storyReconstructionSlug: null,
  };
}
