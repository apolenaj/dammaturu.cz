import { PaywallGate } from "@/components/billing/paywall-gate";
import type { BillingFeature } from "@/domain/billing/plans";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { assertFeature } from "@/server/billing/entitlements";

/** Beta free: skip paywalls so guests aren't stuck in ceník dead-loop. */
const IS_BETA_FREE =
  process.env.NEXT_PUBLIC_BETA_FREE === undefined
    ? true
    : process.env.NEXT_PUBLIC_BETA_FREE === "true" ||
      process.env.NEXT_PUBLIC_BETA_FREE === "1";

/**
 * Server gate for paid features. Returns children when allowed (or beta free).
 */
export async function EntitlementGate({
  feature,
  children,
}: {
  feature: BillingFeature;
  children: React.ReactNode;
}) {
  if (IS_BETA_FREE) return <>{children}</>;

  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) return <>{children}</>;

  const { decision } = await assertFeature(learnerId, feature);
  if (decision.ok) return <>{children}</>;
  return <PaywallGate feature={feature} />;
}
