import { promises as fs } from "node:fs";
import path from "node:path";
import {
  applySolveToProgress,
  emptyKdoJsemProgress,
  isCorrectGuess,
  parseKdoJsemPack,
  pointsForHintCount,
  kdoJsemProgressSchema,
  type KdoJsemPack,
  type KdoJsemProgress,
} from "@/domain/learning/kdo-jsem";

export const KDO_JSEM_DIR = path.join(process.cwd(), "data", "kdo-jsem");
const PACKS_DIR = path.join(KDO_JSEM_DIR, "packs");
const PROGRESS_DIR = path.join(KDO_JSEM_DIR, "progress");
const INDEX_PATH = path.join(KDO_JSEM_DIR, "index.json");

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

export async function saveKdoJsemPack(pack: KdoJsemPack): Promise<void> {
  const validated = parseKdoJsemPack(pack);
  await ensureDirs();
  const file = packPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getKdoJsemPackById(
  id: string,
): Promise<KdoJsemPack | null> {
  try {
    return parseKdoJsemPack(
      JSON.parse(await fs.readFile(packPath(id), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getKdoJsemPackBySlug(
  slug: string,
): Promise<KdoJsemPack | null> {
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getKdoJsemPackById(id);
}

export async function listKdoJsemPacks(): Promise<KdoJsemPack[]> {
  await ensureDirs();
  const files = (await fs.readdir(PACKS_DIR)).filter((f) => f.endsWith(".json"));
  const packs: KdoJsemPack[] = [];
  for (const file of files) {
    const pack = await getKdoJsemPackById(file.replace(/\.json$/, ""));
    if (pack) packs.push(pack);
  }
  return packs.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}

export async function getKdoJsemProgress(
  learnerId: string,
  packId: string,
): Promise<KdoJsemProgress | null> {
  try {
    return kdoJsemProgressSchema.parse(
      JSON.parse(await fs.readFile(progressPath(learnerId, packId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveKdoJsemProgress(
  progress: KdoJsemProgress,
): Promise<void> {
  await ensureDirs();
  const validated = kdoJsemProgressSchema.parse(progress);
  const file = progressPath(validated.learnerId, validated.packId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function submitKdoJsemGuess(input: {
  learnerId: string;
  pack: KdoJsemPack;
  mysteryId: string;
  guess: string;
  hintsRevealed: number;
}): Promise<{
  progress: KdoJsemProgress;
  correct: boolean;
  points: number;
  answerName: string | null;
}> {
  const mystery = input.pack.mysteries.find((m) => m.id === input.mysteryId);
  if (!mystery) throw new Error("Záhada nenalezena.");
  const now = new Date().toISOString();
  const current =
    (await getKdoJsemProgress(input.learnerId, input.pack.id)) ??
    emptyKdoJsemProgress(input.learnerId, input.pack, now);

  const correct = isCorrectGuess(mystery, input.guess);
  if (!correct) {
    const progress: KdoJsemProgress = {
      ...current,
      attempts: current.attempts + 1,
      updatedAt: now,
    };
    await saveKdoJsemProgress(progress);
    return {
      progress,
      correct: false,
      points: 0,
      answerName: null,
    };
  }

  const points = pointsForHintCount(
    input.hintsRevealed,
    mystery.hints.length,
  );
  const progress = applySolveToProgress(
    current,
    mystery.id,
    points,
    input.hintsRevealed,
    now,
  );
  await saveKdoJsemProgress(progress);
  return { progress, correct: true, points, answerName: mystery.answerName };
}

export async function resetKdoJsemProgress(input: {
  learnerId: string;
  pack: KdoJsemPack;
}): Promise<KdoJsemProgress> {
  const now = new Date().toISOString();
  const progress = emptyKdoJsemProgress(input.learnerId, input.pack, now);
  await saveKdoJsemProgress(progress);
  return progress;
}
