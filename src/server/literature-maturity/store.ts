import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  computeBookMastery,
  createLiteratureBook,
  emptyLiteratureList,
  extractFieldsFromKnowledgeUnits,
  groupUnitsByWorkTitle,
  importSelectedBooksFromExamProfile,
  literatureMaturityListSchema,
  maybeAttachPlatformSeed,
  mergeFieldsPreferMaterial,
  normalizeTitleKey,
  recordBookPractice,
  setManualField,
  slugifyTitle,
  type LiteratureBook,
  type LiteratureFieldKey,
  type LiteratureMaturityList,
} from "@/domain/learning/literature-maturity";
import type { SelectedBook } from "@/domain/learning/school-exam-profile";
import type { LearnerKnowledgeUnit } from "@/domain/learning/learner-knowledge";
import { assertSafeId } from "@/server/safe-id";

const ROOT = path.join(process.cwd(), "data", "literature-maturity");

function listPath(learnerId: string): string {
  assertSafeId(learnerId, "learner id");
  return path.join(ROOT, `${learnerId}.json`);
}

async function ensureRoot(): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
}

export async function getLiteratureList(
  learnerId: string,
): Promise<LiteratureMaturityList | null> {
  try {
    const raw = JSON.parse(await fs.readFile(listPath(learnerId), "utf8"));
    return literatureMaturityListSchema.parse(raw);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveLiteratureList(
  list: LiteratureMaturityList,
): Promise<void> {
  const validated = literatureMaturityListSchema.parse(list);
  await ensureRoot();
  const file = listPath(validated.learnerId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function getOrCreateLiteratureList(
  learnerId: string,
): Promise<LiteratureMaturityList> {
  const existing = await getLiteratureList(learnerId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const list = emptyLiteratureList(learnerId, now);
  await saveLiteratureList(list);
  return list;
}

export async function addLiteratureBook(input: {
  learnerId: string;
  titleCs: string;
  authorCs?: string | null;
}): Promise<LiteratureBook> {
  const list = await getOrCreateLiteratureList(input.learnerId);
  const now = new Date().toISOString();
  const key = normalizeTitleKey(input.titleCs);
  const dup = list.books.find((b) => normalizeTitleKey(b.titleCs) === key);
  if (dup) return dup;

  let slug = slugifyTitle(input.titleCs);
  if (list.books.some((b) => b.slug === slug)) {
    slug = `${slug}-${randomUUID().slice(0, 6)}`;
  }
  let book = createLiteratureBook({
    id: randomUUID(),
    titleCs: input.titleCs,
    slug,
    authorCs: input.authorCs,
    nowIso: now,
  });
  book = maybeAttachPlatformSeed(book, now);
  const next = {
    ...list,
    books: [...list.books, book],
    updatedAt: now,
  };
  await saveLiteratureList(next);
  return book;
}

export async function getLiteratureBook(input: {
  learnerId: string;
  bookId: string;
}): Promise<LiteratureBook | null> {
  const list = await getLiteratureList(input.learnerId);
  return list?.books.find((b) => b.id === input.bookId) ?? null;
}

export async function updateLiteratureBookField(input: {
  learnerId: string;
  bookId: string;
  key: LiteratureFieldKey;
  valueCs: string;
}): Promise<LiteratureBook> {
  const list = await getOrCreateLiteratureList(input.learnerId);
  const now = new Date().toISOString();
  const idx = list.books.findIndex((b) => b.id === input.bookId);
  if (idx < 0) throw new Error("Kniha nenalezena.");
  const updated = setManualField(list.books[idx]!, input.key, input.valueCs, now);
  const books = [...list.books];
  books[idx] = updated;
  await saveLiteratureList({ ...list, books, updatedAt: now });
  return updated;
}

export async function removeLiteratureBook(input: {
  learnerId: string;
  bookId: string;
}): Promise<LiteratureMaturityList> {
  const list = await getOrCreateLiteratureList(input.learnerId);
  const now = new Date().toISOString();
  const next = {
    ...list,
    books: list.books.filter((b) => b.id !== input.bookId),
    updatedAt: now,
  };
  await saveLiteratureList(next);
  return next;
}

export async function practiceLiteratureBook(input: {
  learnerId: string;
  bookId: string;
}): Promise<LiteratureBook> {
  const list = await getOrCreateLiteratureList(input.learnerId);
  const now = new Date().toISOString();
  const idx = list.books.findIndex((b) => b.id === input.bookId);
  if (idx < 0) throw new Error("Kniha nenalezena.");
  const updated = recordBookPractice(list.books[idx]!, now);
  const books = [...list.books];
  books[idx] = updated;
  await saveLiteratureList({ ...list, books, updatedAt: now });
  return updated;
}

export async function syncFromExamProfileBooks(input: {
  learnerId: string;
  selectedBooks: SelectedBook[];
}): Promise<{ list: LiteratureMaturityList; added: number }> {
  const list = await getOrCreateLiteratureList(input.learnerId);
  const before = list.books.length;
  const now = new Date().toISOString();
  let next = importSelectedBooksFromExamProfile(
    list,
    input.selectedBooks,
    now,
    () => randomUUID(),
  );
  next = {
    ...next,
    books: next.books.map((b) => maybeAttachPlatformSeed(b, now)),
  };
  await saveLiteratureList(next);
  return { list: next, added: next.books.length - before };
}

export async function importFromMaterialKnowledge(input: {
  learnerId: string;
  materials: Array<{
    id: string;
    status: string;
    knowledgeUnits?: LearnerKnowledgeUnit[];
  }>;
}): Promise<{ list: LiteratureMaturityList; booksTouched: number }> {
  const list = await getOrCreateLiteratureList(input.learnerId);
  const now = new Date().toISOString();
  let books = [...list.books];
  let touched = 0;

  for (const material of input.materials) {
    if (material.status !== "ready") continue;
    const units = material.knowledgeUnits ?? [];
    if (units.length === 0) continue;

    const grouped = groupUnitsByWorkTitle(units);
    for (const [, groupUnits] of grouped) {
      const title =
        groupUnits.find((u) => u.grounded.literaryWork?.trim())?.grounded
          .literaryWork ?? null;
      if (!title?.trim()) continue;

      const key = normalizeTitleKey(title);
      const extracted = extractFieldsFromKnowledgeUnits(groupUnits, material.id);
      let idx = books.findIndex((b) => normalizeTitleKey(b.titleCs) === key);

      if (idx < 0) {
        let slug = slugifyTitle(title);
        if (books.some((b) => b.slug === slug)) {
          slug = `${slug}-${randomUUID().slice(0, 6)}`;
        }
        let book = createLiteratureBook({
          id: randomUUID(),
          titleCs: title.trim(),
          slug,
          authorCs: extracted.author?.valueCs,
          nowIso: now,
        });
        book = {
          ...book,
          fields: mergeFieldsPreferMaterial(book.fields, extracted),
          linkedMaterialIds: [material.id],
        };
        book = {
          ...book,
          mastery: computeBookMastery({
            fields: book.fields,
            practiceCount: 0,
            lastPracticedAt: null,
            nowIso: now,
          }),
        };
        book = maybeAttachPlatformSeed(book, now);
        books.push(book);
        touched += 1;
        continue;
      }

      const current = books[idx]!;
      const fields = mergeFieldsPreferMaterial(current.fields, extracted);
      const linkedMaterialIds = [
        ...new Set([...current.linkedMaterialIds, material.id]),
      ].slice(0, 40);
      const mastery = computeBookMastery({
        fields,
        practiceCount: current.mastery.practiceCount,
        lastPracticedAt: current.mastery.lastPracticedAt,
        nowIso: now,
      });
      books[idx] = {
        ...current,
        fields,
        linkedMaterialIds,
        mastery,
        updatedAt: now,
      };
      touched += 1;
    }
  }

  const next = { ...list, books, updatedAt: now };
  await saveLiteratureList(next);
  return { list: next, booksTouched: touched };
}
