import { promises as fs } from "node:fs";
import path from "node:path";
import {
  readinessHistoryPointSchema,
  type ReadinessHistoryPoint,
} from "@/domain/learning/readiness";

const HISTORY_DIR = path.join(
  process.cwd(),
  "data",
  "readiness",
  "history",
);

async function ensureDirs() {
  await fs.mkdir(HISTORY_DIR, { recursive: true });
}

function historyPath(learnerId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) {
    throw new Error("Neplatné learner id");
  }
  return path.join(HISTORY_DIR, `${learnerId}.jsonl`);
}

export async function listReadinessHistory(
  learnerId: string,
  limit = 40,
): Promise<ReadinessHistoryPoint[]> {
  try {
    const raw = await fs.readFile(historyPath(learnerId), "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const points: ReadinessHistoryPoint[] = [];
    for (const line of lines) {
      const parsed = readinessHistoryPointSchema.safeParse(JSON.parse(line));
      if (parsed.success) points.push(parsed.data);
    }
    return points.slice(-limit);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw error;
  }
}

/**
 * Append a history snapshot. Dedupes same calendar day (keeps latest).
 */
export async function appendReadinessHistory(
  learnerId: string,
  point: ReadinessHistoryPoint,
): Promise<void> {
  await ensureDirs();
  const existing = await listReadinessHistory(learnerId, 90);
  const dayKey = point.at.slice(0, 10);
  const filtered = existing.filter((p) => p.at.slice(0, 10) !== dayKey);
  filtered.push(readinessHistoryPointSchema.parse(point));
  const kept = filtered.slice(-90);
  const file = historyPath(learnerId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(
    tmp,
    `${kept.map((p) => JSON.stringify(p)).join("\n")}\n`,
    "utf8",
  );
  await fs.rename(tmp, file);
}
