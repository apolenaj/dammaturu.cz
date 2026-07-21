import { createHash } from "node:crypto";
import { z } from "zod";

/**
 * Product feature flags + lightweight experiments (D-062).
 * Separate from billing entitlements — flags gate UX experiments, not paid access.
 */

export const featureFlagSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/),
  descriptionCs: z.string().min(1).max(240),
  enabled: z.boolean(),
  /** Sticky rollout 0–100. 100 = all when enabled. */
  rolloutPercent: z.number().int().min(0).max(100).default(100),
  /** Optional linked experiment id. */
  experimentId: z.string().min(1).max(64).optional(),
  updatedAt: z.string().datetime(),
});

export type FeatureFlag = z.infer<typeof featureFlagSchema>;

export const experimentVariantSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-z][a-z0-9_]*$/),
  labelCs: z.string().min(1).max(80),
  weight: z.number().int().min(0).max(100),
});

export const experimentSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/),
  nameCs: z.string().min(1).max(120),
  status: z.enum(["draft", "running", "stopped"]),
  variants: z.array(experimentVariantSchema).min(2).max(6),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Experiment = z.infer<typeof experimentSchema>;

export const featureFlagsStoreSchema = z.object({
  version: z.literal(1),
  flags: z.array(featureFlagSchema),
  experiments: z.array(experimentSchema),
  updatedAt: z.string().datetime(),
});

export type FeatureFlagsStore = z.infer<typeof featureFlagsStoreSchema>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlag[] = [
  {
    key: "minute_study_entry",
    descriptionCs: "Vstup „1 minuta“ na Dnes",
    enabled: true,
    rolloutPercent: 100,
    updatedAt: new Date(0).toISOString(),
  },
  {
    key: "celebration_readiness_delta",
    descriptionCs: "Oslava změny readiness po misi",
    enabled: true,
    rolloutPercent: 100,
    updatedAt: new Date(0).toISOString(),
  },
  {
    key: "pricing_launch_smart",
    descriptionCs: "Launch cena Smart (experimentální povrch)",
    enabled: true,
    rolloutPercent: 100,
    updatedAt: new Date(0).toISOString(),
  },
];

export function emptyFeatureFlagsStore(nowIso = new Date().toISOString()): FeatureFlagsStore {
  return {
    version: 1,
    flags: DEFAULT_FEATURE_FLAGS.map((f) => ({
      ...f,
      updatedAt: nowIso,
    })),
    experiments: [],
    updatedAt: nowIso,
  };
}

/** Deterministic 0–99 bucket for sticky assignment. */
export function stickyBucket(learnerKey: string, salt: string): number {
  const hex = createHash("sha256")
    .update(`${salt}:${learnerKey}`)
    .digest("hex")
    .slice(0, 8);
  return parseInt(hex, 16) % 100;
}

export function resolveFlagEnabled(
  flag: FeatureFlag | undefined,
  learnerKey: string | null | undefined,
): boolean {
  if (!flag || !flag.enabled) return false;
  if (flag.rolloutPercent >= 100) return true;
  if (flag.rolloutPercent <= 0) return false;
  if (!learnerKey) return false;
  return stickyBucket(learnerKey, `flag:${flag.key}`) < flag.rolloutPercent;
}

export function assignExperimentVariant(
  experiment: Experiment,
  learnerKey: string,
): string | null {
  if (experiment.status !== "running") return null;
  const total = experiment.variants.reduce((n, v) => n + v.weight, 0);
  if (total <= 0) return null;
  const bucket = stickyBucket(learnerKey, `exp:${experiment.id}`);
  // Map 0–99 onto weighted variants
  let cursor = 0;
  const scaled = experiment.variants.map((v) => ({
    id: v.id,
    span: Math.round((100 * v.weight) / total),
  }));
  // Fix rounding so spans sum to 100
  const spanSum = scaled.reduce((n, s) => n + s.span, 0);
  if (scaled.length > 0 && spanSum !== 100) {
    scaled[0]!.span += 100 - spanSum;
  }
  for (const s of scaled) {
    cursor += s.span;
    if (bucket < cursor) return s.id;
  }
  return scaled[scaled.length - 1]?.id ?? null;
}

export type ResolvedFlags = {
  flags: Record<string, boolean>;
  experiments: Record<string, string | null>;
};
