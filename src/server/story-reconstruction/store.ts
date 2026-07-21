import {
  applyReconstructionAttempt,
  emptyReconstructionProgress,
  gradeReconstruction,
  parseStoryReconstructionPack,
  reconstructionProgressSchema,
  type AxisPoint,
  type ReconstructionDifficulty,
  type ReconstructionProgress,
  type StoryReconstructionPack,
} from "@/domain/learning/story-reconstruction";
import { promises as fs } from "node:fs";
import path from "node:path";

export const STORY_RECON_DIR = path.join(
  process.cwd(),
  "data",
  "story-reconstruction",
);
const PACKS_DIR = path.join(STORY_RECON_DIR, "packs");
const PROGRESS_DIR = path.join(STORY_RECON_DIR, "progress");
const INDEX_PATH = path.join(STORY_RECON_DIR, "index.json");

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
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) {
    throw new Error("Neplatné learner id");
  }
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

export async function saveStoryReconstructionPack(
  pack: StoryReconstructionPack,
): Promise<void> {
  const validated = parseStoryReconstructionPack(pack);
  await ensureDirs();
  const file = packPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getStoryReconstructionPackById(
  id: string,
): Promise<StoryReconstructionPack | null> {
  try {
    return parseStoryReconstructionPack(
      JSON.parse(await fs.readFile(packPath(id), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getStoryReconstructionPackBySlug(
  slug: string,
): Promise<StoryReconstructionPack | null> {
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getStoryReconstructionPackById(id);
}

export async function listStoryReconstructionPacks(): Promise<
  StoryReconstructionPack[]
> {
  await ensureDirs();
  const files = (await fs.readdir(PACKS_DIR)).filter((f) => f.endsWith(".json"));
  const packs: StoryReconstructionPack[] = [];
  for (const file of files) {
    const pack = await getStoryReconstructionPackById(
      file.replace(/\.json$/, ""),
    );
    if (pack) packs.push(pack);
  }
  return packs.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}

export async function getReconstructionProgress(
  learnerId: string,
  packId: string,
): Promise<ReconstructionProgress | null> {
  try {
    return reconstructionProgressSchema.parse(
      JSON.parse(await fs.readFile(progressPath(learnerId, packId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveReconstructionProgress(
  progress: ReconstructionProgress,
): Promise<void> {
  await ensureDirs();
  const validated = reconstructionProgressSchema.parse(progress);
  const file = progressPath(validated.learnerId, validated.packId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function submitReconstruction(input: {
  learnerId: string;
  pack: StoryReconstructionPack;
  storyId: string;
  difficulty: ReconstructionDifficulty;
  submittedOrder: string[];
  elapsedMs: number;
}): Promise<{
  progress: ReconstructionProgress;
  correct: boolean;
  expectedOrder: string[];
  axis: AxisPoint[] | null;
}> {
  const graded = gradeReconstruction({
    pack: input.pack,
    storyId: input.storyId,
    difficulty: input.difficulty,
    submittedOrder: input.submittedOrder,
  });
  if (!graded) throw new Error("Neplatný pokus.");

  const now = new Date().toISOString();
  const current =
    (await getReconstructionProgress(input.learnerId, input.pack.id)) ??
    emptyReconstructionProgress(input.learnerId, input.pack, now);

  const progress = applyReconstructionAttempt(
    current,
    {
      storyId: input.storyId,
      difficulty: input.difficulty,
      submittedOrder: input.submittedOrder,
      correct: graded.correct,
      elapsedMs: input.elapsedMs,
      at: now,
    },
    now,
  );
  await saveReconstructionProgress(progress);
  return {
    progress,
    correct: graded.correct,
    expectedOrder: graded.expectedOrder,
    axis: graded.axis,
  };
}
