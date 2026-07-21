import { describe, expect, it } from "vitest";
import {
  countWords,
  gradeTeachBackAnswer,
  parseTeachPack,
} from "@/domain/learning/teach-it-back";
import { buildCjlTeachBackPack } from "@/server/teach-it-back/packs/cjl-teach-back";

describe("teach-it-back (D-035)", () => {
  const pack = parseTeachPack(buildCjlTeachBackPack("2026-07-20T12:00:00.000Z"));
  const diffPrompt = pack.prompts.find(
    (p) => p.slug === "realismus-vs-romantismus",
  )!;
  const majPrompt = pack.prompts.find((p) => p.slug === "maj-romanticke")!;

  it("pack includes the two canonical teach-back prompts", () => {
    expect(diffPrompt.prompt).toMatch(/rozdíl mezi realismem a romantismem/i);
    expect(majPrompt.prompt).toMatch(/Máj romantické/i);
  });

  it("grades a solid short answer as strong — not by length", () => {
    const short = gradeTeachBackAnswer(
      diffPrompt,
      "Romantismus staví na citu a subjektivitě a konfliktu jedince se společností. Realismus typizuje všední život, sleduje sociální prostředí a drží objektivnější odstup.",
    );
    expect(short.wordCount).toBeLessThan(80);
    expect(short.explainedWell.length).toBeGreaterThanOrEqual(3);
    expect(short.inaccurate).toHaveLength(0);
    expect(short.result).toBe("strong");
    expect(short.lengthWithoutSubstance).toBe(false);
  });

  it("does not reward long empty prose", () => {
    const fluff =
      "No tak literární směry jsou prostě důležité a člověk by měl vědět spoustu věcí o knížkách a autorech a vůbec o kultuře protože maturita je důležitá a člověk se musí učit hodně hodin každý den a číst spoustu textů a přemýšlet o tom jak to všechno souvisí se životem a s tím co se děje kolem nás a ještě jednou je to důležité a ještě jednou protože délka textu sama o sobě nic neznamená ale já přesto píšu dlouho bez konkrétních znaků směrů.";
    expect(countWords(fluff)).toBeGreaterThanOrEqual(80);
    const grade = gradeTeachBackAnswer(diffPrompt, fluff);
    expect(grade.explainedWell.length).toBe(0);
    expect(grade.result).toBe("weak");
    expect(grade.lengthWithoutSubstance).toBe(true);
    expect(grade.coachingNoteCs).toMatch(/Dlouhý text nestačí/);
  });

  it("flags inaccurate swaps (romantismus ↔ realismus)", () => {
    const grade = gradeTeachBackAnswer(
      diffPrompt,
      "Romantismus typizuje všední život a sociální prostředí. Realismus je o subjektivitě a citu.",
    );
    expect(grade.inaccurate.length).toBeGreaterThan(0);
    expect(grade.result).not.toBe("strong");
  });

  it("shows missing checklist for thin Máj answer", () => {
    const grade = gradeTeachBackAnswer(majPrompt, "Máj je prostě hezká báseň.");
    expect(grade.result).toBe("weak");
    expect(grade.missing.length).toBeGreaterThan(0);
    expect(grade.excellentAnswer.length).toBeGreaterThan(40);
  });

  it("covers Máj romantism criteria", () => {
    const grade = gradeTeachBackAnswer(
      majPrompt,
      "Máj je romantické dílo: subjektivita a cit, výjimečný hrdina Vilém, konflikt se společností, příroda zrcadlí city a lyrickoepická forma.",
    );
    expect(grade.explainedWell.length).toBeGreaterThanOrEqual(3);
    expect(grade.result).toBe("strong");
  });

  it("exposes feedback buckets", () => {
    const grade = gradeTeachBackAnswer(
      diffPrompt,
      "Romantismus: cit a subjektivita. Realismus: typizace.",
    );
    expect(Array.isArray(grade.explainedWell)).toBe(true);
    expect(Array.isArray(grade.missing)).toBe(true);
    expect(Array.isArray(grade.inaccurate)).toBe(true);
    expect(grade.excellentAnswer).toBe(diffPrompt.excellentAnswer);
  });
});
