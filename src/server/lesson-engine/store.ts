import { promises as fs } from "node:fs";
import path from "node:path";
import {
  parseLessonDocument,
  type LessonDocument,
} from "@/domain/learning/lesson";

export const LESSONS_DIR = path.join(process.cwd(), "data", "lessons");
const INDEX_PATH = path.join(LESSONS_DIR, "index.json");

type LessonIndex = {
  bySlug: Record<string, string>;
};

async function ensureDir() {
  await fs.mkdir(LESSONS_DIR, { recursive: true });
}

function lessonPath(id: string): string {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Neplatné lesson id");
  return path.join(LESSONS_DIR, `${id}.json`);
}

async function loadIndex(): Promise<LessonIndex> {
  try {
    return JSON.parse(await fs.readFile(INDEX_PATH, "utf8")) as LessonIndex;
  } catch {
    return { bySlug: {} };
  }
}

async function saveIndex(index: LessonIndex) {
  await ensureDir();
  await fs.writeFile(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

export async function saveLesson(lesson: LessonDocument): Promise<void> {
  const validated = parseLessonDocument(lesson);
  await ensureDir();
  const file = lessonPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getLessonById(
  id: string,
): Promise<LessonDocument | null> {
  try {
    const raw = await fs.readFile(lessonPath(id), "utf8");
    return parseLessonDocument(JSON.parse(raw));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getLessonBySlug(
  slug: string,
): Promise<LessonDocument | null> {
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getLessonById(id);
}

export async function listLessons(): Promise<LessonDocument[]> {
  await ensureDir();
  const files = (await fs.readdir(LESSONS_DIR)).filter(
    (f) => f.endsWith(".json") && f !== "index.json",
  );
  const lessons: LessonDocument[] = [];
  for (const file of files) {
    const lesson = await getLessonById(file.replace(/\.json$/, ""));
    if (lesson) lessons.push(lesson);
  }
  return lessons.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}
