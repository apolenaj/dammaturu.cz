import {
  parseMajExamPrepPack,
  type MajExamPrepPack,
} from "@/domain/learning/maj-exam-prep";
import { promises as fs } from "node:fs";
import path from "node:path";

export const MAJ_EXAM_PREP_DIR = path.join(
  process.cwd(),
  "data",
  "maj-exam-prep",
);
const PACK_PATH = path.join(MAJ_EXAM_PREP_DIR, "maj.json");

async function ensureDir() {
  await fs.mkdir(MAJ_EXAM_PREP_DIR, { recursive: true });
}

export async function saveMajExamPrepPack(
  pack: MajExamPrepPack,
): Promise<void> {
  const validated = parseMajExamPrepPack(pack);
  await ensureDir();
  const tmp = `${PACK_PATH}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, PACK_PATH);
}

export async function getMajExamPrepPack(): Promise<MajExamPrepPack | null> {
  try {
    return parseMajExamPrepPack(
      JSON.parse(await fs.readFile(PACK_PATH, "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}
