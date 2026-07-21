"use server";

import { revalidatePath } from "next/cache";
import {
  experimentSchema,
  featureFlagSchema,
  type Experiment,
  type FeatureFlag,
  type FeatureFlagsStore,
} from "@/domain/feature-flags";
import { track } from "@/lib/analytics";
import { assertAdmin } from "@/server/admin-auth";
import {
  loadFeatureFlagsStore,
  upsertExperiment,
  upsertFeatureFlag,
} from "@/server/feature-flags/store";

export async function getFeatureFlagsAdminAction(): Promise<FeatureFlagsStore | null> {
  const gate = await assertAdmin();
  if (!gate.ok) return null;
  return loadFeatureFlagsStore();
}

export async function updateFeatureFlagAction(input: {
  key: string;
  enabled: boolean;
  rolloutPercent: number;
  descriptionCs: string;
  experimentId?: string;
}): Promise<{ ok: true; flag: FeatureFlag } | { ok: false; error: string }> {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return gate;
    const parsed = featureFlagSchema.safeParse({
      key: input.key,
      descriptionCs: input.descriptionCs,
      enabled: input.enabled,
      rolloutPercent: input.rolloutPercent,
      experimentId: input.experimentId || undefined,
      updatedAt: new Date().toISOString(),
    });
    if (!parsed.success) {
      return { ok: false, error: "Neplatná konfigurace flagu." };
    }
    const flag = await upsertFeatureFlag(parsed.data);
    track("feature_flag_updated", {
      key: flag.key,
      enabled: flag.enabled,
      rollout: flag.rolloutPercent,
    });
    revalidatePath("/admin/analytics");
    return { ok: true, flag };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function upsertExperimentAction(input: {
  id: string;
  nameCs: string;
  status: Experiment["status"];
  variants: Experiment["variants"];
}): Promise<{ ok: true; experiment: Experiment } | { ok: false; error: string }> {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return gate;
    const store = await loadFeatureFlagsStore();
    const existing = store.experiments.find((e) => e.id === input.id);
    const now = new Date().toISOString();
    const parsed = experimentSchema.safeParse({
      id: input.id,
      nameCs: input.nameCs,
      status: input.status,
      variants: input.variants,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    if (!parsed.success) {
      return { ok: false, error: "Neplatný experiment (min. 2 varianty, váhy)." };
    }
    const experiment = await upsertExperiment(parsed.data);
    track("experiment_upserted", {
      id: experiment.id,
      status: experiment.status,
    });
    revalidatePath("/admin/analytics");
    return { ok: true, experiment };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
