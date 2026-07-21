import {
  parseBabickaExperiencePack,
  type BabickaExperiencePack,
} from "@/domain/learning/babicka-experience";
import { promises as fs } from "node:fs";
import path from "node:path";

export const BABICKA_EXPERIENCE_DIR = path.join(
  process.cwd(),
  "data",
  "babicka-experience",
);
const PACK_PATH = path.join(BABICKA_EXPERIENCE_DIR, "babicka.json");

async function ensureDir() {
  await fs.mkdir(BABICKA_EXPERIENCE_DIR, { recursive: true });
}

export async function saveBabickaExperiencePack(
  pack: BabickaExperiencePack,
): Promise<void> {
  const validated = parseBabickaExperiencePack(pack);
  await ensureDir();
  const tmp = `${PACK_PATH}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, PACK_PATH);
}

export async function getBabickaExperiencePack(): Promise<BabickaExperiencePack | null> {
  try {
    return parseBabickaExperiencePack(
      JSON.parse(await fs.readFile(PACK_PATH, "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}
