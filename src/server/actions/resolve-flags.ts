"use server";

import type { ResolvedFlags } from "@/domain/feature-flags";
import { getAuthIdentity } from "@/server/learner-session";
import { resolveFlagsForLearner } from "@/server/feature-flags/store";

/** Resolve sticky feature flags + experiment variants for the current learner. */
export async function getResolvedFlagsAction(): Promise<ResolvedFlags> {
  const identity = await getAuthIdentity();
  return resolveFlagsForLearner(identity?.learnerId ?? null);
}
