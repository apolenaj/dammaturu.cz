import { promises as fs } from "node:fs";
import path from "node:path";
import {
  applyGradeToProgress,
  emptyQuestionProgress,
  gradeQuestion,
  parseQuestionPack,
  questionProgressSchema,
  type EngineQuestion,
  type GradeFeedback,
  type QuestionPack,
  type QuestionProgress,
  type StudentAnswer,
} from "@/domain/learning/question-engine";

export const QUESTION_ENGINE_DIR = path.join(
  process.cwd(),
  "data",
  "question-engine",
);
const PACKS_DIR = path.join(QUESTION_ENGINE_DIR, "packs");
const PROGRESS_DIR = path.join(QUESTION_ENGINE_DIR, "progress");
const INDEX_PATH = path.join(QUESTION_ENGINE_DIR, "index.json");

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

export async function saveQuestionPack(pack: QuestionPack): Promise<void> {
  const validated = parseQuestionPack(pack);
  await ensureDirs();
  const file = packPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getQuestionPackById(
  id: string,
): Promise<QuestionPack | null> {
  try {
    return parseQuestionPack(
      JSON.parse(await fs.readFile(packPath(id), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getQuestionPackBySlug(
  slug: string,
): Promise<QuestionPack | null> {
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getQuestionPackById(id);
}

export async function listQuestionPacks(): Promise<QuestionPack[]> {
  await ensureDirs();
  const files = (await fs.readdir(PACKS_DIR)).filter((f) => f.endsWith(".json"));
  const packs: QuestionPack[] = [];
  for (const file of files) {
    const pack = await getQuestionPackById(file.replace(/\.json$/, ""));
    if (pack) packs.push(pack);
  }
  return packs.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}

export async function getQuestionProgress(
  learnerId: string,
  packId: string,
): Promise<QuestionProgress | null> {
  try {
    return questionProgressSchema.parse(
      JSON.parse(await fs.readFile(progressPath(learnerId, packId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveQuestionProgress(
  progress: QuestionProgress,
): Promise<void> {
  await ensureDirs();
  const validated = questionProgressSchema.parse(progress);
  const file = progressPath(validated.learnerId, validated.packId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function submitQuestionAttempt(input: {
  learnerId: string;
  pack: QuestionPack;
  questionId: string;
  answer: StudentAnswer;
}): Promise<{
  progress: QuestionProgress;
  grade: GradeFeedback;
  question: EngineQuestion;
}> {
  const question = input.pack.questions.find((q) => q.id === input.questionId);
  if (!question) throw new Error("Otázka nenalezena.");
  const now = new Date().toISOString();
  const current =
    (await getQuestionProgress(input.learnerId, input.pack.id)) ??
    emptyQuestionProgress(input.learnerId, input.pack, now);
  const grade = gradeQuestion(question, input.answer);
  const progress = applyGradeToProgress(current, question.id, grade, now);
  await saveQuestionProgress(progress);
  return { progress, grade, question };
}

export async function resetQuestionProgress(input: {
  learnerId: string;
  pack: QuestionPack;
}): Promise<QuestionProgress> {
  const now = new Date().toISOString();
  const progress = emptyQuestionProgress(input.learnerId, input.pack, now);
  await saveQuestionProgress(progress);
  return progress;
}
