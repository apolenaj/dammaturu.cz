import { describe, expect, it } from "vitest";
import {
  literaryWorkSectionIds,
  literaryWorkSectionLabelsCs,
  parseLiteraryWork,
  toLiteraryWorkListItem,
} from "@/domain/learning/literary-work";
import { buildCjlLiteraryWorks } from "@/server/literary-work/packs/cjl-rozbory";

describe("literary-work (D-042)", () => {
  it("exposes all 14 required section labels", () => {
    expect(literaryWorkSectionIds).toHaveLength(14);
    expect(literaryWorkSectionLabelsCs.quick_grasp).toBe("Rychle pochopit");
    expect(literaryWorkSectionLabelsCs.author_context).toBe("Autor a kontext");
    expect(literaryWorkSectionLabelsCs.themes_motifs).toBe("Téma a motivy");
    expect(literaryWorkSectionLabelsCs.spacetime).toBe("Časoprostor");
    expect(literaryWorkSectionLabelsCs.composition).toBe("Kompozice");
    expect(literaryWorkSectionLabelsCs.genre).toBe("Žánr a druh");
    expect(literaryWorkSectionLabelsCs.characters).toBe("Postavy");
    expect(literaryWorkSectionLabelsCs.plot).toBe("Děj");
    expect(literaryWorkSectionLabelsCs.language).toBe("Jazyk");
    expect(literaryWorkSectionLabelsCs.tropes).toBe("Tropy a figury");
    expect(literaryWorkSectionLabelsCs.exam_talking_points).toBe(
      "Co říct u zkoušky",
    );
    expect(literaryWorkSectionLabelsCs.common_mistakes).toBe("Časté chyby");
    expect(literaryWorkSectionLabelsCs.test).toBe("Test");
    expect(literaryWorkSectionLabelsCs.oral_exam).toBe("Ústní zkouška");
  });

  it("builds maj, kytice, babicka from generic schema (not 3 page types)", () => {
    const works = buildCjlLiteraryWorks();
    expect(works.map((w) => w.slug).sort()).toEqual([
      "babicka",
      "kytice",
      "maj",
    ]);
    for (const work of works) {
      const parsed = parseLiteraryWork(work);
      expect(parsed.sections).toHaveLength(14);
      expect(parsed.sections.map((s) => s.id)).toEqual([
        ...literaryWorkSectionIds,
      ]);
      expect(parsed.related.curriculumTopicSlug).toMatch(/^rozbor-/);
      expect(parsed.related.sourceFilename).toMatch(/\.docx$/);
    }
  });

  it("list items point to generic /app/learn/dilo/[slug]", () => {
    const work = buildCjlLiteraryWorks()[0]!;
    const item = toLiteraryWorkListItem(work);
    expect(item.href).toBe(`/app/learn/dilo/${work.slug}`);
  });

  it("rejects work missing a section", () => {
    const work = buildCjlLiteraryWorks()[0]!;
    const broken = {
      ...work,
      sections: work.sections.filter((s) => s.id !== "tropes"),
    };
    expect(() => parseLiteraryWork(broken)).toThrow();
  });
});
