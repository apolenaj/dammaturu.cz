import { promises as fs } from "node:fs";
import path from "node:path";
import {
  parseStoryPack,
  storyProgressSchema,
  type StoryPack,
  type StoryProgress,
} from "@/domain/learning/story-mode";

export const STORY_DIR = path.join(process.cwd(), "data", "story-mode");
const PACKS_DIR = path.join(STORY_DIR, "packs");
const PROGRESS_DIR = path.join(STORY_DIR, "progress");
const INDEX_PATH = path.join(STORY_DIR, "index.json");

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
  const tmp = `${INDEX_PATH}.${process.pid}.${Date.now()}.${Math.random()
    .toString(16)
    .slice(2)}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  try {
    await fs.rename(tmp, INDEX_PATH);
  } catch (error) {
    await fs.unlink(tmp).catch(() => undefined);
    throw error;
  }
}

export async function saveStoryPack(pack: StoryPack): Promise<void> {
  const validated = parseStoryPack(pack);
  await ensureDirs();
  const file = packPath(validated.id);
  const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random()
    .toString(16)
    .slice(2)}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  try {
    await fs.rename(tmp, file);
  } catch (error) {
    await fs.unlink(tmp).catch(() => undefined);
    throw error;
  }
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getStoryPackById(id: string): Promise<StoryPack | null> {
  try {
    return parseStoryPack(JSON.parse(await fs.readFile(packPath(id), "utf8")));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    console.error("[story-mode] pack unreadable", id, error);
    return null;
  }
}

export async function getStoryPackBySlug(
  slug: string,
): Promise<StoryPack | null> {
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getStoryPackById(id);
}

/** In-flight ensure — collapses parallel page/metadata loads for the same slug. */
const ensurePackInFlight = new Map<string, Promise<StoryPack | null>>();

/**
 * Load pack by slug; if missing, try seeding from verified Content QA documents.
 * Never throws — returns null when documents / pack are unavailable.
 */
export async function ensureStoryPackBySlug(
  slug: string,
): Promise<StoryPack | null> {
  const inflight = ensurePackInFlight.get(slug);
  if (inflight) return inflight;

  const task = (async () => {
    try {
      const existing = await getStoryPackBySlug(slug);
      if (existing) return existing;
      if (slug !== "narodni-obrozeni") return null;
      const { seedStoryMode } = await import("@/server/story-mode/seed");
      await seedStoryMode();
      return getStoryPackBySlug(slug);
    } catch (error) {
      console.error("[story-mode] ensure pack failed", slug, error);
      return null;
    }
  })().finally(() => {
    ensurePackInFlight.delete(slug);
  });

  ensurePackInFlight.set(slug, task);
  return task;
}

export async function listStoryPacks(): Promise<StoryPack[]> {
  await ensureDirs();
  const files = (await fs.readdir(PACKS_DIR)).filter((f) => f.endsWith(".json"));
  const packs: StoryPack[] = [];
  for (const file of files) {
    const pack = await getStoryPackById(file.replace(/\.json$/, ""));
    if (pack) packs.push(pack);
  }
  return packs.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}

export async function getStoryProgress(
  learnerId: string,
  packId: string,
): Promise<StoryProgress | null> {
  try {
    return storyProgressSchema.parse(
      JSON.parse(await fs.readFile(progressPath(learnerId, packId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    console.error("[story-mode] progress unreadable", learnerId, packId, error);
    return null;
  }
}

export async function saveStoryProgress(progress: StoryProgress): Promise<void> {
  await ensureDirs();
  const validated = storyProgressSchema.parse(progress);
  const file = progressPath(validated.learnerId, validated.packId);
  const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random()
    .toString(16)
    .slice(2)}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  try {
    await fs.rename(tmp, file);
  } catch (error) {
    await fs.unlink(tmp).catch(() => undefined);
    throw error;
  }
}

function emptyProgress(
  learnerId: string,
  pack: StoryPack,
  now: string,
): StoryProgress {
  return {
    learnerId,
    packId: pack.id,
    packSlug: pack.slug,
    currentBeatIndex: 0,
    completedBeatIds: [],
    checksAnswered: 0,
    checksCorrect: 0,
    status: "in_progress",
    startedAt: now,
    completedAt: null,
    updatedAt: now,
  };
}

function advance(
  progress: StoryProgress,
  pack: StoryPack,
  beatIndex: number,
  beatId: string,
  now: string,
): StoryProgress {
  const next = { ...progress, updatedAt: now };
  if (!next.completedBeatIds.includes(beatId)) {
    next.completedBeatIds = [...next.completedBeatIds, beatId];
  }
  const following = beatIndex + 1;
  if (following >= pack.beats.length) {
    next.status = "completed";
    next.completedAt = now;
    next.currentBeatIndex = beatIndex;
  } else {
    next.currentBeatIndex = following;
  }
  return next;
}

/** Continue from a non-graded beat (timeline, cause_effect, person_card, decision). */
export async function continueStoryBeat(input: {
  learnerId: string;
  pack: StoryPack;
  beatId: string;
}): Promise<StoryProgress> {
  const now = new Date().toISOString();
  const beatIndex = input.pack.beats.findIndex((b) => b.id === input.beatId);
  if (beatIndex < 0) throw new Error("Beat nenalezen.");
  let progress =
    (await getStoryProgress(input.learnerId, input.pack.id)) ??
    emptyProgress(input.learnerId, input.pack, now);
  progress = advance(progress, input.pack, beatIndex, input.beatId, now);
  await saveStoryProgress(progress);
  return progress;
}

export async function answerStoryChoice(input: {
  learnerId: string;
  pack: StoryPack;
  beatId: string;
  correct: boolean;
  /** For checkpoint multi-item */
  completeBeat?: boolean;
}): Promise<StoryProgress> {
  const now = new Date().toISOString();
  const beatIndex = input.pack.beats.findIndex((b) => b.id === input.beatId);
  if (beatIndex < 0) throw new Error("Beat nenalezen.");
  let progress =
    (await getStoryProgress(input.learnerId, input.pack.id)) ??
    emptyProgress(input.learnerId, input.pack, now);

  progress = {
    ...progress,
    checksAnswered: progress.checksAnswered + 1,
    checksCorrect: progress.checksCorrect + (input.correct ? 1 : 0),
    updatedAt: now,
    currentBeatIndex: beatIndex,
  };

  if (input.completeBeat !== false) {
    progress = advance(progress, input.pack, beatIndex, input.beatId, now);
  }

  await saveStoryProgress(progress);
  return progress;
}
