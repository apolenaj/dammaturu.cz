import type { Metadata } from "next";
import { MarketingShell } from "@/components/shell/MarketingShell";
import { FeatureState } from "@/components/ui/FeatureState";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicMetadata({
  title: "Předměty",
  description:
    "Předmětové balíčky DámMaturu. Beta: Český jazyk a literatura. Další předměty přijdou později.",
  path: "/predmety",
});

export default function PredmetyPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <FeatureState
          title="Předměty"
          description="Přehled předmětových balíčků. Beta začíná jedním ověřeným packem — Český jazyk a literatura."
          availability="scaffolded"
          nextStep="Další předměty přibydou až po škálovatelném content modelu. Teď není falešný katalog předmětů."
          primaryHref="/priprava"
          primaryLabel="Příprava z češtiny"
          secondaryHref="/app/learn"
          secondaryLabel="Studijní appka"
        />
      </div>
    </MarketingShell>
  );
}
