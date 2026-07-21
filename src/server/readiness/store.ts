import {
  buildReadinessSnapshot,
  readinessBookSchema,
  type ReadinessBook,
  type ReadinessSnapshot,
} from "@/domain/learning/readiness";
import { promises as fs } from "node:fs";
import path from "node:path";

export const READINESS_DIR = path.join(process.cwd(), "data", "readiness");
const BOOKS_DIR = path.join(READINESS_DIR, "books");

async function ensureDirs() {
  await fs.mkdir(BOOKS_DIR, { recursive: true });
}

function bookPath(learnerId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) {
    throw new Error("Neplatné learner id");
  }
  return path.join(BOOKS_DIR, `${learnerId}.json`);
}

export async function getReadinessBook(
  learnerId: string,
): Promise<ReadinessBook | null> {
  try {
    return readinessBookSchema.parse(
      JSON.parse(await fs.readFile(bookPath(learnerId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveReadinessBook(book: ReadinessBook): Promise<void> {
  const validated = readinessBookSchema.parse(book);
  await ensureDirs();
  const file = bookPath(validated.learnerId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function getReadinessSnapshotForLearner(input: {
  learnerId: string;
}): Promise<{ book: ReadinessBook; snapshot: ReadinessSnapshot } | null> {
  const book = await getReadinessBook(input.learnerId);
  if (!book) return null;
  const snapshot = buildReadinessSnapshot(book, new Date().toISOString());
  return { book, snapshot };
}
