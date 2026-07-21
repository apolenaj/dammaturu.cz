import type { Metadata } from "next";
import { MarketingShell } from "@/components/shell/MarketingShell";
import { FeatureState } from "@/components/ui/FeatureState";

export const metadata: Metadata = {
  title: "Ceník",
};

export default function CenikPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <FeatureState
          title="Ceník"
          description="Plány a ceny budou veřejné až po zapojení billing. Teď neukazujeme fiktivní ceny."
          availability="scaffolded"
          nextStep="Beta běží řízenou pozvánkou. Stripe/billing je mimo P0."
          primaryHref="/o-projektu"
          primaryLabel="O projektu"
          secondaryHref="/registrace"
          secondaryLabel="Registrace (zatím blokovaná)"
        />
      </div>
    </MarketingShell>
  );
}
