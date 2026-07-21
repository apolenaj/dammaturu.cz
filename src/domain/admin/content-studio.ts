import { z } from "zod";
import { publishStatuses, publishStatusSchema } from "@/domain/content/schemas";

/**
 * Admin Content Studio (D-048).
 * Typed forms only — never expose raw JSON to ordinary admins.
 */

export const studioEntityKinds = [
  "subject",
  "topic",
  "lesson",
  "knowledge_unit",
  "work",
  "author",
  "question",
  "flashcard",
  "exercise",
] as const;

export type StudioEntityKind = (typeof studioEntityKinds)[number];

export const studioEntityKindLabelsCs: Record<StudioEntityKind, string> = {
  subject: "Subjects",
  topic: "Topics",
  lesson: "Lessons",
  knowledge_unit: "Knowledge units",
  work: "Works",
  author: "Authors",
  question: "Questions",
  flashcard: "Flashcards",
  exercise: "Exercises",
};

export const studioVerificationStatuses = [
  "verified_from_source",
  "needs_fact_check",
  "corrected",
  "rejected",
  "not_linked",
  "draft_unverified",
] as const;

export type StudioVerificationStatus =
  (typeof studioVerificationStatuses)[number];

export const studioVerificationLabelsCs: Record<
  StudioVerificationStatus,
  string
> = {
  verified_from_source: "verified_from_source",
  needs_fact_check: "needs_fact_check",
  corrected: "corrected",
  rejected: "rejected",
  not_linked: "not_linked",
  draft_unverified: "draft_unverified",
};

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** Provenance + audit fields required on every studio list row. */
export const studioProvenanceSchema = z.object({
  sourceFilename: z.string().min(1).max(260).nullable(),
  sourceExcerpt: z.string().max(500).nullable(),
  verificationStatus: z.enum(studioVerificationStatuses),
  lastEditor: z.string().min(1).max(120),
  lastUpdate: z.string().datetime(),
});

export type StudioProvenance = z.infer<typeof studioProvenanceSchema>;

export const studioListItemSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(studioEntityKinds),
  title: z.string().min(1).max(240),
  slug: z.string().min(1).max(120).nullable(),
  status: publishStatusSchema,
  summary: z.string().max(400).nullable(),
  hrefStudent: z.string().max(200).nullable(),
  provenance: studioProvenanceSchema,
  /** Opaque ref into underlying store (pack id, qa id, …). */
  backendRef: z.string().min(1).max(200),
});

export type StudioListItem = z.infer<typeof studioListItemSchema>;

/** Typed editable fields — no free-form JSON bag for admins. */
export const studioEditFieldsSchema = z.object({
  title: z.string().min(1).max(240),
  slug: slugSchema.nullable().optional(),
  summary: z.string().max(2000).nullable().optional(),
  status: publishStatusSchema.optional(),
  sourceFilename: z.string().max(260).nullable().optional(),
  sourceExcerpt: z.string().max(500).nullable().optional(),
  /** Lesson / exercise body as structured lines — not raw JSON. */
  bodyLines: z.array(z.string().min(1).max(500)).max(40).optional(),
  /** Flashcard / question prompt + answer. */
  prompt: z.string().max(800).optional(),
  answer: z.string().max(800).optional(),
  authorName: z.string().max(160).optional(),
  workTitle: z.string().max(200).optional(),
  objective: z.string().max(400).optional(),
  estimatedMinutes: z.number().int().min(3).max(90).optional(),
});

export type StudioEditFields = z.infer<typeof studioEditFieldsSchema>;

export const studioVersionEntrySchema = z.object({
  id: z.string().uuid(),
  entityId: z.string().min(1).max(80),
  kind: z.enum(studioEntityKinds),
  version: z.number().int().positive(),
  editor: z.string().min(1).max(120),
  note: z.string().max(280).nullable(),
  /** Snapshot of editable fields at save time. */
  fields: studioEditFieldsSchema,
  createdAt: z.string().datetime(),
});

export type StudioVersionEntry = z.infer<typeof studioVersionEntrySchema>;

export const studioBulkActions = [
  "set_draft",
  "set_needs_review",
  "set_published",
  "set_archived",
] as const;

export type StudioBulkAction = (typeof studioBulkActions)[number];

export const studioBulkActionLabelsCs: Record<StudioBulkAction, string> = {
  set_draft: "Nastavit draft",
  set_needs_review: "Nastavit needs_review",
  set_published: "Publikovat",
  set_archived: "Archivovat",
};

export function bulkActionToStatus(
  action: StudioBulkAction,
): (typeof publishStatuses)[number] {
  switch (action) {
    case "set_draft":
      return "draft";
    case "set_needs_review":
      return "needs_review";
    case "set_published":
      return "published";
    case "set_archived":
      return "archived";
  }
}

/** Kinds that keep version history (reasonable scope). */
export const studioVersionedKinds: StudioEntityKind[] = [
  "lesson",
  "topic",
  "knowledge_unit",
  "work",
  "exercise",
];

export function shouldVersion(kind: StudioEntityKind): boolean {
  return studioVersionedKinds.includes(kind);
}

export type StudioLessonPreviewBlock = {
  type: string;
  labelCs: string;
  text: string;
};

export type StudioLessonPreview = {
  lessonId: string;
  title: string;
  objective: string;
  estimatedMinutes: number;
  blocks: StudioLessonPreviewBlock[];
  noteCs: string;
};

export const studioCatalogSchema = z.object({
  generatedAt: z.string().datetime(),
  items: z.array(studioListItemSchema).max(5000),
  countsByKind: z.record(z.string(), z.number().int().min(0)),
});

export type StudioCatalog = z.infer<typeof studioCatalogSchema>;

export function parseStudioCatalog(raw: unknown): StudioCatalog {
  return studioCatalogSchema.parse(raw);
}

export function parseStudioEditFields(raw: unknown): StudioEditFields {
  return studioEditFieldsSchema.parse(raw);
}

export function emptyCounts(): Record<StudioEntityKind, number> {
  return Object.fromEntries(
    studioEntityKinds.map((k) => [k, 0]),
  ) as Record<StudioEntityKind, number>;
}

export function countByKind(items: StudioListItem[]): Record<string, number> {
  const counts = emptyCounts();
  for (const item of items) {
    counts[item.kind] += 1;
  }
  return counts;
}

export function filterStudioItems(
  items: StudioListItem[],
  opts: {
    kind?: StudioEntityKind | "all";
    q?: string;
    verification?: StudioVerificationStatus | "all";
    status?: (typeof publishStatuses)[number] | "all";
  },
): StudioListItem[] {
  const q = opts.q?.trim().toLowerCase() ?? "";
  return items.filter((item) => {
    if (opts.kind && opts.kind !== "all" && item.kind !== opts.kind) return false;
    if (
      opts.verification &&
      opts.verification !== "all" &&
      item.provenance.verificationStatus !== opts.verification
    ) {
      return false;
    }
    if (opts.status && opts.status !== "all" && item.status !== opts.status) {
      return false;
    }
    if (!q) return true;
    const hay = `${item.title} ${item.slug ?? ""} ${item.summary ?? ""} ${item.provenance.sourceFilename ?? ""}`.toLowerCase();
    return hay.includes(q);
  });
}
