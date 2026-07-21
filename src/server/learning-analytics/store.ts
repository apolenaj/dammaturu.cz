import {
  learningEventSchema,
  type LearningEvent,
  type LearningEventName,
  type LearningMethod,
} from "@/domain/learning/learning-analytics";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const LEARNING_ANALYTICS_DIR = path.join(
  process.cwd(),
  "data",
  "learning-analytics",
);
const EVENTS_DIR = path.join(LEARNING_ANALYTICS_DIR, "events");
const INDEX_PATH = path.join(LEARNING_ANALYTICS_DIR, "index.json");

type IndexFile = {
  eventIds: string[];
  learnerKeys: string[];
  updatedAt: string;
};

async function ensureDirs() {
  await fs.mkdir(EVENTS_DIR, { recursive: true });
}

function eventPath(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Neplatné event id");
  return path.join(EVENTS_DIR, `${id}.json`);
}

async function readIndex(): Promise<IndexFile> {
  try {
    return JSON.parse(await fs.readFile(INDEX_PATH, "utf8")) as IndexFile;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return {
        eventIds: [],
        learnerKeys: [],
        updatedAt: new Date(0).toISOString(),
      };
    }
    throw error;
  }
}

async function writeIndex(index: IndexFile): Promise<void> {
  await ensureDirs();
  const tmp = `${INDEX_PATH}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await fs.rename(tmp, INDEX_PATH);
}

export async function appendLearningEvent(
  partial: Omit<LearningEvent, "id"> & { id?: string },
): Promise<LearningEvent> {
  const event = learningEventSchema.parse({
    ...partial,
    id: partial.id ?? randomUUID(),
  });
  await ensureDirs();
  const file = eventPath(event.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(event, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);

  const index = await readIndex();
  if (!index.eventIds.includes(event.id)) index.eventIds.push(event.id);
  if (!index.learnerKeys.includes(event.learnerKey)) {
    index.learnerKeys.push(event.learnerKey);
  }
  index.updatedAt = new Date().toISOString();
  await writeIndex(index);
  return event;
}

export async function listLearningEvents(): Promise<LearningEvent[]> {
  const index = await readIndex();
  const out: LearningEvent[] = [];
  for (const id of index.eventIds) {
    try {
      const raw = JSON.parse(await fs.readFile(eventPath(id), "utf8"));
      out.push(learningEventSchema.parse(raw));
    } catch {
      // skip corrupt
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

export async function clearLearningAnalyticsForTests(): Promise<void> {
  await fs.rm(LEARNING_ANALYTICS_DIR, { recursive: true, force: true });
}

/** Input for fire-and-forget recording (no id/date/at required). */
export type LearningEventInput = {
  learnerKey: string;
  event: LearningEventName;
  method: LearningMethod;
  topicSlug?: string;
  itemId?: string;
  correct?: boolean;
  rating?: number;
  hintsUsed?: number;
  durationMs?: number;
  minutes?: number;
  masteryScore?: number;
  masteryDelta?: number;
  simulationScore?: number;
  dropOffAt?: string;
  at?: Date;
};

export async function recordLearningEvent(
  input: LearningEventInput,
): Promise<LearningEvent | null> {
  try {
    const at = input.at ?? new Date();
    return await appendLearningEvent({
      learnerKey: input.learnerKey,
      event: input.event,
      method: input.method,
      topicSlug: input.topicSlug,
      itemId: input.itemId,
      correct: input.correct,
      rating: input.rating,
      hintsUsed: input.hintsUsed,
      durationMs: input.durationMs,
      minutes: input.minutes,
      masteryScore: input.masteryScore,
      masteryDelta: input.masteryDelta,
      simulationScore: input.simulationScore,
      dropOffAt: input.dropOffAt,
      dateKey: at.toISOString().slice(0, 10),
      at: at.toISOString(),
    });
  } catch {
    return null;
  }
}
