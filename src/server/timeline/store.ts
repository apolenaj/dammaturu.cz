import { promises as fs } from "node:fs";
import path from "node:path";
import {
  parseTimelinePack,
  timelineProgressSchema,
  type TimelineMode,
  type TimelinePack,
  type TimelineProgress,
} from "@/domain/learning/timeline";

export const TIMELINE_DIR = path.join(process.cwd(), "data", "timeline");
const PACKS_DIR = path.join(TIMELINE_DIR, "packs");
const PROGRESS_DIR = path.join(TIMELINE_DIR, "progress");
const INDEX_PATH = path.join(TIMELINE_DIR, "index.json");

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

export async function saveTimelinePack(pack: TimelinePack): Promise<void> {
  const validated = parseTimelinePack(pack);
  await ensureDirs();
  const file = packPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getTimelinePackById(
  id: string,
): Promise<TimelinePack | null> {
  try {
    return parseTimelinePack(
      JSON.parse(await fs.readFile(packPath(id), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getTimelinePackBySlug(
  slug: string,
): Promise<TimelinePack | null> {
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getTimelinePackById(id);
}

export async function listTimelinePacks(): Promise<TimelinePack[]> {
  await ensureDirs();
  const files = (await fs.readdir(PACKS_DIR)).filter((f) => f.endsWith(".json"));
  const packs: TimelinePack[] = [];
  for (const file of files) {
    const pack = await getTimelinePackById(file.replace(/\.json$/, ""));
    if (pack) packs.push(pack);
  }
  return packs.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}

export async function getTimelineProgress(
  learnerId: string,
  packId: string,
): Promise<TimelineProgress | null> {
  try {
    return timelineProgressSchema.parse(
      JSON.parse(await fs.readFile(progressPath(learnerId, packId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveTimelineProgress(
  progress: TimelineProgress,
): Promise<void> {
  await ensureDirs();
  const validated = timelineProgressSchema.parse(progress);
  const file = progressPath(validated.learnerId, validated.packId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

function emptyProgress(
  learnerId: string,
  pack: TimelinePack,
  now: string,
): TimelineProgress {
  return {
    learnerId,
    packId: pack.id,
    packSlug: pack.slug,
    mode: "learn",
    quizAnswered: 0,
    quizCorrect: 0,
    reorderAttempts: 0,
    reorderSuccesses: 0,
    viewedEventIds: [],
    updatedAt: now,
  };
}

export async function upsertTimelineProgress(input: {
  learnerId: string;
  pack: TimelinePack;
  patch: Partial<
    Pick<
      TimelineProgress,
      | "mode"
      | "quizAnswered"
      | "quizCorrect"
      | "reorderAttempts"
      | "reorderSuccesses"
      | "viewedEventIds"
    >
  >;
}): Promise<TimelineProgress> {
  const now = new Date().toISOString();
  const current =
    (await getTimelineProgress(input.learnerId, input.pack.id)) ??
    emptyProgress(input.learnerId, input.pack, now);
  const next: TimelineProgress = {
    ...current,
    ...input.patch,
    updatedAt: now,
  };
  await saveTimelineProgress(next);
  return next;
}

export async function recordTimelineQuizAnswer(input: {
  learnerId: string;
  pack: TimelinePack;
  correct: boolean;
}): Promise<TimelineProgress> {
  const now = new Date().toISOString();
  const current =
    (await getTimelineProgress(input.learnerId, input.pack.id)) ??
    emptyProgress(input.learnerId, input.pack, now);
  return upsertTimelineProgress({
    learnerId: input.learnerId,
    pack: input.pack,
    patch: {
      quizAnswered: current.quizAnswered + 1,
      quizCorrect: current.quizCorrect + (input.correct ? 1 : 0),
    },
  });
}

export async function recordTimelineReorder(input: {
  learnerId: string;
  pack: TimelinePack;
  success: boolean;
}): Promise<TimelineProgress> {
  const now = new Date().toISOString();
  const current =
    (await getTimelineProgress(input.learnerId, input.pack.id)) ??
    emptyProgress(input.learnerId, input.pack, now);
  return upsertTimelineProgress({
    learnerId: input.learnerId,
    pack: input.pack,
    patch: {
      reorderAttempts: current.reorderAttempts + 1,
      reorderSuccesses: current.reorderSuccesses + (input.success ? 1 : 0),
    },
  });
}

export async function setTimelineMode(input: {
  learnerId: string;
  pack: TimelinePack;
  mode: TimelineMode;
}): Promise<TimelineProgress> {
  return upsertTimelineProgress({
    learnerId: input.learnerId,
    pack: input.pack,
    patch: { mode: input.mode },
  });
}

export async function recordTimelineView(input: {
  learnerId: string;
  pack: TimelinePack;
  eventId: string;
}): Promise<TimelineProgress> {
  const now = new Date().toISOString();
  const current =
    (await getTimelineProgress(input.learnerId, input.pack.id)) ??
    emptyProgress(input.learnerId, input.pack, now);
  const viewed = current.viewedEventIds.includes(input.eventId)
    ? current.viewedEventIds
    : [...current.viewedEventIds, input.eventId];
  return upsertTimelineProgress({
    learnerId: input.learnerId,
    pack: input.pack,
    patch: { viewedEventIds: viewed },
  });
}
