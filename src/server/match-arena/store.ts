import {
  applyMatchAttempt,
  dequeueReviewedPair,
  emptyReviewQueue,
  enqueueWrongPair,
  matchArenaSessionSchema,
  matchReviewQueueSchema,
  parseMatchArenaPack,
  startMatchSession,
  summarizeMatchSession,
  type MatchArenaPack,
  type MatchArenaSession,
  type MatchGradeResult,
  type MatchReviewQueue,
  type MatchSessionSummary,
} from "@/domain/learning/match-arena";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const MATCH_ARENA_DIR = path.join(process.cwd(), "data", "match-arena");
const PACKS_DIR = path.join(MATCH_ARENA_DIR, "packs");
const SESSIONS_DIR = path.join(MATCH_ARENA_DIR, "sessions");
const REVIEW_DIR = path.join(MATCH_ARENA_DIR, "review");
const INDEX_PATH = path.join(MATCH_ARENA_DIR, "index.json");

type PackIndex = { bySlug: Record<string, string> };

async function ensureDirs() {
  await fs.mkdir(PACKS_DIR, { recursive: true });
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
  await fs.mkdir(REVIEW_DIR, { recursive: true });
}

function packPath(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Neplatné pack id");
  return path.join(PACKS_DIR, `${id}.json`);
}

function sessionPath(learnerId: string, sessionId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) {
    throw new Error("Neplatné learner id");
  }
  if (!/^[a-f0-9-]{36}$/i.test(sessionId)) throw new Error("Neplatné session id");
  return path.join(SESSIONS_DIR, `${learnerId}__${sessionId}.json`);
}

function reviewPath(learnerId: string, packId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) {
    throw new Error("Neplatné learner id");
  }
  if (!/^[a-f0-9-]{36}$/i.test(packId)) throw new Error("Neplatné pack id");
  return path.join(REVIEW_DIR, `${learnerId}__${packId}.json`);
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

export async function saveMatchArenaPack(pack: MatchArenaPack): Promise<void> {
  const validated = parseMatchArenaPack(pack);
  await ensureDirs();
  const file = packPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getMatchArenaPackById(
  id: string,
): Promise<MatchArenaPack | null> {
  try {
    return parseMatchArenaPack(
      JSON.parse(await fs.readFile(packPath(id), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getMatchArenaPackBySlug(
  slug: string,
): Promise<MatchArenaPack | null> {
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getMatchArenaPackById(id);
}

export async function listMatchArenaPacks(): Promise<MatchArenaPack[]> {
  await ensureDirs();
  const files = (await fs.readdir(PACKS_DIR)).filter((f) => f.endsWith(".json"));
  const packs: MatchArenaPack[] = [];
  for (const file of files) {
    const pack = await getMatchArenaPackById(file.replace(/\.json$/, ""));
    if (pack) packs.push(pack);
  }
  return packs.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}

export async function getReviewQueue(
  learnerId: string,
  packId: string,
): Promise<MatchReviewQueue | null> {
  try {
    return matchReviewQueueSchema.parse(
      JSON.parse(await fs.readFile(reviewPath(learnerId, packId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveReviewQueue(queue: MatchReviewQueue): Promise<void> {
  await ensureDirs();
  const validated = matchReviewQueueSchema.parse(queue);
  const file = reviewPath(validated.learnerId, validated.packId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

async function saveSession(session: MatchArenaSession): Promise<void> {
  await ensureDirs();
  const validated = matchArenaSessionSchema.parse(session);
  const file = sessionPath(validated.learnerId, validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function getSession(
  learnerId: string,
  sessionId: string,
): Promise<MatchArenaSession | null> {
  try {
    return matchArenaSessionSchema.parse(
      JSON.parse(await fs.readFile(sessionPath(learnerId, sessionId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function createMatchSession(input: {
  learnerId: string;
  pack: MatchArenaPack;
  reviewMode?: boolean;
}): Promise<{
  session: MatchArenaSession;
  reviewQueue: MatchReviewQueue;
}> {
  const now = new Date().toISOString();
  const reviewQueue =
    (await getReviewQueue(input.learnerId, input.pack.id)) ??
    emptyReviewQueue(input.learnerId, input.pack, now);

  const session = startMatchSession({
    sessionId: randomUUID(),
    learnerId: input.learnerId,
    pack: input.pack,
    nowIso: now,
    reviewQueue,
    reviewMode: input.reviewMode === true,
  });
  await saveSession(session);
  return { session, reviewQueue };
}

export async function submitMatch(input: {
  learnerId: string;
  pack: MatchArenaPack;
  sessionId: string;
  leftId: string;
  rightId: string;
  elapsedMs: number;
}): Promise<{
  session: MatchArenaSession;
  grade: MatchGradeResult;
  reviewQueue: MatchReviewQueue;
  advancedRound: boolean;
  completed: boolean;
  summary: MatchSessionSummary | null;
}> {
  const session = await getSession(input.learnerId, input.sessionId);
  if (!session) throw new Error("Session nenalezena.");
  if (session.packId !== input.pack.id) {
    throw new Error("Session nepatří k tomuto balíčku.");
  }

  const now = new Date().toISOString();
  const result = applyMatchAttempt(session, input.pack, {
    leftId: input.leftId,
    rightId: input.rightId,
    elapsedMs: input.elapsedMs,
    nowIso: now,
  });
  if (!result) throw new Error("Neplatný pokus o spojení.");

  let reviewQueue =
    (await getReviewQueue(input.learnerId, input.pack.id)) ??
    emptyReviewQueue(input.learnerId, input.pack, now);

  if (!result.grade.correct) {
    reviewQueue = enqueueWrongPair(
      reviewQueue,
      result.grade.pair.id,
      input.elapsedMs,
      now,
    );
  } else if (session.mode === "review") {
    reviewQueue = dequeueReviewedPair(
      reviewQueue,
      result.grade.pair.id,
      now,
    );
  }

  await saveSession(result.session);
  await saveReviewQueue(reviewQueue);

  return {
    session: result.session,
    grade: result.grade,
    reviewQueue,
    advancedRound: result.advancedRound,
    completed: result.completed,
    summary: result.completed
      ? summarizeMatchSession(result.session, input.pack)
      : null,
  };
}
