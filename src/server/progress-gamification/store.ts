import {
  emptyProgressState,
  parseProgressLearnerState,
  type ProgressLearnerState,
} from "@/domain/learning/progress-gamification";
import { promises as fs } from "node:fs";
import path from "node:path";

export const PROGRESS_GAMIFICATION_DIR = path.join(
  process.cwd(),
  "data",
  "progress-gamification",
);

function statePath(learnerId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) {
    throw new Error("Neplatné learner id");
  }
  return path.join(PROGRESS_GAMIFICATION_DIR, `${learnerId}.json`);
}

async function ensureDir() {
  await fs.mkdir(PROGRESS_GAMIFICATION_DIR, { recursive: true });
}

export async function getProgressState(
  learnerId: string,
): Promise<ProgressLearnerState | null> {
  try {
    return parseProgressLearnerState(
      JSON.parse(await fs.readFile(statePath(learnerId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveProgressState(
  state: ProgressLearnerState,
): Promise<void> {
  const validated = parseProgressLearnerState(state);
  await ensureDir();
  const file = statePath(validated.learnerId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function getOrCreateProgressState(
  learnerId: string,
  nowIso = new Date().toISOString(),
): Promise<ProgressLearnerState> {
  const existing = await getProgressState(learnerId);
  if (existing) return existing;
  const fresh = emptyProgressState(learnerId, nowIso);
  await saveProgressState(fresh);
  return fresh;
}
