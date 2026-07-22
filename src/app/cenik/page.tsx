import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/shell/MarketingShell";
import { PricingTable } from "@/components/billing/pricing-table";
import { Badge } from "@/components/ui/badge";
import { getPublicPricingAction } from "@/server/actions/billing";
import { getAuthIdentity } from "@/server/learner-session";
import { getLearnerEntitlements } from "@/server/billing/entitlements";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicMetadata({
  title: "Ceník",
  description:
    "DámMaturu beta je teď zdarma. Placené plány zveřejníme, až bude platba opravdu zapnutá.",
  path: "/cenik",
});

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
        {checkoutConfigured ? (
          <>
            <h1 className="mt-3 font-display text-display-md text-fg">
              Plány DámMaturu
            </h1>
            <p className="mt-3 max-w-2xl text-body-md text-fg-secondary">
              FREE zdarma. SMART, AI PRO a MATURITA MAX podle entitlements v
              kódu. Po vypršení nepřijdeš o nahrané materiály.
            </p>
            <div className="mt-10">
              <PricingTable
                plans={plans}
                checkoutConfigured={checkoutConfigured}
                currentPlanId={currentPlanId}
              />
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-display text-display-md text-fg">
              Beta je zdarma
            </h1>
            <p className="mt-3 max-w-2xl text-body-md text-fg-secondary">
              Placené plány zatím neprodáváme — checkout není zapnutý. Učíš se z
              dostupného obsahu češtiny k maturitě bez fiktivních cen. Až bude
              platba opravdu aktivní, napíšeme to tady na rovinu.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/learn"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-action px-6 text-body-sm font-semibold text-fg-on-brand shadow-xs transition hover:bg-action-hover"
              >
                Začít se učit zdarma
              </Link>
              <Link
                href="/priprava"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-surface px-6 text-body-sm font-semibold text-fg transition hover:bg-subtle"
              >
                Prohlédnout témata
              </Link>
            </div>
          </>
        )}
      </div>
    </MarketingShell>
  );
}
