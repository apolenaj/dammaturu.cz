import {
  emptyFeatureFlagsStore,
  featureFlagsStoreSchema,
  resolveFlagEnabled,
  assignExperimentVariant,
  type Experiment,
  type FeatureFlag,
  type FeatureFlagsStore,
  type ResolvedFlags,
} from "@/domain/feature-flags";
import { promises as fs } from "node:fs";
import path from "node:path";

const STORE_PATH = path.join(process.cwd(), "data", "feature-flags.json");

async function ensureParent() {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
}

export async function loadFeatureFlagsStore(): Promise<FeatureFlagsStore> {
  try {
    const raw = JSON.parse(await fs.readFile(STORE_PATH, "utf8"));
    return featureFlagsStoreSchema.parse(raw);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      const empty = emptyFeatureFlagsStore();
      await saveFeatureFlagsStore(empty);
      return empty;
    }
    throw error;
  }
}

export async function saveFeatureFlagsStore(
  store: FeatureFlagsStore,
): Promise<void> {
  await ensureParent();
  const parsed = featureFlagsStoreSchema.parse({
    ...store,
    updatedAt: new Date().toISOString(),
  });
  const tmp = `${STORE_PATH}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  await fs.rename(tmp, STORE_PATH);
}

export async function resolveFlagsForLearner(
  learnerKey: string | null,
): Promise<ResolvedFlags> {
  const store = await loadFeatureFlagsStore();
  const flags: Record<string, boolean> = {};
  for (const f of store.flags) {
    flags[f.key] = resolveFlagEnabled(f, learnerKey);
  }
  const experiments: Record<string, string | null> = {};
  for (const exp of store.experiments) {
    experiments[exp.id] = learnerKey
      ? assignExperimentVariant(exp, learnerKey)
      : null;
  }
  return { flags, experiments };
}

export async function upsertFeatureFlag(
  flag: Omit<FeatureFlag, "updatedAt"> & { updatedAt?: string },
): Promise<FeatureFlag> {
  const store = await loadFeatureFlagsStore();
  const now = new Date().toISOString();
  const next: FeatureFlag = {
    ...flag,
    updatedAt: flag.updatedAt ?? now,
  };
  const idx = store.flags.findIndex((f) => f.key === next.key);
  if (idx >= 0) store.flags[idx] = next;
  else store.flags.push(next);
  store.updatedAt = now;
  await saveFeatureFlagsStore(store);
  return next;
}

export async function upsertExperiment(exp: Experiment): Promise<Experiment> {
  const store = await loadFeatureFlagsStore();
  const now = new Date().toISOString();
  const next = { ...exp, updatedAt: now };
  const idx = store.experiments.findIndex((e) => e.id === next.id);
  if (idx >= 0) store.experiments[idx] = next;
  else store.experiments.push(next);
  store.updatedAt = now;
  await saveFeatureFlagsStore(store);
  return next;
}

export async function clearFeatureFlagsForTests(): Promise<void> {
  await fs.rm(STORE_PATH, { force: true });
}
