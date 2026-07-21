import {
  betaTelemetryEventSchema,
  type BetaTelemetryEvent,
} from "@/domain/learning/beta-profile";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const BETA_TELEMETRY_DIR = path.join(process.cwd(), "data", "beta-telemetry");
const EVENTS_DIR = path.join(BETA_TELEMETRY_DIR, "events");
const INDEX_PATH = path.join(BETA_TELEMETRY_DIR, "index.json");

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
      return { eventIds: [], learnerKeys: [], updatedAt: new Date(0).toISOString() };
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

export async function appendBetaTelemetryEvent(
  partial: Omit<BetaTelemetryEvent, "id"> & { id?: string },
): Promise<BetaTelemetryEvent> {
  const event = betaTelemetryEventSchema.parse({
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

export async function listBetaTelemetryEvents(): Promise<BetaTelemetryEvent[]> {
  const index = await readIndex();
  const out: BetaTelemetryEvent[] = [];
  for (const id of index.eventIds) {
    try {
      const raw = JSON.parse(await fs.readFile(eventPath(id), "utf8"));
      out.push(betaTelemetryEventSchema.parse(raw));
    } catch {
      // skip corrupt
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

export async function listBetaLearnerKeys(): Promise<string[]> {
  const index = await readIndex();
  return [...index.learnerKeys];
}

export async function sumMinutesForLearner(
  learnerKey: string,
): Promise<number> {
  const events = await listBetaTelemetryEvents();
  return events
    .filter((e) => e.learnerKey === learnerKey)
    .reduce((s, e) => s + (e.minutes ?? 0), 0);
}

export async function clearBetaTelemetryForTests(): Promise<void> {
  await fs.rm(BETA_TELEMETRY_DIR, { recursive: true, force: true });
}
