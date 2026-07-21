import {
  parseKyticeExperiencePack,
  type KyticeExperiencePack,
} from "@/domain/learning/kytice-experience";
import { promises as fs } from "node:fs";
import path from "node:path";

export const KYTICE_EXPERIENCE_DIR = path.join(
  process.cwd(),
  "data",
  "kytice-experience",
);
const PACK_PATH = path.join(KYTICE_EXPERIENCE_DIR, "kytice.json");

async function ensureDir() {
  await fs.mkdir(KYTICE_EXPERIENCE_DIR, { recursive: true });
}

export async function saveKyticeExperiencePack(
  pack: KyticeExperiencePack,
): Promise<void> {
  const validated = parseKyticeExperiencePack(pack);
  await ensureDir();
  const tmp = `${PACK_PATH}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, PACK_PATH);
}

export async function getKyticeExperiencePack(): Promise<KyticeExperiencePack | null> {
  try {
    return parseKyticeExperiencePack(
      JSON.parse(await fs.readFile(PACK_PATH, "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}
