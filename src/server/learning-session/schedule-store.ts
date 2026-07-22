import { promises as fs } from "node:fs";
import path from "node:path";
import {
  applySm2,
  createScheduleEntry,
  type ReviewGrade,
  type ScheduleEntry,
} from "@/domain/learning/scheduler";

const ROOT = path.join(process.cwd(), "data", "learning-session-schedule");

function assertSafe(id: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error("Neplatné id");
  }
}

function filePath(learnerId: string): string {
  assertSafe(learnerId);
  return path.join(ROOT, `${learnerId}.json`);
}

type Book = {
  learnerId: string;
  updatedAt: string;
  entries: Record<string, ScheduleEntry>;
};

async function loadBook(learnerId: string): Promise<Book> {
  try {
    const raw = await fs.readFile(filePath(learnerId), "utf8");
    return JSON.parse(raw) as Book;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return { learnerId, updatedAt: new Date().toISOString(), entries: {} };
    }
    throw error;
  }
}

async function saveBook(book: Book): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
  const dest = filePath(book.learnerId);
  const tmp = `${dest}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(book, null, 2)}\n`, "utf8");
  await fs.rename(tmp, dest);
}

export async function applyLearningSessionSchedule(input: {
  learnerId: string;
  atomId: string;
  grade: ReviewGrade;
  nowIso?: string;
}): Promise<{ entry: ScheduleEntry; dueAt: string }> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const book = await loadBook(input.learnerId);
  const cardId = input.atomId;
  const prev =
    book.entries[cardId] ?? createScheduleEntry(cardId, nowIso);
  const { entry } = applySm2(prev, input.grade, nowIso);
  book.entries[cardId] = entry;
  book.updatedAt = nowIso;
  await saveBook(book);

  // Mirror into adaptive exam planner ledger (successive relearning + history).
  try {
    const {
      recordAdaptiveUnitAttempt,
      reviewGradeToAdaptiveResult,
    } = await import("@/server/adaptive-planner/store");
    await recordAdaptiveUnitAttempt({
      learnerId: input.learnerId,
      knowledgeUnitId: cardId,
      result: reviewGradeToAdaptiveResult(input.grade),
      nowIso,
    });
  } catch {
    // Planner ledger must not break core scheduling.
  }

  return { entry, dueAt: entry.dueAt };
}

export async function countDueLearningAtoms(
  learnerId: string,
  nowIso = new Date().toISOString(),
): Promise<number> {
  const book = await loadBook(learnerId);
  let n = 0;
  for (const e of Object.values(book.entries)) {
    if (e.dueAt <= nowIso) n += 1;
  }
  return n;
}
