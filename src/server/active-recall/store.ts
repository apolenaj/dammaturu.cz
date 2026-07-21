import { promises as fs } from "node:fs";
import path from "node:path";
import {
  applyRecallGradeToProgress,
  emptyRecallProgress,
  gradeRecallAnswer,
  parseRecallPack,
  recallProgressSchema,
  type RecallGrade,
  type RecallPack,
  type RecallProgress,
} from "@/domain/learning/active-recall";

export const ACTIVE_RECALL_DIR = path.join(
  process.cwd(),
  "data",
  "active-recall",
);
const PACKS_DIR = path.join(ACTIVE_RECALL_DIR, "packs");
const PROGRESS_DIR = path.join(ACTIVE_RECALL_DIR, "progress");
const INDEX_PATH = path.join(ACTIVE_RECALL_DIR, "index.json");

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

export async function saveRecallPack(pack: RecallPack): Promise<void> {
  const validated = parseRecallPack(pack);
  await ensureDirs();
  const file = packPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getRecallPackById(
  id: string,
): Promise<RecallPack | null> {
  try {
    return parseRecallPack(
      JSON.parse(await fs.readFile(packPath(id), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getRecallPackBySlug(
  slug: string,
): Promise<RecallPack | null> {
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getRecallPackById(id);
}

export async function listRecallPacks(): Promise<RecallPack[]> {
  await ensureDirs();
  const files = (await fs.readdir(PACKS_DIR)).filter((f) => f.endsWith(".json"));
  const packs: RecallPack[] = [];
  for (const file of files) {
    const pack = await getRecallPackById(file.replace(/\.json$/, ""));
    if (pack) packs.push(pack);
  }
  return packs.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}

export async function getRecallProgress(
  learnerId: string,
  packId: string,
): Promise<RecallProgress | null> {
  try {
    return recallProgressSchema.parse(
      JSON.parse(await fs.readFile(progressPath(learnerId, packId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveRecallProgress(
  progress: RecallProgress,
): Promise<void> {
  await ensureDirs();
  const validated = recallProgressSchema.parse(progress);
  const file = progressPath(validated.learnerId, validated.packId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function submitRecallAnswer(input: {
  learnerId: string;
  pack: RecallPack;
  promptId: string;
  answer: string;
  inputMode: "text" | "speech";
}): Promise<{ progress: RecallProgress; grade: RecallGrade }> {
  const prompt = input.pack.prompts.find((p) => p.id === input.promptId);
  if (!prompt) throw new Error("Prompt nenalezen.");
  if (input.answer.trim().length < 3) {
    throw new Error("Odpověď je příliš krátká.");
  }

  const now = new Date().toISOString();
  const current =
    (await getRecallProgress(input.learnerId, input.pack.id)) ??
    emptyRecallProgress(input.learnerId, input.pack, now);

  const grade = gradeRecallAnswer(prompt, input.answer);
  // attach inputMode in analytics only; grade is content-based
  void input.inputMode;
  const progress = applyRecallGradeToProgress(current, prompt, grade, now);
  await saveRecallProgress(progress);
  return { progress, grade };
}

export async function resetRecallProgress(input: {
  learnerId: string;
  pack: RecallPack;
}): Promise<RecallProgress> {
  const now = new Date().toISOString();
  const progress = emptyRecallProgress(input.learnerId, input.pack, now);
  await saveRecallProgress(progress);
  return progress;
}
