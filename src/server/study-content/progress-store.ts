import { promises as fs } from "node:fs";
import path from "node:path";
import type { StudyContentProgress } from "@/domain/study-content/registry";

const ROOT = path.join(process.cwd(), "data", "study-content-progress");

function assertSafe(id: string, label: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`Neplatné ${label}`);
  }
}

function filePath(learnerId: string, sourceId: string): string {
  assertSafe(learnerId, "learner id");
  assertSafe(sourceId, "source id");
  return path.join(ROOT, learnerId, `${sourceId}.json`);
}

async function ensureDir(learnerId: string) {
  assertSafe(learnerId, "learner id");
  await fs.mkdir(path.join(ROOT, learnerId), { recursive: true });
}

export async function getStudyContentProgress(
  learnerId: string,
  sourceId: string,
): Promise<StudyContentProgress | null> {
  try {
    const raw = await fs.readFile(filePath(learnerId, sourceId), "utf8");
    return JSON.parse(raw) as StudyContentProgress;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveStudyContentProgress(
  progress: StudyContentProgress,
): Promise<void> {
  await ensureDir(progress.learnerId);
  const dest = filePath(progress.learnerId, progress.sourceId);
  const tmp = `${dest}.${process.pid}.${Date.now()}.${Math.random()
    .toString(16)
    .slice(2)}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(progress, null, 2)}\n`, "utf8");
  try {
    await fs.rename(tmp, dest);
  } catch (error) {
    await fs.unlink(tmp).catch(() => undefined);
    throw error;
  }
}

export async function touchStudyContentOpen(input: {
  learnerId: string;
  sourceId: string;
}): Promise<StudyContentProgress> {
  const now = new Date().toISOString();
  const existing = await getStudyContentProgress(
    input.learnerId,
    input.sourceId,
  );
  const next: StudyContentProgress = existing ?? {
    learnerId: input.learnerId,
    sourceId: input.sourceId,
    lastChunkIndex: 0,
    completedChunkIds: [],
    completedUnitIds: [],
    quickTestAttempts: 0,
    quickTestCorrect: 0,
    lastOpenedAt: now,
    updatedAt: now,
  };
  next.lastOpenedAt = now;
  next.updatedAt = now;
  await saveStudyContentProgress(next);
  return next;
}

export async function markChunkCompleted(input: {
  learnerId: string;
  sourceId: string;
  chunkId: string;
  chunkIndex: number;
}): Promise<StudyContentProgress> {
  const now = new Date().toISOString();
  const existing =
    (await getStudyContentProgress(input.learnerId, input.sourceId)) ??
    ({
      learnerId: input.learnerId,
      sourceId: input.sourceId,
      lastChunkIndex: 0,
      completedChunkIds: [],
      completedUnitIds: [],
      quickTestAttempts: 0,
      quickTestCorrect: 0,
      lastOpenedAt: now,
      updatedAt: now,
    } satisfies StudyContentProgress);

  const completedChunkIds = [
    ...new Set([...existing.completedChunkIds, input.chunkId]),
  ];
  const next: StudyContentProgress = {
    ...existing,
    lastChunkIndex: Math.max(existing.lastChunkIndex, input.chunkIndex),
    completedChunkIds,
    lastOpenedAt: now,
    updatedAt: now,
  };
  await saveStudyContentProgress(next);
  return next;
}

export async function markUnitCompleted(input: {
  learnerId: string;
  sourceId: string;
  unitId: string;
}): Promise<StudyContentProgress> {
  const now = new Date().toISOString();
  const existing =
    (await getStudyContentProgress(input.learnerId, input.sourceId)) ??
    ({
      learnerId: input.learnerId,
      sourceId: input.sourceId,
      lastChunkIndex: 0,
      completedChunkIds: [],
      completedUnitIds: [],
      quickTestAttempts: 0,
      quickTestCorrect: 0,
      lastOpenedAt: now,
      updatedAt: now,
    } satisfies StudyContentProgress);

  const next: StudyContentProgress = {
    ...existing,
    completedUnitIds: [
      ...new Set([...existing.completedUnitIds, input.unitId]),
    ],
    lastOpenedAt: now,
    updatedAt: now,
  };
  await saveStudyContentProgress(next);
  return next;
}

export async function recordQuickTestResult(input: {
  learnerId: string;
  sourceId: string;
  correct: boolean;
}): Promise<StudyContentProgress> {
  const now = new Date().toISOString();
  const existing =
    (await getStudyContentProgress(input.learnerId, input.sourceId)) ??
    ({
      learnerId: input.learnerId,
      sourceId: input.sourceId,
      lastChunkIndex: 0,
      completedChunkIds: [],
      completedUnitIds: [],
      quickTestAttempts: 0,
      quickTestCorrect: 0,
      lastOpenedAt: now,
      updatedAt: now,
    } satisfies StudyContentProgress);

  const next: StudyContentProgress = {
    ...existing,
    quickTestAttempts: existing.quickTestAttempts + 1,
    quickTestCorrect:
      existing.quickTestCorrect + (input.correct ? 1 : 0),
    lastOpenedAt: now,
    updatedAt: now,
  };
  await saveStudyContentProgress(next);
  return next;
}

export async function listProgressForLearner(
  learnerId: string,
): Promise<StudyContentProgress[]> {
  assertSafe(learnerId, "learner id");
  const dir = path.join(ROOT, learnerId);
  try {
    const files = await fs.readdir(dir);
    const out: StudyContentProgress[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const raw = await fs.readFile(path.join(dir, file), "utf8");
      out.push(JSON.parse(raw) as StudyContentProgress);
    }
    return out.sort((a, b) =>
      b.lastOpenedAt.localeCompare(a.lastOpenedAt),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw error;
  }
}
