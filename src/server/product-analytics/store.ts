import {
  applyProductEventToState,
  buildProductEvent,
  emptyProductLearnerState,
  funnelStepForEvent,
  productEventSchema,
  productLearnerStateSchema,
  type ProductEvent,
  type ProductEventInput,
  type ProductLearnerState,
} from "@/domain/product-analytics";
import { promises as fs } from "node:fs";
import path from "node:path";

export const PRODUCT_ANALYTICS_DIR = path.join(
  process.cwd(),
  "data",
  "product-analytics",
);
const EVENTS_DIR = path.join(PRODUCT_ANALYTICS_DIR, "events");
const STATES_DIR = path.join(PRODUCT_ANALYTICS_DIR, "learners");
const INDEX_PATH = path.join(PRODUCT_ANALYTICS_DIR, "index.json");

type IndexFile = {
  eventIds: string[];
  learnerKeys: string[];
  updatedAt: string;
};

async function ensureDirs() {
  await fs.mkdir(EVENTS_DIR, { recursive: true });
  await fs.mkdir(STATES_DIR, { recursive: true });
}

function eventPath(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Neplatné event id");
  return path.join(EVENTS_DIR, `${id}.json`);
}

function statePath(learnerKey: string) {
  const safe = learnerKey.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  if (!safe) throw new Error("Neplatný learner key");
  return path.join(STATES_DIR, `${safe}.json`);
}

async function readIndex(): Promise<IndexFile> {
  try {
    const raw = await fs.readFile(INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw) as IndexFile;
    if (!Array.isArray(parsed.eventIds) || !Array.isArray(parsed.learnerKeys)) {
      throw new Error("Neplatný index shape");
    }
    return parsed;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return {
        eventIds: [],
        learnerKeys: [],
        updatedAt: new Date(0).toISOString(),
      };
    }
    // Concurrent writers can leave truncated/concatenated JSON — recover empty.
    console.error("[product-analytics] corrupt index, resetting", error);
    return {
      eventIds: [],
      learnerKeys: [],
      updatedAt: new Date(0).toISOString(),
    };
  }
}

async function writeIndex(index: IndexFile): Promise<void> {
  await ensureDirs();
  const tmp = `${INDEX_PATH}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await fs.rename(tmp, INDEX_PATH);
}

async function appendEventFile(event: ProductEvent): Promise<void> {
  await ensureDirs();
  const file = eventPath(event.id);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(event, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);

  const index = await readIndex();
  if (!index.eventIds.includes(event.id)) index.eventIds.push(event.id);
  if (event.learnerKey && !index.learnerKeys.includes(event.learnerKey)) {
    index.learnerKeys.push(event.learnerKey);
  }
  index.updatedAt = new Date().toISOString();
  await writeIndex(index);
}

export async function getProductLearnerState(
  learnerKey: string,
): Promise<ProductLearnerState | null> {
  try {
    const raw = JSON.parse(await fs.readFile(statePath(learnerKey), "utf8"));
    return productLearnerStateSchema.parse(raw);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    console.error("[product-analytics] corrupt learner state", learnerKey, error);
    return null;
  }
}

export async function saveProductLearnerState(
  state: ProductLearnerState,
): Promise<void> {
  await ensureDirs();
  const parsed = productLearnerStateSchema.parse(state);
  const file = statePath(parsed.learnerKey);
  const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);

  const index = await readIndex();
  if (!index.learnerKeys.includes(parsed.learnerKey)) {
    index.learnerKeys.push(parsed.learnerKey);
  }
  index.updatedAt = new Date().toISOString();
  await writeIndex(index);
}

export async function listProductEvents(): Promise<ProductEvent[]> {
  const index = await readIndex();
  const out: ProductEvent[] = [];
  for (const id of index.eventIds) {
    try {
      const raw = JSON.parse(await fs.readFile(eventPath(id), "utf8"));
      out.push(productEventSchema.parse(raw));
    } catch {
      // skip corrupt
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

export async function listProductLearnerStates(): Promise<ProductLearnerState[]> {
  const index = await readIndex();
  const out: ProductLearnerState[] = [];
  for (const key of index.learnerKeys) {
    const s = await getProductLearnerState(key);
    if (s) out.push(s);
  }
  return out;
}

/**
 * Durable product analytics write. Fire-and-forget safe — never throws to callers.
 * Emits milestone funnel events when first-* thresholds are crossed.
 */
export async function recordProductEvent(
  input: ProductEventInput,
): Promise<ProductEvent[]> {
  try {
    const written: ProductEvent[] = [];
    const funnelStep = input.funnelStep ?? funnelStepForEvent(input.event);
    const primary = buildProductEvent({ ...input, funnelStep });

    // Deduplicate noisy app_opened / guest_start / czech_hub_view: at most one event file per learner per day.
    if (
      (primary.event === "app_opened" ||
        primary.event === "guest_start" ||
        primary.event === "czech_hub_view") &&
      primary.learnerKey
    ) {
      const loaded = await getProductLearnerState(primary.learnerKey);
      const existing =
        loaded ?? emptyProductLearnerState(primary.learnerKey, primary.at);
      const sameDay =
        Boolean(loaded) && loaded!.lastSeenAt.slice(0, 10) === primary.dateKey;
      const guestAlready =
        primary.event === "guest_start" && Boolean(existing.guestStartedAt);
      const { state, milestones } = applyProductEventToState(existing, primary);
      await saveProductLearnerState(state);
      const skipFile =
        sameDay ||
        (primary.event === "guest_start" && guestAlready);
      if (!skipFile) {
        await appendEventFile(primary);
        written.push(primary);
      }
      for (const m of milestones) {
        const milestoneEvent = buildProductEvent({
          ...m,
          learnerKey: primary.learnerKey,
          funnelStep: m.funnelStep ?? funnelStepForEvent(m.event),
        });
        await appendEventFile(milestoneEvent);
        written.push(milestoneEvent);
        const after = await getProductLearnerState(primary.learnerKey);
        if (after) {
          const reduced = applyProductEventToState(after, milestoneEvent);
          await saveProductLearnerState(reduced.state);
        }
      }
      return written;
    }

    await appendEventFile(primary);
    written.push(primary);

    if (primary.learnerKey) {
      const existing =
        (await getProductLearnerState(primary.learnerKey)) ??
        emptyProductLearnerState(primary.learnerKey, primary.at);
      const { state, milestones } = applyProductEventToState(existing, primary);
      await saveProductLearnerState(state);

      for (const m of milestones) {
        const milestoneEvent = buildProductEvent({
          ...m,
          learnerKey: primary.learnerKey,
          funnelStep: m.funnelStep ?? funnelStepForEvent(m.event),
        });
        await appendEventFile(milestoneEvent);
        written.push(milestoneEvent);
        const after = await getProductLearnerState(primary.learnerKey);
        if (after) {
          const reduced = applyProductEventToState(after, milestoneEvent);
          await saveProductLearnerState(reduced.state);
        }
      }
    }

    return written;
  } catch (error) {
    console.error("[product-analytics] record failed", error);
    return [];
  }
}

export async function clearProductAnalyticsForTests(): Promise<void> {
  await fs.rm(PRODUCT_ANALYTICS_DIR, { recursive: true, force: true });
}
