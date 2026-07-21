import { FeatureState } from "@/components/ui/FeatureState";
import { getRouteMeta } from "@/lib/navigation";

type Props = {
  href: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function RouteFeaturePage({
  href,
  primaryHref = "/app/dashboard",
  primaryLabel = "Zpět na Dnes",
  secondaryHref,
  secondaryLabel,
}: Props) {
  const meta = getRouteMeta(href);

  if (!meta) {
    return (
      <FeatureState
        title="Stránka"
        description="Tato route není v katalogu."
        availability="blocked"
        nextStep="Doplň metadata do routeCatalog."
        primaryHref="/app/dashboard"
        primaryLabel="Zpět na Dnes"
      />
    );
  }

  return (
    <FeatureState
      title={meta.title}
      description={meta.description}
      availability={meta.availability}
      nextStep={meta.nextStep}
      primaryHref={primaryHref}
      primaryLabel={primaryLabel}
      secondaryHref={secondaryHref}
      secondaryLabel={secondaryLabel}
    />
  );
}
