import { promises as fs } from "node:fs";
import path from "node:path";
import {
  curriculumPackSchema,
  type CurriculumPack,
} from "@/server/curriculum/types";

export const CURRICULUM_DIR = path.join(process.cwd(), "data", "curriculum");

function packPath(curriculumSlug: string): string {
  if (!/^[a-z0-9-]+$/.test(curriculumSlug)) {
    throw new Error("Neplatný curriculum slug");
  }
  return path.join(CURRICULUM_DIR, `${curriculumSlug}.json`);
}

const INDEX_PATH = path.join(CURRICULUM_DIR, "index.json");

type CurriculumIndex = {
  bySlug: Record<string, string>;
  defaultSlug: string | null;
};

async function ensureDir() {
  await fs.mkdir(CURRICULUM_DIR, { recursive: true });
}

async function loadIndex(): Promise<CurriculumIndex> {
  try {
    return JSON.parse(await fs.readFile(INDEX_PATH, "utf8")) as CurriculumIndex;
  } catch {
    return { bySlug: {}, defaultSlug: null };
  }
}

async function saveIndex(index: CurriculumIndex): Promise<void> {
  await ensureDir();
  await fs.writeFile(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

/**
 * File-backed curriculum store — DB-shaped documents.
 * When DATABASE_URL is available, prefer Drizzle seed; UI always reads via repository.
 */
export async function saveCurriculumPack(pack: CurriculumPack): Promise<void> {
  const validated = curriculumPackSchema.parse(pack);
  await ensureDir();
  const file = packPath(validated.curriculum.slug);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.curriculum.slug] = validated.curriculum.id;
  if (!index.defaultSlug) index.defaultSlug = validated.curriculum.slug;
  // Prefer beta as default when seeded
  if (validated.curriculum.slug === "cjl-beta") {
    index.defaultSlug = "cjl-beta";
  }
  await saveIndex(index);
}

export async function getCurriculumPack(
  slug: string,
): Promise<CurriculumPack | null> {
  try {
    const raw = await fs.readFile(packPath(slug), "utf8");
    return curriculumPackSchema.parse(JSON.parse(raw));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getDefaultCurriculumPack(): Promise<CurriculumPack | null> {
  const index = await loadIndex();
  if (index.defaultSlug) {
    return getCurriculumPack(index.defaultSlug);
  }
  // Fallback: first pack file
  await ensureDir();
  const files = (await fs.readdir(CURRICULUM_DIR)).filter(
    (f) => f.endsWith(".json") && f !== "index.json",
  );
  if (!files[0]) return null;
  return getCurriculumPack(files[0].replace(/\.json$/, ""));
}

export async function listCurriculumSummaries(): Promise<
  Array<{ slug: string; title: string; id: string; moduleCount: number; topicCount: number }>
> {
  await ensureDir();
  const files = (await fs.readdir(CURRICULUM_DIR)).filter(
    (f) => f.endsWith(".json") && f !== "index.json",
  );
  const out = [];
  for (const file of files) {
    const pack = await getCurriculumPack(file.replace(/\.json$/, ""));
    if (!pack) continue;
    out.push({
      slug: pack.curriculum.slug,
      title: pack.curriculum.title,
      id: pack.curriculum.id,
      moduleCount: pack.modules.length,
      topicCount: pack.modules.reduce((n, m) => n + m.topics.length, 0),
    });
  }
  return out;
}
