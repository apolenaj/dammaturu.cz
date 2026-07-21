import {
  applyNonsenseAttempt,
  emptyNonsenseProgress,
  gradeNonsenseRound,
  nonsenseProgressSchema,
  parseNonsensePack,
  type NonsenseGrade,
  type NonsensePack,
  type NonsenseProgress,
} from "@/domain/learning/najdi-nesmysl";
import { promises as fs } from "node:fs";
import path from "node:path";

export const NAJDI_NESMYSL_DIR = path.join(
  process.cwd(),
  "data",
  "najdi-nesmysl",
);
const PACKS_DIR = path.join(NAJDI_NESMYSL_DIR, "packs");
const PROGRESS_DIR = path.join(NAJDI_NESMYSL_DIR, "progress");
const INDEX_PATH = path.join(NAJDI_NESMYSL_DIR, "index.json");

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

export async function saveNonsensePack(pack: NonsensePack): Promise<void> {
  const validated = parseNonsensePack(pack);
  await ensureDirs();
  const file = packPath(validated.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  const index = await loadIndex();
  index.bySlug[validated.slug] = validated.id;
  await saveIndex(index);
}

export async function getNonsensePackById(
  id: string,
): Promise<NonsensePack | null> {
  try {
    return parseNonsensePack(
      JSON.parse(await fs.readFile(packPath(id), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function getNonsensePackBySlug(
  slug: string,
): Promise<NonsensePack | null> {
  const index = await loadIndex();
  const id = index.bySlug[slug];
  if (!id) return null;
  return getNonsensePackById(id);
}

export async function listNonsensePacks(): Promise<NonsensePack[]> {
  await ensureDirs();
  const files = (await fs.readdir(PACKS_DIR)).filter((f) => f.endsWith(".json"));
  const packs: NonsensePack[] = [];
  for (const file of files) {
    const pack = await getNonsensePackById(file.replace(/\.json$/, ""));
    if (pack) packs.push(pack);
  }
  return packs.sort((a, b) => a.title.localeCompare(b.title, "cs"));
}

export async function getNonsenseProgress(
  learnerId: string,
  packId: string,
): Promise<NonsenseProgress | null> {
  try {
    return nonsenseProgressSchema.parse(
      JSON.parse(await fs.readFile(progressPath(learnerId, packId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveNonsenseProgress(
  progress: NonsenseProgress,
): Promise<void> {
  await ensureDirs();
  const validated = nonsenseProgressSchema.parse(progress);
  const file = progressPath(validated.learnerId, validated.packId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function submitNonsense(input: {
  learnerId: string;
  pack: NonsensePack;
  roundId: string;
  selectedStatementId: string;
  studentReason: string;
}): Promise<{ progress: NonsenseProgress; grade: NonsenseGrade }> {
  const round = input.pack.rounds.find((r) => r.id === input.roundId);
  if (!round) throw new Error("Kolo nenalezeno.");
  if (!round.statements.some((s) => s.id === input.selectedStatementId)) {
    throw new Error("Neplatné tvrzení.");
  }
  const reason = input.studentReason.trim();
  if (reason.length < 12) {
    throw new Error("Napiš krátké vysvětlení, proč je tvrzení nesmysl (min. 12 znaků).");
  }

  const now = new Date().toISOString();
  const grade = gradeNonsenseRound({
    round,
    selectedStatementId: input.selectedStatementId,
    studentReason: reason,
  });
  const current =
    (await getNonsenseProgress(input.learnerId, input.pack.id)) ??
    emptyNonsenseProgress(input.learnerId, input.pack, now);

  const progress = applyNonsenseAttempt(
    current,
    {
      roundId: input.roundId,
      selectedStatementId: input.selectedStatementId,
      studentReason: reason.slice(0, 800),
      pickCorrect: grade.pickCorrect,
      reasonQuality: grade.reasonQuality,
      at: now,
    },
    now,
  );
  await saveNonsenseProgress(progress);
  return { progress, grade };
}
