import { promises as fs } from "node:fs";
import path from "node:path";
import {
  applyTeachGradeToProgress,
  emptyTeachProgress,
  gradeTeachBackAnswer,
  parseTeachPack,
  teachConfig,
  teachProgressSchema,
  type TeachGrade,
  type TeachPack,
  type TeachProgress,
} from "@/domain/learning/teach-it-back";

export const TEACH_IT_BACK_DIR = path.join(
  process.cwd(),
  "data",
  "teach-it-back",
);
const PACKS_DIR = path.join(TEACH_IT_BACK_DIR, "packs");
const PROGRESS_DIR = path.join(TEACH_IT_BACK_DIR, "progress");
const INDEX_PATH = path.join(TEACH_IT_BACK_DIR, "index.json");

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

export async function saveTeachPack(pack: TeachPack): Promise<void> {
  const validated = parseTeachPack(pack);
  await ensureDirs();
  const file = packPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getTeachPackById(id: string): Promise<TeachPack | null> {
  try {
    return parseTeachPack(JSON.parse(await fs.readFile(packPath(id), "utf8")));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getTeachPackBySlug(
  slug: string,
): Promise<TeachPack | null> {
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getTeachPackById(id);
}

export async function listTeachPacks(): Promise<TeachPack[]> {
  await ensureDirs();
  const files = (await fs.readdir(PACKS_DIR)).filter((f) => f.endsWith(".json"));
  const packs: TeachPack[] = [];
  for (const file of files) {
    const pack = await getTeachPackById(file.replace(/\.json$/, ""));
    if (pack) packs.push(pack);
  }
  return packs.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}

export async function getTeachProgress(
  learnerId: string,
  packId: string,
): Promise<TeachProgress | null> {
  try {
    return teachProgressSchema.parse(
      JSON.parse(await fs.readFile(progressPath(learnerId, packId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveTeachProgress(
  progress: TeachProgress,
): Promise<void> {
  await ensureDirs();
  const validated = teachProgressSchema.parse(progress);
  const file = progressPath(validated.learnerId, validated.packId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function submitTeachAnswer(input: {
  learnerId: string;
  pack: TeachPack;
  promptId: string;
  answer: string;
  inputMode: "text" | "speech";
}): Promise<{ progress: TeachProgress; grade: TeachGrade }> {
  const prompt = input.pack.prompts.find((p) => p.id === input.promptId);
  if (!prompt) throw new Error("Prompt nenalezen.");
  const words = input.answer.trim().split(/\s+/).filter(Boolean).length;
  if (words < teachConfig.minWordsToSubmit) {
    throw new Error("Odpověď je příliš krátká — vysvětli vlastními slovy.");
  }

  const now = new Date().toISOString();
  const current =
    (await getTeachProgress(input.learnerId, input.pack.id)) ??
    emptyTeachProgress(input.learnerId, input.pack, now);

  const grade = gradeTeachBackAnswer(prompt, input.answer);
  void input.inputMode;
  const progress = applyTeachGradeToProgress(current, prompt, grade, now);
  await saveTeachProgress(progress);
  return { progress, grade };
}

export async function resetTeachProgress(input: {
  learnerId: string;
  pack: TeachPack;
}): Promise<TeachProgress> {
  const now = new Date().toISOString();
  const progress = emptyTeachProgress(input.learnerId, input.pack, now);
  await saveTeachProgress(progress);
  return progress;
}
