import { PaywallGate } from "@/components/billing/paywall-gate";
import type { BillingFeature } from "@/domain/billing/plans";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { assertFeature } from "@/server/billing/entitlements";

/**
 * Server gate for paid features. Returns null when allowed.
 */
export async function EntitlementGate({
  feature,
  children,
}: {
  feature: BillingFeature;
  children: React.ReactNode;
}) {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) return <>{children}</>;

  const { decision } = await assertFeature(learnerId, feature);
  if (decision.ok) return <>{children}</>;
  return <PaywallGate feature={feature} />;
}
