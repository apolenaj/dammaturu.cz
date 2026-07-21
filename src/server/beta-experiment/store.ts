import { promises as fs } from "node:fs";
import path from "node:path";
import {
  createEmptyExperimentBook,
  experimentBookSchema,
  type ExperimentBook,
} from "@/domain/learning/beta-experiment";
import { assertSafeId } from "@/server/safe-id";

export const BETA_EXPERIMENT_DIR = path.join(
  process.cwd(),
  "data",
  "beta-experiment",
);

function bookPath(learnerId: string) {
  assertSafeId(learnerId, "learner id");
  return path.join(BETA_EXPERIMENT_DIR, `${learnerId}.json`);
}

async function ensureDir() {
  await fs.mkdir(BETA_EXPERIMENT_DIR, { recursive: true });
}

export async function getExperimentBook(
  learnerId: string,
): Promise<ExperimentBook | null> {
  try {
    const raw = JSON.parse(await fs.readFile(bookPath(learnerId), "utf8"));
    return experimentBookSchema.parse(raw);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getOrCreateExperimentBook(input: {
  learnerId: string;
  targetDate?: string;
}): Promise<ExperimentBook> {
  const existing = await getExperimentBook(input.learnerId);
  if (existing) return existing;
  const book = createEmptyExperimentBook({
    learnerId: input.learnerId,
    targetDate: input.targetDate,
  });
  await saveExperimentBook(book);
  return book;
}

export async function saveExperimentBook(book: ExperimentBook): Promise<void> {
  const validated = experimentBookSchema.parse({
    ...book,
    updatedAt: new Date().toISOString(),
  });
  await ensureDir();
  const file = bookPath(validated.learnerId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function clearBetaExperimentForTests(): Promise<void> {
  await fs.rm(BETA_EXPERIMENT_DIR, { recursive: true, force: true });
}
