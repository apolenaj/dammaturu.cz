import { promises as fs } from "node:fs";
import path from "node:path";
import {
  adaptivePlannerBookSchema,
  createAdaptiveUnit,
  emptyAdaptiveBook,
  recordAdaptiveAttempt,
  type AdaptiveAttemptResult,
  type AdaptivePlannerBook,
  type AdaptivePlannerMode,
  type AdaptiveUnitState,
} from "@/domain/learning/adaptive-exam-planner";

const ROOT = path.join(process.cwd(), "data", "adaptive-planner");

function assertSafe(id: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error("Neplatné id");
  }
}

function filePath(learnerId: string): string {
  assertSafe(learnerId);
  return path.join(ROOT, `${learnerId}.json`);
}

export async function getAdaptivePlannerBook(
  learnerId: string,
): Promise<AdaptivePlannerBook> {
  try {
    const raw = JSON.parse(await fs.readFile(filePath(learnerId), "utf8"));
    return adaptivePlannerBookSchema.parse(raw);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return emptyAdaptiveBook(learnerId, new Date().toISOString());
    }
    throw error;
  }
}

export async function saveAdaptivePlannerBook(
  book: AdaptivePlannerBook,
): Promise<void> {
  const validated = adaptivePlannerBookSchema.parse(book);
  await fs.mkdir(ROOT, { recursive: true });
  const dest = filePath(validated.learnerId);
  const tmp = `${dest}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, dest);
}

export async function setAdaptivePlannerMode(input: {
  learnerId: string;
  mode: AdaptivePlannerMode;
}): Promise<AdaptivePlannerBook> {
  const nowIso = new Date().toISOString();
  const book = await getAdaptivePlannerBook(input.learnerId);
  const next: AdaptivePlannerBook = {
    ...book,
    preferredMode: input.mode,
    updatedAt: nowIso,
  };
  await saveAdaptivePlannerBook(next);
  return next;
}

export async function listAdaptiveUnits(
  learnerId: string,
): Promise<AdaptiveUnitState[]> {
  const book = await getAdaptivePlannerBook(learnerId);
  return Object.values(book.units);
}

/**
 * Record attempt into adaptive KU ledger (successive relearning + history).
 * Keeps FSRS schedule snapshot on the unit.
 */
export async function recordAdaptiveUnitAttempt(input: {
  learnerId: string;
  knowledgeUnitId: string;
  result: AdaptiveAttemptResult;
  nowIso?: string;
  titleCs?: string;
  contentDifficulty?: number;
  examPriority?: number;
  sessionKey?: string;
}): Promise<AdaptiveUnitState> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const book = await getAdaptivePlannerBook(input.learnerId);
  const prev =
    book.units[input.knowledgeUnitId] ??
    createAdaptiveUnit(input.knowledgeUnitId, nowIso, {
      titleCs: input.titleCs,
      difficulty: input.contentDifficulty,
      examPriority: input.examPriority,
    });

  const nextUnit = recordAdaptiveAttempt({
    unit: prev,
    result: input.result,
    nowIso,
    sessionKey: input.sessionKey,
    contentDifficulty: input.contentDifficulty,
  });

  book.units[input.knowledgeUnitId] = nextUnit;
  book.updatedAt = nowIso;
  await saveAdaptivePlannerBook(book);
  return nextUnit;
}

export function reviewGradeToAdaptiveResult(
  grade: "dont_know" | "almost" | "know",
): AdaptiveAttemptResult {
  if (grade === "know") return "correct";
  if (grade === "almost") return "partial";
  return "incorrect";
}
