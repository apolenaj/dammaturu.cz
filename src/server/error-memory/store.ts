import {
  applyMistakeSessionGrade,
  emptyErrorBook,
  errorMemoryBookSchema,
  mistakePracticeSessionSchema,
  recordError,
  startMistakePracticeSession,
  type ErrorMemoryBook,
  type MistakePracticeSession,
  type PracticeGrade,
  type RecordErrorInput,
} from "@/domain/learning/error-memory";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const ERROR_MEMORY_DIR = path.join(process.cwd(), "data", "error-memory");
const BOOKS_DIR = path.join(ERROR_MEMORY_DIR, "books");
const SESSIONS_DIR = path.join(ERROR_MEMORY_DIR, "sessions");

async function ensureDirs() {
  await fs.mkdir(BOOKS_DIR, { recursive: true });
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
}

function bookPath(learnerId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) {
    throw new Error("Neplatné learner id");
  }
  return path.join(BOOKS_DIR, `${learnerId}.json`);
}

function sessionPath(learnerId: string, sessionId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) {
    throw new Error("Neplatné learner id");
  }
  if (!/^[a-f0-9-]{36}$/i.test(sessionId)) {
    throw new Error("Neplatné session id");
  }
  return path.join(SESSIONS_DIR, `${learnerId}__${sessionId}.json`);
}

export async function getErrorBook(
  learnerId: string,
): Promise<ErrorMemoryBook | null> {
  try {
    return errorMemoryBookSchema.parse(
      JSON.parse(await fs.readFile(bookPath(learnerId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveErrorBook(book: ErrorMemoryBook): Promise<void> {
  const validated = errorMemoryBookSchema.parse(book);
  await ensureDirs();
  const file = bookPath(validated.learnerId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function getOrCreateErrorBook(
  learnerId: string,
): Promise<ErrorMemoryBook> {
  const existing = await getErrorBook(learnerId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const book = emptyErrorBook(learnerId, now);
  await saveErrorBook(book);
  return book;
}

export async function recordLearnerError(
  input: Omit<RecordErrorInput, "id" | "nowIso"> & {
    id?: string;
    nowIso?: string;
  },
): Promise<{ book: ErrorMemoryBook; created: boolean }> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const book = await getOrCreateErrorBook(input.learnerId);
  const result = recordError(book, {
    ...input,
    id: input.id ?? randomUUID(),
    nowIso,
  });
  await saveErrorBook(result.book);
  return { book: result.book, created: result.created };
}

async function saveSession(session: MistakePracticeSession): Promise<void> {
  const validated = mistakePracticeSessionSchema.parse(session);
  await ensureDirs();
  const file = sessionPath(validated.learnerId, validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function getMistakeSession(
  learnerId: string,
  sessionId: string,
): Promise<MistakePracticeSession | null> {
  try {
    return mistakePracticeSessionSchema.parse(
      JSON.parse(await fs.readFile(sessionPath(learnerId, sessionId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function createMistakePracticeSession(input: {
  learnerId: string;
}): Promise<{
  session: MistakePracticeSession;
  book: ErrorMemoryBook;
} | null> {
  const now = new Date().toISOString();
  const book = await getOrCreateErrorBook(input.learnerId);
  const session = startMistakePracticeSession({
    sessionId: randomUUID(),
    learnerId: input.learnerId,
    book,
    nowIso: now,
  });
  if (!session) return null;
  await saveSession(session);
  return { session, book };
}

export async function gradeMistakePracticeItem(input: {
  learnerId: string;
  sessionId: string;
  grade: PracticeGrade;
}): Promise<{
  session: MistakePracticeSession;
  book: ErrorMemoryBook;
  completed: boolean;
}> {
  const session = await getMistakeSession(input.learnerId, input.sessionId);
  if (!session) throw new Error("Session nenalezena.");
  const book = await getOrCreateErrorBook(input.learnerId);
  const now = new Date().toISOString();
  const result = applyMistakeSessionGrade({
    session,
    book,
    grade: input.grade,
    nowIso: now,
  });
  await saveSession(result.session);
  await saveErrorBook(result.book);
  return {
    session: result.session,
    book: result.book,
    completed: result.completed,
  };
}
