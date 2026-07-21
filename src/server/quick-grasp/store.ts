import { promises as fs } from "node:fs";
import path from "node:path";
import {
  parseQuickGraspPack,
  quickGraspProgressSchema,
  type QuickGraspPack,
  type QuickGraspProgress,
} from "@/domain/learning/quick-grasp";

export const QUICK_GRASP_DIR = path.join(process.cwd(), "data", "quick-grasp");
const PACKS_DIR = path.join(QUICK_GRASP_DIR, "packs");
const PROGRESS_DIR = path.join(QUICK_GRASP_DIR, "progress");
const INDEX_PATH = path.join(QUICK_GRASP_DIR, "index.json");

type PackIndex = { bySlug: Record<string, string> };

async function ensureDirs() {
  await fs.mkdir(PACKS_DIR, { recursive: true });
  await fs.mkdir(PROGRESS_DIR, { recursive: true });
}

function packPath(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Neplatné pack id");
  return path.join(PACKS_DIR, `${id}.json`);
}

function progressPath(learnerId: string, packId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) throw new Error("Neplatné learner id");
  if (!/^[a-f0-9-]{36}$/i.test(packId)) throw new Error("Neplatné pack id");
  return path.join(PROGRESS_DIR, `${learnerId}__${packId}.json`);
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

export async function saveQuickGraspPack(pack: QuickGraspPack): Promise<void> {
  const validated = parseQuickGraspPack(pack);
  await ensureDirs();
  const file = packPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getQuickGraspPackById(
  id: string,
): Promise<QuickGraspPack | null> {
  try {
    return parseQuickGraspPack(
      JSON.parse(await fs.readFile(packPath(id), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getQuickGraspPackBySlug(
  slug: string,
): Promise<QuickGraspPack | null> {
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getQuickGraspPackById(id);
}

export async function listQuickGraspPacks(): Promise<QuickGraspPack[]> {
  await ensureDirs();
  const files = (await fs.readdir(PACKS_DIR)).filter((f) => f.endsWith(".json"));
  const packs: QuickGraspPack[] = [];
  for (const file of files) {
    const pack = await getQuickGraspPackById(file.replace(/\.json$/, ""));
    if (pack) packs.push(pack);
  }
  return packs.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}

export async function getQuickGraspProgress(
  learnerId: string,
  packId: string,
): Promise<QuickGraspProgress | null> {
  try {
    return quickGraspProgressSchema.parse(
      JSON.parse(await fs.readFile(progressPath(learnerId, packId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveQuickGraspProgress(
  progress: QuickGraspProgress,
): Promise<void> {
  await ensureDirs();
  const validated = quickGraspProgressSchema.parse(progress);
  const file = progressPath(validated.learnerId, validated.packId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

function emptyProgress(
  learnerId: string,
  pack: QuickGraspPack,
  now: string,
): QuickGraspProgress {
  return {
    learnerId,
    packId: pack.id,
    packSlug: pack.slug,
    currentStepIndex: 0,
    completedStepIds: [],
    checksAnswered: 0,
    checksCorrect: 0,
    status: "in_progress",
    startedAt: now,
    completedAt: null,
    updatedAt: now,
  };
}

function advanceAfterStepComplete(
  progress: QuickGraspProgress,
  pack: QuickGraspPack,
  stepIndex: number,
  stepId: string,
  now: string,
): QuickGraspProgress {
  const next = { ...progress, updatedAt: now };
  if (!next.completedStepIds.includes(stepId)) {
    next.completedStepIds = [...next.completedStepIds, stepId];
  }
  const following = stepIndex + 1;
  if (following >= pack.steps.length) {
    next.status = "completed";
    next.completedAt = now;
    next.currentStepIndex = stepIndex;
  } else {
    next.currentStepIndex = following;
  }
  return next;
}

/** Microblock: one check → complete step + advance. */
export async function recordMicroAnswer(input: {
  learnerId: string;
  pack: QuickGraspPack;
  stepId: string;
  choiceIndex: number;
  correct: boolean;
}): Promise<QuickGraspProgress> {
  const now = new Date().toISOString();
  const stepIndex = input.pack.steps.findIndex((s) => s.id === input.stepId);
  if (stepIndex < 0) throw new Error("Krok nenalezen.");
  const step = input.pack.steps[stepIndex]!;
  if (step.type !== "micro") throw new Error("Očekáván mikroblok.");

  let progress =
    (await getQuickGraspProgress(input.learnerId, input.pack.id)) ??
    emptyProgress(input.learnerId, input.pack, now);

  progress = {
    ...progress,
    checksAnswered: progress.checksAnswered + 1,
    checksCorrect: progress.checksCorrect + (input.correct ? 1 : 0),
    updatedAt: now,
  };

  progress = advanceAfterStepComplete(
    progress,
    input.pack,
    stepIndex,
    step.id,
    now,
  );
  await saveQuickGraspProgress(progress);
  return progress;
}

/**
 * Checkpoint item answer. Pass all answered item ids (including current).
 * When all items done → complete step + advance.
 */
export async function recordCheckpointAnswer(input: {
  learnerId: string;
  pack: QuickGraspPack;
  stepId: string;
  answeredItemIds: string[];
  correct: boolean;
}): Promise<QuickGraspProgress> {
  const now = new Date().toISOString();
  const stepIndex = input.pack.steps.findIndex((s) => s.id === input.stepId);
  if (stepIndex < 0) throw new Error("Krok nenalezen.");
  const step = input.pack.steps[stepIndex]!;
  if (step.type !== "checkpoint") throw new Error("Očekáván checkpoint.");

  let progress =
    (await getQuickGraspProgress(input.learnerId, input.pack.id)) ??
    emptyProgress(input.learnerId, input.pack, now);

  progress = {
    ...progress,
    checksAnswered: progress.checksAnswered + 1,
    checksCorrect: progress.checksCorrect + (input.correct ? 1 : 0),
    updatedAt: now,
    currentStepIndex: stepIndex,
  };

  const allDone = step.items.every((it) =>
    input.answeredItemIds.includes(it.id),
  );
  if (allDone) {
    progress = advanceAfterStepComplete(
      progress,
      input.pack,
      stepIndex,
      step.id,
      now,
    );
  }

  await saveQuickGraspProgress(progress);
  return progress;
}
