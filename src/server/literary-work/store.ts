import {
  parseLiteraryWork,
  type LiteraryWork,
} from "@/domain/learning/literary-work";
import { promises as fs } from "node:fs";
import path from "node:path";

export const LITERARY_WORK_DIR = path.join(
  process.cwd(),
  "data",
  "literary-work",
);
const PACKS_DIR = path.join(LITERARY_WORK_DIR, "packs");
const INDEX_PATH = path.join(LITERARY_WORK_DIR, "index.json");

type PackIndex = { bySlug: Record<string, string> };

async function ensureDirs() {
  await fs.mkdir(PACKS_DIR, { recursive: true });
}

function packPath(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Neplatné work id");
  return path.join(PACKS_DIR, `${id}.json`);
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

export async function saveLiteraryWork(work: LiteraryWork): Promise<void> {
  const validated = parseLiteraryWork(work);
  await ensureDirs();
  const file = packPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getLiteraryWorkById(
  id: string,
): Promise<LiteraryWork | null> {
  try {
    return parseLiteraryWork(
      JSON.parse(await fs.readFile(packPath(id), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getLiteraryWorkBySlug(
  slug: string,
): Promise<LiteraryWork | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getLiteraryWorkById(id);
}

export async function listLiteraryWorks(): Promise<LiteraryWork[]> {
  const index = await loadIndex();
  const works: LiteraryWork[] = [];
  for (const id of Object.values(index.bySlug)) {
    const w = await getLiteraryWorkById(id);
    if (w) works.push(w);
  }
  return works.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}
