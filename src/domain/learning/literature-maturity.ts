import { z } from "zod";
import type { LearnerKnowledgeUnit } from "@/domain/learning/learner-knowledge";
import type { SelectedBook } from "@/domain/learning/school-exam-profile";

/**
 * Literature maturity module (D-052).
 * Student's actual oral-exam book list — fields filled primarily from verified materials.
 * Never invent book facts; empty stays empty until sourced or typed by the student.
 */

export const literatureFieldKeys = [
  "author",
  "period",
  "literaryMovement",
  "genre",
  "composition",
  "narrator",
  "characters",
  "themes",
  "motifs",
  "language",
  "historicalLiteraryContext",
  "relatedAuthors",
] as const;

export type LiteratureFieldKey = (typeof literatureFieldKeys)[number];

export const literatureFieldLabelsCs: Record<LiteratureFieldKey, string> = {
  author: "Autor",
  period: "Období",
  literaryMovement: "Literární směr",
  genre: "Žánr",
  composition: "Kompozice",
  narrator: "Vypravěč",
  characters: "Postavy",
  themes: "Témata",
  motifs: "Motivy",
  language: "Jazyk",
  historicalLiteraryContext: "Historický / literární kontext",
  relatedAuthors: "Související autoři",
};

export const literatureFieldSources = [
  "empty",
  "student_material",
  "manual",
  "platform_pack",
  "exam_profile",
] as const;

export type LiteratureFieldSource = (typeof literatureFieldSources)[number];

export const literatureFieldSourceLabelsCs: Record<
  LiteratureFieldSource,
  string
> = {
  empty: "Zatím prázdné",
  student_material: "Ověřený materiál",
  manual: "Ručně",
  platform_pack: "Balíček v appce",
  exam_profile: "Profil maturity",
};

export const literatureFieldValueSchema = z.object({
  key: z.enum(literatureFieldKeys),
  valueCs: z.string().max(2000).nullable(),
  source: z.enum(literatureFieldSources),
  sourceLabelCs: z.string().min(1).max(60),
  materialId: z.string().uuid().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

export type LiteratureFieldValue = z.infer<typeof literatureFieldValueSchema>;

export const literatureMasteryBands = [
  "new",
  "weak",
  "building",
  "strong",
] as const;
export type LiteratureMasteryBand = (typeof literatureMasteryBands)[number];

export const literatureMasteryBandsCs: Record<LiteratureMasteryBand, string> = {
  new: "Nová",
  weak: "Slabá",
  building: "Buduje se",
  strong: "Silná",
};

export const literatureBookMasterySchema = z.object({
  scorePct: z.number().min(0).max(100),
  band: z.enum(literatureMasteryBands),
  fieldsFilled: z.number().int().min(0).max(12),
  fieldsTotal: z.literal(12),
  practiceCount: z.number().int().min(0).max(10_000),
  lastPracticedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});

export type LiteratureBookMastery = z.infer<typeof literatureBookMasterySchema>;

export const literatureBookSchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  titleCs: z.string().min(1).max(200),
  fields: z.record(z.enum(literatureFieldKeys), literatureFieldValueSchema),
  mastery: literatureBookMasterySchema,
  linkedMaterialIds: z.array(z.string().uuid()).max(40),
  examProfileBookId: z.string().max(64).nullable(),
  platformWorkSlug: z.string().max(120).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LiteratureBook = z.infer<typeof literatureBookSchema>;

export const literatureMaturityListSchema = z.object({
  learnerId: z.string().min(1).max(64),
  books: z.array(literatureBookSchema).max(40),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LiteratureMaturityList = z.infer<typeof literatureMaturityListSchema>;

export function slugifyTitle(title: string): string {
  const map: Record<string, string> = {
    á: "a",
    č: "c",
    ď: "d",
    é: "e",
    ě: "e",
    í: "i",
    ň: "n",
    ó: "o",
    ř: "r",
    š: "s",
    ť: "t",
    ú: "u",
    ů: "u",
    ý: "y",
    ž: "z",
  };
  const base = title
    .trim()
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "kniha";
}

export function emptyField(key: LiteratureFieldKey): LiteratureFieldValue {
  return {
    key,
    valueCs: null,
    source: "empty",
    sourceLabelCs: literatureFieldSourceLabelsCs.empty,
    materialId: null,
    confidence: null,
  };
}

export function emptyFields(): Record<
  LiteratureFieldKey,
  LiteratureFieldValue
> {
  return Object.fromEntries(
    literatureFieldKeys.map((k) => [k, emptyField(k)]),
  ) as Record<LiteratureFieldKey, LiteratureFieldValue>;
}

export function countFilledFields(
  fields: Record<LiteratureFieldKey, LiteratureFieldValue>,
): number {
  return literatureFieldKeys.filter((k) => {
    const v = fields[k]?.valueCs?.trim();
    return Boolean(v);
  }).length;
}

export function masteryBandFromScore(scorePct: number): LiteratureMasteryBand {
  if (scorePct < 20) return "new";
  if (scorePct < 45) return "weak";
  if (scorePct < 70) return "building";
  return "strong";
}

/**
 * Mastery = field coverage (prep depth) + practice (oral readiness).
 * Realistic: empty card stays low even after one open.
 */
export function computeBookMastery(input: {
  fields: Record<LiteratureFieldKey, LiteratureFieldValue>;
  practiceCount: number;
  lastPracticedAt: string | null;
  nowIso: string;
}): LiteratureBookMastery {
  const fieldsFilled = countFilledFields(input.fields);
  const coverage = (fieldsFilled / literatureFieldKeys.length) * 100;
  const practiceScore = Math.min(100, input.practiceCount * 12);
  const scorePct = Math.round(coverage * 0.55 + practiceScore * 0.45);
  return {
    scorePct,
    band: masteryBandFromScore(scorePct),
    fieldsFilled,
    fieldsTotal: 12,
    practiceCount: input.practiceCount,
    lastPracticedAt: input.lastPracticedAt,
    updatedAt: input.nowIso,
  };
}

export function createLiteratureBook(input: {
  id: string;
  titleCs: string;
  slug?: string;
  authorCs?: string | null;
  examProfileBookId?: string | null;
  nowIso: string;
}): LiteratureBook {
  const fields = emptyFields();
  if (input.authorCs?.trim()) {
    fields.author = {
      key: "author",
      valueCs: input.authorCs.trim(),
      source: input.examProfileBookId ? "exam_profile" : "manual",
      sourceLabelCs: input.examProfileBookId
        ? literatureFieldSourceLabelsCs.exam_profile
        : literatureFieldSourceLabelsCs.manual,
      materialId: null,
      confidence: null,
    };
  }
  const mastery = computeBookMastery({
    fields,
    practiceCount: 0,
    lastPracticedAt: null,
    nowIso: input.nowIso,
  });
  return {
    id: input.id,
    slug: input.slug ?? slugifyTitle(input.titleCs),
    titleCs: input.titleCs.trim().slice(0, 200),
    fields,
    mastery,
    linkedMaterialIds: [],
    examProfileBookId: input.examProfileBookId ?? null,
    platformWorkSlug: null,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  };
}

export function emptyLiteratureList(
  learnerId: string,
  nowIso: string,
): LiteratureMaturityList {
  return {
    learnerId,
    books: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function normalizeTitleKey(title: string): string {
  return slugifyTitle(title);
}

/** Map grounded KU fields → literature card fields (only when present). */
export function extractFieldsFromKnowledgeUnits(
  units: LearnerKnowledgeUnit[],
  materialId: string,
): Partial<Record<LiteratureFieldKey, LiteratureFieldValue>> {
  const out: Partial<Record<LiteratureFieldKey, LiteratureFieldValue>> = {};

  const take = (
    key: LiteratureFieldKey,
    value: string | null | undefined,
    confidence: number,
  ) => {
    const v = value?.trim();
    if (!v) return;
    const existing = out[key];
    if (existing?.valueCs && (existing.confidence ?? 0) >= confidence) return;
    out[key] = {
      key,
      valueCs: v.slice(0, 2000),
      source: "student_material",
      sourceLabelCs: literatureFieldSourceLabelsCs.student_material,
      materialId,
      confidence,
    };
  };

  const appendUnique = (
    key: LiteratureFieldKey,
    value: string | null | undefined,
    confidence: number,
  ) => {
    const v = value?.trim();
    if (!v) return;
    const prev = out[key]?.valueCs;
    if (prev) {
      if (prev.toLowerCase().includes(v.toLowerCase())) return;
      out[key] = {
        key,
        valueCs: `${prev}; ${v}`.slice(0, 2000),
        source: "student_material",
        sourceLabelCs: literatureFieldSourceLabelsCs.student_material,
        materialId,
        confidence: Math.max(confidence, out[key]?.confidence ?? 0),
      };
      return;
    }
    take(key, v, confidence);
  };

  for (const u of units) {
    const g = u.grounded;
    const c = u.confidence;
    take("author", g.author, c);
    take("period", g.datePeriod, c);
    take("literaryMovement", g.literaryMovement, c);
    if (g.definition) appendUnique("themes", g.definition, c * 0.7);
    if (g.importantFact) appendUnique("themes", g.importantFact, c * 0.6);
    if (g.concept) appendUnique("motifs", g.concept, c * 0.65);
    if (u.statement && /postav/i.test(u.title + u.statement)) {
      appendUnique("characters", u.statement, c * 0.55);
    }
    if (u.statement && /kompozic|struktu/i.test(u.title + u.statement)) {
      appendUnique("composition", u.statement, c * 0.55);
    }
    if (u.statement && /vypravě|narativ|ich-form|er-form/i.test(u.title + u.statement)) {
      appendUnique("narrator", u.statement, c * 0.55);
    }
    if (u.statement && /jazyk|styl|verš|próza/i.test(u.title + u.statement)) {
      appendUnique("language", u.statement, c * 0.55);
    }
    if (u.statement && /kontext|době|histor/i.test(u.title + u.statement)) {
      appendUnique("historicalLiteraryContext", u.statement, c * 0.5);
    }
    if (
      g.relationshipType === "influenced" ||
      g.relationshipType === "related" ||
      g.relationshipType === "contrasts_with"
    ) {
      appendUnique(
        "relatedAuthors",
        g.relationshipObject ?? g.relationshipSubject,
        c * 0.6,
      );
    }
    if (g.topic && /žánr|drama|lyrika|epika|román|balada/i.test(g.topic)) {
      take("genre", g.topic, c * 0.5);
    }
  }

  return out;
}

/**
 * Group material KUs by literary work title (grounded.literaryWork).
 */
export function groupUnitsByWorkTitle(
  units: LearnerKnowledgeUnit[],
): Map<string, LearnerKnowledgeUnit[]> {
  const map = new Map<string, LearnerKnowledgeUnit[]>();
  for (const u of units) {
    const title = u.grounded.literaryWork?.trim();
    if (!title) continue;
    const key = normalizeTitleKey(title);
    const list = map.get(key) ?? [];
    list.push(u);
    map.set(key, list);
  }
  return map;
}

export function mergeFieldsPreferMaterial(
  current: Record<LiteratureFieldKey, LiteratureFieldValue>,
  incoming: Partial<Record<LiteratureFieldKey, LiteratureFieldValue>>,
): Record<LiteratureFieldKey, LiteratureFieldValue> {
  const next = { ...current };
  for (const key of literatureFieldKeys) {
    const inc = incoming[key];
    if (!inc?.valueCs?.trim()) continue;
    const cur = next[key];
    // Prefer student_material over empty/manual/exam; don't overwrite better material
    if (cur.source === "student_material" && (cur.confidence ?? 0) >= (inc.confidence ?? 0)) {
      continue;
    }
    if (cur.source === "platform_pack" && inc.source !== "student_material") {
      continue;
    }
    next[key] = inc;
  }
  return next;
}

export function setManualField(
  book: LiteratureBook,
  key: LiteratureFieldKey,
  valueCs: string,
  nowIso: string,
): LiteratureBook {
  const fields = {
    ...book.fields,
    [key]: {
      key,
      valueCs: valueCs.trim() ? valueCs.trim().slice(0, 2000) : null,
      source: valueCs.trim() ? ("manual" as const) : ("empty" as const),
      sourceLabelCs: valueCs.trim()
        ? literatureFieldSourceLabelsCs.manual
        : literatureFieldSourceLabelsCs.empty,
      materialId: null,
      confidence: null,
    },
  };
  const mastery = computeBookMastery({
    fields,
    practiceCount: book.mastery.practiceCount,
    lastPracticedAt: book.mastery.lastPracticedAt,
    nowIso,
  });
  return { ...book, fields, mastery, updatedAt: nowIso };
}

export function recordBookPractice(
  book: LiteratureBook,
  nowIso: string,
): LiteratureBook {
  const practiceCount = book.mastery.practiceCount + 1;
  const mastery = computeBookMastery({
    fields: book.fields,
    practiceCount,
    lastPracticedAt: nowIso,
    nowIso,
  });
  return { ...book, mastery, updatedAt: nowIso };
}

/** Weighted draw — weaker books more likely, never invent a book. */
export function drawLiteratureBook(
  books: LiteratureBook[],
  random = Math.random,
): LiteratureBook | null {
  if (books.length === 0) return null;
  const weights = books.map((b) => Math.max(4, 110 - b.mastery.scorePct));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = random() * total;
  for (let i = 0; i < books.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return books[i]!;
  }
  return books[books.length - 1]!;
}

export function weakestLiteratureBooks(
  books: LiteratureBook[],
  limit = 5,
): LiteratureBook[] {
  return [...books]
    .sort((a, b) => a.mastery.scorePct - b.mastery.scorePct)
    .slice(0, Math.max(0, limit));
}

export type LiteratureBookListItem = {
  id: string;
  slug: string;
  titleCs: string;
  authorCs: string | null;
  masteryScorePct: number;
  masteryBand: LiteratureMasteryBand;
  masteryBandCs: string;
  fieldsFilled: number;
  href: string;
  sourceMixCs: string;
};

export function toLiteratureBookListItem(
  book: LiteratureBook,
): LiteratureBookListItem {
  const sources = new Set(
    literatureFieldKeys
      .map((k) => book.fields[k].source)
      .filter((s) => s !== "empty"),
  );
  const sourceMixCs =
    sources.size === 0
      ? "Zatím bez zdrojů"
      : [...sources]
          .map((s) => literatureFieldSourceLabelsCs[s])
          .join(" · ");
  return {
    id: book.id,
    slug: book.slug,
    titleCs: book.titleCs,
    authorCs: book.fields.author.valueCs,
    masteryScorePct: book.mastery.scorePct,
    masteryBand: book.mastery.band,
    masteryBandCs: literatureMasteryBandsCs[book.mastery.band],
    fieldsFilled: book.mastery.fieldsFilled,
    href: `/app/literature/${book.id}`,
    sourceMixCs,
  };
}

export type LiteratureMaturityHubView = {
  books: LiteratureBookListItem[];
  weakest: LiteratureBookListItem[];
  drawn: LiteratureBookListItem | null;
  bookCount: number;
  emptyCs: string | null;
  ctaDrawCs: string;
  ctaWeakCs: string;
};

export function buildLiteratureHubView(input: {
  list: LiteratureMaturityList;
  drawnBookId?: string | null;
}): LiteratureMaturityHubView {
  const items = input.list.books.map(toLiteratureBookListItem);
  const drawn =
    input.drawnBookId != null
      ? items.find((b) => b.id === input.drawnBookId) ?? null
      : null;
  return {
    books: items,
    weakest: weakestLiteratureBooks(input.list.books, 5).map(
      toLiteratureBookListItem,
    ),
    drawn,
    bookCount: items.length,
    emptyCs:
      items.length === 0
        ? "Seznam je prázdný. Přidej knihu, importuj z Profilu maturity, nebo z ověřených materiálů."
        : null,
    ctaDrawCs: "Vylosuj mi knihu",
    ctaWeakCs: "Nejslabší knihy",
  };
}

export function importSelectedBooksFromExamProfile(
  list: LiteratureMaturityList,
  selected: SelectedBook[],
  nowIso: string,
  newId: () => string,
): LiteratureMaturityList {
  const books = [...list.books];
  const existingKeys = new Set(books.map((b) => normalizeTitleKey(b.titleCs)));
  const existingExamIds = new Set(
    books.map((b) => b.examProfileBookId).filter(Boolean),
  );

  for (const sel of selected) {
    const key = normalizeTitleKey(sel.titleCs);
    if (existingKeys.has(key) || existingExamIds.has(sel.id)) continue;
    let slug = slugifyTitle(sel.titleCs);
    const slugTaken = new Set(books.map((b) => b.slug));
    if (slugTaken.has(slug)) slug = `${slug}-${newId().slice(0, 6)}`;
    books.push(
      createLiteratureBook({
        id: newId(),
        titleCs: sel.titleCs,
        slug,
        authorCs: sel.authorCs,
        examProfileBookId: sel.id,
        nowIso,
      }),
    );
    existingKeys.add(key);
  }

  return { ...list, books, updatedAt: nowIso };
}

/** Known platform packs that can seed empty fields when title matches. */
export const PLATFORM_WORK_SEEDS: Record<
  string,
  Partial<Record<LiteratureFieldKey, string>> & { slug: string }
> = {
  maj: {
    slug: "maj",
    author: "Karel Hynek Mácha",
    period: "1. polovina 19. století",
    literaryMovement: "Romantismus",
    genre: "Lyricoepická báseň",
  },
  kytice: {
    slug: "kytice",
    author: "Karel Jaromír Erben",
    period: "19. století",
    literaryMovement: "Romantismus / národní obrození",
    genre: "Balady",
  },
  babicka: {
    slug: "babicka",
    author: "Božena Němcová",
    period: "19. století",
    literaryMovement: "Realismus / národní obrození",
    genre: "Próza",
  },
};

export function maybeAttachPlatformSeed(
  book: LiteratureBook,
  nowIso: string,
): LiteratureBook {
  const key = normalizeTitleKey(book.titleCs);
  const seed =
    PLATFORM_WORK_SEEDS[key] ??
    Object.values(PLATFORM_WORK_SEEDS).find((s) => s.slug === key);
  if (!seed) return book;

  const fields = { ...book.fields };
  for (const fk of literatureFieldKeys) {
    const v = seed[fk];
    if (!v) continue;
    if (fields[fk].valueCs?.trim()) continue;
    fields[fk] = {
      key: fk,
      valueCs: v,
      source: "platform_pack",
      sourceLabelCs: literatureFieldSourceLabelsCs.platform_pack,
      materialId: null,
      confidence: 0.9,
    };
  }
  const mastery = computeBookMastery({
    fields,
    practiceCount: book.mastery.practiceCount,
    lastPracticedAt: book.mastery.lastPracticedAt,
    nowIso,
  });
  return {
    ...book,
    fields,
    mastery,
    platformWorkSlug: seed.slug,
    updatedAt: nowIso,
  };
}
