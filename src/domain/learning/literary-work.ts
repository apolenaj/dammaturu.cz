import { z } from "zod";

/**
 * Literary work hub (D-042) — generic schema for matura rozbory.
 * One UI route `/app/learn/dilo/[slug]`; content from packs (Máj, Kytice, Babička…).
 * Never hardcode three separate pages.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const literaryWorkSectionIds = [
  "quick_grasp",
  "author_context",
  "themes_motifs",
  "spacetime",
  "composition",
  "genre",
  "characters",
  "plot",
  "language",
  "tropes",
  "exam_talking_points",
  "common_mistakes",
  "test",
  "oral_exam",
] as const;

export type LiteraryWorkSectionId = (typeof literaryWorkSectionIds)[number];

export const literaryWorkSectionIdSchema = z.enum(literaryWorkSectionIds);

export const literaryWorkSectionLabelsCs: Record<
  LiteraryWorkSectionId,
  string
> = {
  quick_grasp: "Rychle pochopit",
  author_context: "Autor a kontext",
  themes_motifs: "Téma a motivy",
  spacetime: "Časoprostor",
  composition: "Kompozice",
  genre: "Žánr a druh",
  characters: "Postavy",
  plot: "Děj",
  language: "Jazyk",
  tropes: "Tropy a figury",
  exam_talking_points: "Co říct u zkoušky",
  common_mistakes: "Časté chyby",
  test: "Test",
  oral_exam: "Ústní zkouška",
};

export const literaryBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("paragraph"),
    text: z.string().min(1).max(4000),
  }),
  z.object({
    type: z.literal("bullets"),
    items: z.array(z.string().min(1).max(500)).min(1).max(24),
  }),
  z.object({
    type: z.literal("callout"),
    tone: z.enum(["info", "warning", "success", "brand"]),
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(1200),
  }),
  z.object({
    type: z.literal("key_value"),
    pairs: z
      .array(
        z.object({
          label: z.string().min(1).max(80),
          value: z.string().min(1).max(400),
        }),
      )
      .min(1)
      .max(20),
  }),
  z.object({
    type: z.literal("character"),
    name: z.string().min(1).max(120),
    role: z.string().min(1).max(160),
    traits: z.array(z.string().min(1).max(200)).min(1).max(12),
  }),
  z.object({
    type: z.literal("quiz"),
    id: z.string().min(1).max(64),
    question: z.string().min(1).max(400),
    options: z.array(z.string().min(1).max(240)).min(2).max(6),
    correctIndex: z.number().int().min(0).max(5),
    explanation: z.string().min(1).max(600),
  }),
  z.object({
    type: z.literal("oral_prompt"),
    id: z.string().min(1).max(64),
    prompt: z.string().min(1).max(400),
    tips: z.array(z.string().min(1).max(300)).min(1).max(8),
  }),
  z.object({
    type: z.literal("link_cta"),
    label: z.string().min(1).max(80),
    href: z.string().min(1).max(200),
  }),
]);

export type LiteraryBlock = z.infer<typeof literaryBlockSchema>;

export const literaryWorkSectionSchema = z.object({
  id: literaryWorkSectionIdSchema,
  /** Optional override; default = literaryWorkSectionLabelsCs[id]. */
  titleCs: z.string().min(1).max(80).optional(),
  summaryCs: z.string().min(1).max(280).optional(),
  blocks: z.array(literaryBlockSchema).min(1).max(40),
});

export type LiteraryWorkSection = z.infer<typeof literaryWorkSectionSchema>;

export const literaryWorkRelatedSchema = z.object({
  curriculumTopicSlug: z.string().min(1).max(120),
  sourceFilename: z.string().min(1).max(260),
  quickGraspHref: z.string().max(200).optional(),
  reconstructionHref: z.string().max(200).optional(),
  testHref: z.string().max(200).optional(),
  teachBackHref: z.string().max(200).optional(),
});

export const literaryWorkSchema = z
  .object({
    id: z.string().uuid(),
    slug: slugSchema,
    title: z.string().min(1).max(160),
    author: z.string().min(1).max(120),
    yearPublished: z.number().int().min(1000).max(2100).nullable(),
    workType: z.string().min(1).max(80),
    movement: z.string().min(1).max(80),
    summary: z.string().min(1).max(500),
    related: literaryWorkRelatedSchema,
    sections: z.array(literaryWorkSectionSchema).length(14),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((work, ctx) => {
    const ids = work.sections.map((s) => s.id);
    const set = new Set(ids);
    for (const required of literaryWorkSectionIds) {
      if (!set.has(required)) {
        ctx.addIssue({
          code: "custom",
          message: `Chybí sekce ${required}`,
          path: ["sections"],
        });
      }
    }
    if (set.size !== 14) {
      ctx.addIssue({
        code: "custom",
        message: "Sekce musí být unikátní (14 tabů)",
        path: ["sections"],
      });
    }
  });

export type LiteraryWork = z.infer<typeof literaryWorkSchema>;

export function parseLiteraryWork(raw: unknown): LiteraryWork {
  return literaryWorkSchema.parse(raw);
}

export function sectionTitleCs(section: LiteraryWorkSection): string {
  return section.titleCs ?? literaryWorkSectionLabelsCs[section.id];
}

export function orderSections(
  sections: LiteraryWorkSection[],
): LiteraryWorkSection[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  return literaryWorkSectionIds.map((id) => {
    const s = byId.get(id);
    if (!s) throw new Error(`Missing section ${id}`);
    return s;
  });
}

/** Draft helper — pack authors fill section map; builder enforces order + schema. */
export type LiteraryWorkDraft = {
  slug: string;
  title: string;
  author: string;
  yearPublished: number | null;
  workType: string;
  movement: string;
  summary: string;
  related: LiteraryWork["related"];
  sections: Record<LiteraryWorkSectionId, Omit<LiteraryWorkSection, "id">>;
};

export function buildLiteraryWork(
  draft: LiteraryWorkDraft,
  ids: { workId: string; nowIso: string },
): LiteraryWork {
  const sections = literaryWorkSectionIds.map((id) => ({
    id,
    ...draft.sections[id],
  }));
  return parseLiteraryWork({
    id: ids.workId,
    slug: draft.slug,
    title: draft.title,
    author: draft.author,
    yearPublished: draft.yearPublished,
    workType: draft.workType,
    movement: draft.movement,
    summary: draft.summary,
    related: draft.related,
    sections: orderSections(sections),
    createdAt: ids.nowIso,
    updatedAt: ids.nowIso,
  });
}

export type LiteraryWorkListItem = {
  slug: string;
  title: string;
  author: string;
  yearPublished: number | null;
  workType: string;
  movement: string;
  summary: string;
  href: string;
};

export function toLiteraryWorkListItem(work: LiteraryWork): LiteraryWorkListItem {
  return {
    slug: work.slug,
    title: work.title,
    author: work.author,
    yearPublished: work.yearPublished,
    workType: work.workType,
    movement: work.movement,
    summary: work.summary,
    href: `/app/learn/dilo/${work.slug}`,
  };
}
