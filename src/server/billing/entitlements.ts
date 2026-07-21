import { resolveEntitlements } from "@/domain/billing/entitlements";
import type { BillingFeature } from "@/domain/billing/plans";
import { requireFeature } from "@/domain/billing/entitlements";
import { getOrCreateBillingSubscription } from "@/server/billing/store";

/**
 * Server-side entitlement resolution for the current learner.
 */
export async function getLearnerEntitlements(learnerId: string) {
  const subscription = await getOrCreateBillingSubscription(learnerId);
  const resolved = resolveEntitlements({ subscription });
  return { subscription, ...resolved };
}

export async function assertFeature(
  learnerId: string,
  feature: BillingFeature,
) {
  const ent = await getLearnerEntitlements(learnerId);
  const decision = requireFeature(ent.features, ent.planId, feature);
  return { ...ent, decision };
}
