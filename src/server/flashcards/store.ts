import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  advanceSession,
  applyGradeToSchedule,
  emptySchedule,
  parseFlashcardDeck,
  flashcardScheduleSchema,
  flashcardSessionSchema,
  startSession,
  type FlashcardDeck,
  type FlashcardSchedule,
  type FlashcardSession,
  type ReviewGrade,
} from "@/domain/learning/flashcards";

export const FLASHCARDS_DIR = path.join(process.cwd(), "data", "flashcards");
const PACKS_DIR = path.join(FLASHCARDS_DIR, "packs");
const SCHEDULES_DIR = path.join(FLASHCARDS_DIR, "schedules");
const SESSIONS_DIR = path.join(FLASHCARDS_DIR, "sessions");
const INDEX_PATH = path.join(FLASHCARDS_DIR, "index.json");

type PackIndex = { bySlug: Record<string, string> };

async function ensureDirs() {
  await fs.mkdir(PACKS_DIR, { recursive: true });
  await fs.mkdir(SCHEDULES_DIR, { recursive: true });
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
}

function packPath(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Neplatné deck id");
  return path.join(PACKS_DIR, `${id}.json`);
}

function schedulePath(learnerId: string, deckId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) {
    throw new Error("Neplatné learner id");
  }
  if (!/^[a-f0-9-]{36}$/i.test(deckId)) throw new Error("Neplatné deck id");
  return path.join(SCHEDULES_DIR, `${learnerId}__${deckId}.json`);
}

function sessionPath(sessionId: string) {
  if (!/^[a-f0-9-]{36}$/i.test(sessionId)) {
    throw new Error("Neplatné session id");
  }
  return path.join(SESSIONS_DIR, `${sessionId}.json`);
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

export async function saveFlashcardDeck(deck: FlashcardDeck): Promise<void> {
  const validated = parseFlashcardDeck(deck);
  await ensureDirs();
  const file = packPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getFlashcardDeckById(
  id: string,
): Promise<FlashcardDeck | null> {
  try {
    return parseFlashcardDeck(
      JSON.parse(await fs.readFile(packPath(id), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getFlashcardDeckBySlug(
  slug: string,
): Promise<FlashcardDeck | null> {
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getFlashcardDeckById(id);
}

export async function listFlashcardDecks(): Promise<FlashcardDeck[]> {
  await ensureDirs();
  const files = (await fs.readdir(PACKS_DIR)).filter((f) => f.endsWith(".json"));
  const decks: FlashcardDeck[] = [];
  for (const file of files) {
    const deck = await getFlashcardDeckById(file.replace(/\.json$/, ""));
    if (deck) decks.push(deck);
  }
  return decks.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}

export async function getFlashcardSchedule(
  learnerId: string,
  deckId: string,
): Promise<FlashcardSchedule | null> {
  try {
    return flashcardScheduleSchema.parse(
      JSON.parse(await fs.readFile(schedulePath(learnerId, deckId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveFlashcardSchedule(
  schedule: FlashcardSchedule,
): Promise<void> {
  await ensureDirs();
  const validated = flashcardScheduleSchema.parse(schedule);
  const file = schedulePath(validated.learnerId, validated.deckId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function getOrCreateSchedule(
  learnerId: string,
  deck: FlashcardDeck,
): Promise<FlashcardSchedule> {
  const existing = await getFlashcardSchedule(learnerId, deck.id);
  if (existing) return existing;
  const schedule = emptySchedule(learnerId, deck, new Date().toISOString());
  await saveFlashcardSchedule(schedule);
  return schedule;
}

export async function getFlashcardSession(
  sessionId: string,
): Promise<FlashcardSession | null> {
  try {
    return flashcardSessionSchema.parse(
      JSON.parse(await fs.readFile(sessionPath(sessionId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveFlashcardSession(
  session: FlashcardSession,
): Promise<void> {
  await ensureDirs();
  const validated = flashcardSessionSchema.parse(session);
  const file = sessionPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function createFlashcardSession(input: {
  learnerId: string;
  deck: FlashcardDeck;
}): Promise<{ session: FlashcardSession; schedule: FlashcardSchedule }> {
  const now = new Date().toISOString();
  const schedule = await getOrCreateSchedule(input.learnerId, input.deck);
  const session = startSession({
    sessionId: randomUUID(),
    learnerId: input.learnerId,
    deck: input.deck,
    schedule,
    nowIso: now,
  });
  await saveFlashcardSession(session);
  return { session, schedule };
}

export async function gradeFlashcard(input: {
  learnerId: string;
  sessionId: string;
  cardId: string;
  grade: ReviewGrade;
}): Promise<{
  session: FlashcardSession;
  schedule: FlashcardSchedule;
}> {
  const session = await getFlashcardSession(input.sessionId);
  if (!session) throw new Error("Session nenalezena.");
  if (session.learnerId !== input.learnerId) {
    throw new Error("Session nepatří tomuto learnerovi.");
  }
  if (session.status !== "active") {
    throw new Error("Session už není aktivní.");
  }
  const currentId = session.queue[session.cursor];
  if (currentId !== input.cardId) {
    throw new Error("Tato karta není aktuální v session.");
  }

  const deck = await getFlashcardDeckById(session.deckId);
  if (!deck) throw new Error("Deck nenalezen.");

  const now = new Date().toISOString();
  let schedule = await getOrCreateSchedule(input.learnerId, deck);
  schedule = applyGradeToSchedule(schedule, input.cardId, input.grade, now);
  const nextSession = advanceSession(session, input.cardId, input.grade, now);

  await saveFlashcardSchedule(schedule);
  await saveFlashcardSession(nextSession);
  return { session: nextSession, schedule };
}
