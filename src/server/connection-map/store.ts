import { promises as fs } from "node:fs";
import path from "node:path";
import {
  parseConnectionMapPack,
  connectionMapProgressSchema,
  type ConnectionMapMode,
  type ConnectionMapPack,
  type ConnectionMapProgress,
} from "@/domain/learning/connection-map";

export const CONNECTION_MAP_DIR = path.join(
  process.cwd(),
  "data",
  "connection-map",
);
const PACKS_DIR = path.join(CONNECTION_MAP_DIR, "packs");
const PROGRESS_DIR = path.join(CONNECTION_MAP_DIR, "progress");
const INDEX_PATH = path.join(CONNECTION_MAP_DIR, "index.json");

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

export async function saveConnectionMapPack(
  pack: ConnectionMapPack,
): Promise<void> {
  const validated = parseConnectionMapPack(pack);
  await ensureDirs();
  const file = packPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getConnectionMapPackById(
  id: string,
): Promise<ConnectionMapPack | null> {
  try {
    return parseConnectionMapPack(
      JSON.parse(await fs.readFile(packPath(id), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getConnectionMapPackBySlug(
  slug: string,
): Promise<ConnectionMapPack | null> {
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getConnectionMapPackById(id);
}

export async function listConnectionMapPacks(): Promise<ConnectionMapPack[]> {
  await ensureDirs();
  const files = (await fs.readdir(PACKS_DIR)).filter((f) => f.endsWith(".json"));
  const packs: ConnectionMapPack[] = [];
  for (const file of files) {
    const pack = await getConnectionMapPackById(file.replace(/\.json$/, ""));
    if (pack) packs.push(pack);
  }
  return packs.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}

export async function getConnectionMapProgress(
  learnerId: string,
  packId: string,
): Promise<ConnectionMapProgress | null> {
  try {
    return connectionMapProgressSchema.parse(
      JSON.parse(await fs.readFile(progressPath(learnerId, packId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveConnectionMapProgress(
  progress: ConnectionMapProgress,
): Promise<void> {
  await ensureDirs();
  const validated = connectionMapProgressSchema.parse(progress);
  const file = progressPath(validated.learnerId, validated.packId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

function emptyProgress(
  learnerId: string,
  pack: ConnectionMapPack,
  now: string,
): ConnectionMapProgress {
  return {
    learnerId,
    packId: pack.id,
    packSlug: pack.slug,
    mode: "explore",
    fillAnswered: 0,
    fillCorrect: 0,
    exploredNodeIds: [],
    completedPathIds: [],
    updatedAt: now,
  };
}

export async function upsertConnectionMapProgress(input: {
  learnerId: string;
  pack: ConnectionMapPack;
  patch: Partial<
    Pick<
      ConnectionMapProgress,
      | "mode"
      | "fillAnswered"
      | "fillCorrect"
      | "exploredNodeIds"
      | "completedPathIds"
    >
  >;
}): Promise<ConnectionMapProgress> {
  const now = new Date().toISOString();
  const current =
    (await getConnectionMapProgress(input.learnerId, input.pack.id)) ??
    emptyProgress(input.learnerId, input.pack, now);
  const next: ConnectionMapProgress = {
    ...current,
    ...input.patch,
    updatedAt: now,
  };
  await saveConnectionMapProgress(next);
  return next;
}

export async function setConnectionMapMode(input: {
  learnerId: string;
  pack: ConnectionMapPack;
  mode: ConnectionMapMode;
}): Promise<ConnectionMapProgress> {
  return upsertConnectionMapProgress({
    learnerId: input.learnerId,
    pack: input.pack,
    patch: { mode: input.mode },
  });
}

export async function recordConnectionMapExplore(input: {
  learnerId: string;
  pack: ConnectionMapPack;
  nodeId: string;
}): Promise<ConnectionMapProgress> {
  const now = new Date().toISOString();
  const current =
    (await getConnectionMapProgress(input.learnerId, input.pack.id)) ??
    emptyProgress(input.learnerId, input.pack, now);
  const explored = current.exploredNodeIds.includes(input.nodeId)
    ? current.exploredNodeIds
    : [...current.exploredNodeIds, input.nodeId];
  return upsertConnectionMapProgress({
    learnerId: input.learnerId,
    pack: input.pack,
    patch: { exploredNodeIds: explored },
  });
}

export async function recordConnectionMapFill(input: {
  learnerId: string;
  pack: ConnectionMapPack;
  pathId: string;
  allCorrect: boolean;
}): Promise<ConnectionMapProgress> {
  const now = new Date().toISOString();
  const current =
    (await getConnectionMapProgress(input.learnerId, input.pack.id)) ??
    emptyProgress(input.learnerId, input.pack, now);
  const completed =
    input.allCorrect && !current.completedPathIds.includes(input.pathId)
      ? [...current.completedPathIds, input.pathId]
      : current.completedPathIds;
  return upsertConnectionMapProgress({
    learnerId: input.learnerId,
    pack: input.pack,
    patch: {
      fillAnswered: current.fillAnswered + 1,
      fillCorrect: current.fillCorrect + (input.allCorrect ? 1 : 0),
      completedPathIds: completed,
    },
  });
}
