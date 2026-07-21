import {
  applySpeedAnswer,
  emptySpeedBest,
  finishSpeedSession,
  mergeSpeedBest,
  parseSpeedRoundPack,
  speedRoundBestSchema,
  speedRoundSessionSchema,
  startSpeedSession,
  summarizeSpeedSession,
  type SpeedRoundBest,
  type SpeedRoundPack,
  type SpeedRoundSession,
  type SpeedRoundSummary,
} from "@/domain/learning/speed-round";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const SPEED_ROUND_DIR = path.join(process.cwd(), "data", "speed-round");
const PACKS_DIR = path.join(SPEED_ROUND_DIR, "packs");
const SESSIONS_DIR = path.join(SPEED_ROUND_DIR, "sessions");
const BEST_DIR = path.join(SPEED_ROUND_DIR, "best");
const INDEX_PATH = path.join(SPEED_ROUND_DIR, "index.json");

type PackIndex = { bySlug: Record<string, string> };

async function ensureDirs() {
  await fs.mkdir(PACKS_DIR, { recursive: true });
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
  await fs.mkdir(BEST_DIR, { recursive: true });
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

function bestPath(learnerId: string, packId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) {
    throw new Error("Neplatné learner id");
  }
  if (!/^[a-f0-9-]{36}$/i.test(packId)) throw new Error("Neplatné pack id");
  return path.join(BEST_DIR, `${learnerId}__${packId}.json`);
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

export async function saveSpeedRoundPack(pack: SpeedRoundPack): Promise<void> {
  const validated = parseSpeedRoundPack(pack);
  await ensureDirs();
  const file = packPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getSpeedRoundPackById(
  id: string,
): Promise<SpeedRoundPack | null> {
  try {
    return parseSpeedRoundPack(
      JSON.parse(await fs.readFile(packPath(id), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getSpeedRoundPackBySlug(
  slug: string,
): Promise<SpeedRoundPack | null> {
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getSpeedRoundPackById(id);
}

export async function listSpeedRoundPacks(): Promise<SpeedRoundPack[]> {
  await ensureDirs();
  const files = (await fs.readdir(PACKS_DIR)).filter((f) => f.endsWith(".json"));
  const packs: SpeedRoundPack[] = [];
  for (const file of files) {
    const pack = await getSpeedRoundPackById(file.replace(/\.json$/, ""));
    if (pack) packs.push(pack);
  }
  return packs.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}

async function saveSession(session: SpeedRoundSession): Promise<void> {
  await ensureDirs();
  const validated = speedRoundSessionSchema.parse(session);
  const file = sessionPath(validated.learnerId, validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function getSpeedSession(
  learnerId: string,
  sessionId: string,
): Promise<SpeedRoundSession | null> {
  try {
    return speedRoundSessionSchema.parse(
      JSON.parse(await fs.readFile(sessionPath(learnerId, sessionId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getSpeedBest(
  learnerId: string,
  packId: string,
): Promise<SpeedRoundBest | null> {
  try {
    return speedRoundBestSchema.parse(
      JSON.parse(await fs.readFile(bestPath(learnerId, packId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

async function saveBest(best: SpeedRoundBest): Promise<void> {
  await ensureDirs();
  const validated = speedRoundBestSchema.parse(best);
  const file = bestPath(validated.learnerId, validated.packId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function createSpeedSession(input: {
  learnerId: string;
  pack: SpeedRoundPack;
}): Promise<SpeedRoundSession> {
  const now = new Date().toISOString();
  const session = startSpeedSession({
    sessionId: randomUUID(),
    learnerId: input.learnerId,
    pack: input.pack,
    nowIso: now,
  });
  await saveSession(session);
  return session;
}

export async function submitSpeedAnswer(input: {
  learnerId: string;
  pack: SpeedRoundPack;
  sessionId: string;
  questionId: string;
  optionId: string;
  responseMs: number;
}): Promise<{
  session: SpeedRoundSession;
  correct: boolean;
  completed: boolean;
  summary: SpeedRoundSummary | null;
  best: SpeedRoundBest | null;
}> {
  const session = await getSpeedSession(input.learnerId, input.sessionId);
  if (!session) throw new Error("Session nenalezena.");
  if (session.packId !== input.pack.id) {
    throw new Error("Session nepatří k tomuto balíčku.");
  }

  const now = new Date().toISOString();
  const result = applySpeedAnswer(session, input.pack, {
    questionId: input.questionId,
    optionId: input.optionId,
    responseMs: input.responseMs,
    nowIso: now,
  });
  if (!result) throw new Error("Neplatná odpověď.");

  await saveSession(result.session);

  if (!result.completed) {
    return {
      session: result.session,
      correct: result.correct,
      completed: false,
      summary: null,
      best: null,
    };
  }

  const summary = summarizeSpeedSession(result.session, input.pack);
  const prev =
    (await getSpeedBest(input.learnerId, input.pack.id)) ??
    emptySpeedBest(input.learnerId, input.pack, now);
  const best = mergeSpeedBest(prev, summary, now);
  await saveBest(best);
  return {
    session: result.session,
    correct: result.correct,
    completed: true,
    summary,
    best,
  };
}

export async function endSpeedSession(input: {
  learnerId: string;
  pack: SpeedRoundPack;
  sessionId: string;
}): Promise<{
  session: SpeedRoundSession;
  summary: SpeedRoundSummary;
  best: SpeedRoundBest;
}> {
  const session = await getSpeedSession(input.learnerId, input.sessionId);
  if (!session) throw new Error("Session nenalezena.");
  const now = new Date().toISOString();
  const finished = finishSpeedSession(session, now);
  await saveSession(finished);
  const summary = summarizeSpeedSession(finished, input.pack);
  const prev =
    (await getSpeedBest(input.learnerId, input.pack.id)) ??
    emptySpeedBest(input.learnerId, input.pack, now);
  const best = mergeSpeedBest(prev, summary, now);
  await saveBest(best);
  return { session: finished, summary, best };
}
