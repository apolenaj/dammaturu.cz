import {
  applySessionGrade,
  buildDueSummary,
  emptyScheduleBook,
  learnerScheduleBookSchema,
  mixedReviewSessionSchema,
  parseSpacedReviewPack,
  startMixedSession,
  type DueSummary,
  type LearnerScheduleBook,
  type MixedReviewSession,
  type PerformanceGrade,
  type SpacedReviewPack,
} from "@/domain/learning/spaced-repetition";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const SPACED_DIR = path.join(process.cwd(), "data", "spaced-repetition");
const PACKS_DIR = path.join(SPACED_DIR, "packs");
const BOOKS_DIR = path.join(SPACED_DIR, "books");
const SESSIONS_DIR = path.join(SPACED_DIR, "sessions");
const INDEX_PATH = path.join(SPACED_DIR, "index.json");

type PackIndex = { bySlug: Record<string, string> };

async function ensureDirs() {
  await fs.mkdir(PACKS_DIR, { recursive: true });
  await fs.mkdir(BOOKS_DIR, { recursive: true });
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
}

function packPath(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Neplatné pack id");
  return path.join(PACKS_DIR, `${id}.json`);
}

function bookPath(learnerId: string, packId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) {
    throw new Error("Neplatné learner id");
  }
  if (!/^[a-f0-9-]{36}$/i.test(packId)) throw new Error("Neplatné pack id");
  return path.join(BOOKS_DIR, `${learnerId}__${packId}.json`);
}

function sessionPath(learnerId: string, sessionId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) {
    throw new Error("Neplatné learner id");
  }
  if (!/^[a-f0-9-]{36}$/i.test(sessionId)) throw new Error("Neplatné session id");
  return path.join(SESSIONS_DIR, `${learnerId}__${sessionId}.json`);
}

async function loadIndex(): Promise<PackIndex> {
  try {
    return JSON.parse(await fs.readFile(INDEX_PATH, "utf8")) as PackIndex;
  } catch {
    return { bySlug: {} };
  }
}

async function saveIndex(index: PackIndex) {
  await ensureDirs();
  await fs.writeFile(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

export async function saveSpacedPack(pack: SpacedReviewPack): Promise<void> {
  const validated = parseSpacedReviewPack(pack);
  await ensureDirs();
  const file = packPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getSpacedPackById(
  id: string,
): Promise<SpacedReviewPack | null> {
  try {
    return parseSpacedReviewPack(
      JSON.parse(await fs.readFile(packPath(id), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getSpacedPackBySlug(
  slug: string,
): Promise<SpacedReviewPack | null> {
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getSpacedPackById(id);
}

export async function listSpacedPacks(): Promise<SpacedReviewPack[]> {
  await ensureDirs();
  const files = (await fs.readdir(PACKS_DIR)).filter((f) => f.endsWith(".json"));
  const packs: SpacedReviewPack[] = [];
  for (const file of files) {
    const pack = await getSpacedPackById(file.replace(/\.json$/, ""));
    if (pack) packs.push(pack);
  }
  return packs.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}

export async function getScheduleBook(
  learnerId: string,
  packId: string,
): Promise<LearnerScheduleBook | null> {
  try {
    return learnerScheduleBookSchema.parse(
      JSON.parse(await fs.readFile(bookPath(learnerId, packId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

async function saveBook(book: LearnerScheduleBook): Promise<void> {
  await ensureDirs();
  const validated = learnerScheduleBookSchema.parse(book);
  const file = bookPath(validated.learnerId, validated.packId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

async function saveSession(session: MixedReviewSession): Promise<void> {
  await ensureDirs();
  const validated = mixedReviewSessionSchema.parse(session);
  const file = sessionPath(validated.learnerId, validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function getMixedSession(
  learnerId: string,
  sessionId: string,
): Promise<MixedReviewSession | null> {
  try {
    return mixedReviewSessionSchema.parse(
      JSON.parse(await fs.readFile(sessionPath(learnerId, sessionId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getDueSummaryForLearner(input: {
  learnerId: string;
  packSlug?: string;
}): Promise<{ pack: SpacedReviewPack; summary: DueSummary } | null> {
  const packs = await listSpacedPacks();
  const pack =
    (input.packSlug
      ? packs.find((p) => p.slug === input.packSlug)
      : packs[0]) ?? null;
  if (!pack) return null;
  const book = await getScheduleBook(input.learnerId, pack.id);
  const now = new Date().toISOString();
  return {
    pack,
    summary: buildDueSummary({ pack, book, nowIso: now }),
  };
}

export async function createMixedReviewSession(input: {
  learnerId: string;
  pack: SpacedReviewPack;
}): Promise<{
  session: MixedReviewSession;
  book: LearnerScheduleBook;
  summary: DueSummary;
}> {
  const now = new Date().toISOString();
  const book =
    (await getScheduleBook(input.learnerId, input.pack.id)) ??
    emptyScheduleBook(input.learnerId, input.pack, now);
  const session = startMixedSession({
    sessionId: randomUUID(),
    learnerId: input.learnerId,
    pack: input.pack,
    book,
    nowIso: now,
  });
  await saveSession(session);
  const summary = buildDueSummary({
    pack: input.pack,
    book,
    nowIso: now,
  });
  return { session, book, summary };
}

export async function gradeMixedReviewItem(input: {
  learnerId: string;
  pack: SpacedReviewPack;
  sessionId: string;
  grade: PerformanceGrade;
  studentAnswer?: string;
}): Promise<{
  session: MixedReviewSession;
  book: LearnerScheduleBook;
  completed: boolean;
  summary: DueSummary;
}> {
  const session = await getMixedSession(input.learnerId, input.sessionId);
  if (!session) throw new Error("Session nenalezena.");
  const now = new Date().toISOString();
  const book =
    (await getScheduleBook(input.learnerId, input.pack.id)) ??
    emptyScheduleBook(input.learnerId, input.pack, now);

  const currentItem = session.queue[session.cursor] ?? null;

  let repeatedErrors = 0;
  if (currentItem) {
    const sch = book.byKnowledgeId[currentItem.knowledgeId];
    repeatedErrors = sch?.lapseCount ?? 0;
    try {
      const { getErrorBook } = await import("@/server/error-memory/store");
      const errBook = await getErrorBook(input.learnerId);
      const knowledge = input.pack.knowledge.find(
        (k) => k.id === currentItem.knowledgeId,
      );
      if (errBook && knowledge) {
        const matches = errBook.memories.filter(
          (m) =>
            m.status !== "mastered" &&
            (m.knowledgeUnit.id === knowledge.id ||
              m.knowledgeUnit.slug === knowledge.slug),
        );
        for (const m of matches) {
          repeatedErrors = Math.max(repeatedErrors, m.occurrenceCount);
        }
      }
    } catch {
      // Error memory optional — scheduling still works
    }
  }

  const confidence =
    input.grade === "easy"
      ? 5
      : input.grade === "good"
        ? 4
        : input.grade === "hard"
          ? 2
          : 1;

  const result = applySessionGrade({
    session,
    book,
    grade: input.grade,
    nowIso: now,
    confidence,
    repeatedErrors,
    contentDifficulty: 3,
  });
  await saveSession(result.session);
  await saveBook(result.book);

  // D-034: significant miss → ErrorMemory
  if (input.grade === "again" && currentItem) {
    const knowledge = input.pack.knowledge.find(
      (k) => k.id === currentItem.knowledgeId,
    );
    if (knowledge) {
      const { ingestMeaningfulMistake } = await import(
        "@/server/error-memory/ingest"
      );
      const extracted = extractFromPayload(
        currentItem.payload,
        input.studentAnswer,
      );
      await ingestMeaningfulMistake({
        learnerId: input.learnerId,
        question: extracted.question,
        studentAnswer: extracted.studentAnswer,
        correctConcept: extracted.correctConcept,
        knowledgeUnit: {
          id: knowledge.id,
          slug: knowledge.slug,
          title: knowledge.title,
        },
        source: "mixed_review",
        result: "incorrect",
        nowIso: now,
      });
    }
  }

  const summary = buildDueSummary({
    pack: input.pack,
    book: result.book,
    nowIso: now,
  });
  return { ...result, summary };
}

function extractFromPayload(
  payload: MixedReviewSession["queue"][number]["payload"],
  studentAnswer?: string,
): { question: string; studentAnswer: string; correctConcept: string } {
  if (payload.format === "flashcard") {
    return {
      question: payload.front,
      studentAnswer: studentAnswer?.trim() || "(neznal / znovu)",
      correctConcept: payload.back,
    };
  }
  if (payload.format === "free_recall") {
    return {
      question: payload.prompt,
      studentAnswer: studentAnswer?.trim() || "(prázdná / znovu)",
      correctConcept: payload.modelAnswer,
    };
  }
  if (payload.format === "matching") {
    return {
      question: `Spoj: ${payload.left}`,
      studentAnswer: studentAnswer?.trim() || "(špatný partner)",
      correctConcept: payload.right,
    };
  }
  return {
    question: payload.stem,
    studentAnswer:
      studentAnswer?.trim() ||
      "(špatná volba)",
    correctConcept: payload.options[payload.correctIndex] ?? "—",
  };
}
