import Link from "next/link";
import type { BillingFeature } from "@/domain/billing/plans";
import { featureBlockedReasonCs } from "@/domain/billing/entitlements";
import { Button } from "@/components/ui/button";

/**
 * Soft paywall — never used for personal_materials_read.
 */
export function PaywallGate({
  feature,
  titleCs = "Tahle funkce je v placeném plánu",
}: {
  feature: BillingFeature;
  titleCs?: string;
}) {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
      <h2 className="font-display text-title-md text-fg">{titleCs}</h2>
      <p className="text-body-sm text-fg-secondary">
        {featureBlockedReasonCs(feature)}
      </p>
      <p className="text-caption text-fg-muted">
        Tvoje už nahrané materiály zůstávají dostupné ke čtení.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/cenik">
          <Button type="button" className="min-h-11 w-full sm:w-auto">
            Zobrazit ceník
          </Button>
        </Link>
        <Link href="/app/profile">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
          >
            Správa předplatného
          </Button>
        </Link>
      </div>
    </div>
  );
}
