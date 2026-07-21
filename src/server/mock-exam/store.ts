import {
  parseMockExamPack,
  type MockExamPack,
} from "@/domain/learning/mock-exam";
import { promises as fs } from "node:fs";
import path from "node:path";

export const MOCK_EXAM_DIR = path.join(process.cwd(), "data", "mock-exam");
const PACK_PATH = path.join(MOCK_EXAM_DIR, "zkouska-nanecisto.json");

async function ensureDir() {
  await fs.mkdir(MOCK_EXAM_DIR, { recursive: true });
}

export async function saveMockExamPack(pack: MockExamPack): Promise<void> {
  const validated = parseMockExamPack(pack);
  await ensureDir();
  const tmp = `${PACK_PATH}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, PACK_PATH);
}

export async function getMockExamPack(): Promise<MockExamPack | null> {
  try {
    return parseMockExamPack(
      JSON.parse(await fs.readFile(PACK_PATH, "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}
