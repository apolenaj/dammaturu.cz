import {
  buildReadinessSnapshot,
  readinessBookSchema,
  snapshotToHistoryPoint,
  upsertWeeklyHistory,
  type ReadinessBook,
  type ReadinessSnapshot,
} from "@/domain/learning/readiness";
import { promises as fs } from "node:fs";
import path from "node:path";
import { appendReadinessHistory } from "@/server/readiness/history-store";
import { gatherReadinessEvidence } from "@/server/readiness/gather-evidence";

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
  /** Persist daily history + weekly aggregate (hub / after practice). */
  persistHistory?: boolean;
}): Promise<{ book: ReadinessBook; snapshot: ReadinessSnapshot } | null> {
  const book = await getReadinessBook(input.learnerId);
  if (!book) return null;
  const nowIso = new Date().toISOString();
  const evidence = await gatherReadinessEvidence(input.learnerId);
  let snapshot = buildReadinessSnapshot(book, nowIso, evidence);

  if (input.persistHistory === true) {
    const point = snapshotToHistoryPoint(snapshot);
    await appendReadinessHistory(input.learnerId, point);
    const provisional = snapshot.overall.provisionalPct ?? snapshot.overallPct;
    const withWeek = upsertWeeklyHistory(book, provisional, nowIso);
    await saveReadinessBook(withWeek);
    snapshot = buildReadinessSnapshot(withWeek, nowIso, {
      ...evidence,
      history: [
        ...(evidence.history ?? []).filter(
          (h) => h.at.slice(0, 10) !== point.at.slice(0, 10),
        ),
        point,
      ].slice(-40),
    });
    return { book: withWeek, snapshot };
  }

  return { book, snapshot };
}
