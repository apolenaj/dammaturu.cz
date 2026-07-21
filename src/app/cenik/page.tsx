import type { Metadata } from "next";
import { MarketingShell } from "@/components/shell/MarketingShell";
import { PricingTable } from "@/components/billing/pricing-table";
import { Badge } from "@/components/ui/badge";
import { getPublicPricingAction } from "@/server/actions/billing";
import { getAuthIdentity } from "@/server/learner-session";
import { getLearnerEntitlements } from "@/server/billing/entitlements";

export const metadata: Metadata = {
  title: "Ceník",
  description:
    "FREE, SMART, AI PRO a MATURITA MAX — plány DámMaturu s entitlements v kódu.",
};

export default async function CenikPage() {
  const { plans, checkoutConfigured } = await getPublicPricingAction();
  const identity = await getAuthIdentity();
  const currentPlanId = identity
    ? (await getLearnerEntitlements(identity.learnerId)).planId
    : null;

  return (
    <MarketingShell>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <Badge tone="brand">Ceník</Badge>
        <h1 className="mt-3 font-display text-display-md text-fg">
          Plány, které drží entitlements v kódu
        </h1>
        <p className="mt-3 max-w-2xl text-body-md text-fg-secondary">
          FREE zdarma. SMART od 99 Kč/měsíc (launch) / 149 Kč standardně. AI PRO
          249 Kč/měsíc. MATURITA MAX 499 Kč / 90 dní. Po vypršení nepřijdeš o
          nahrané materiály.
        </p>

        <div className="mt-10">
          <PricingTable
            plans={plans}
            checkoutConfigured={checkoutConfigured}
            currentPlanId={currentPlanId}
          />
        </div>
      </div>
    </MarketingShell>
  );
}
