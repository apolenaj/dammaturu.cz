import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { FeatureAvailability } from "@/lib/navigation";

const labels: Record<FeatureAvailability, string> = {
  ready: "Dostupné",
  scaffolded: "Připraveno — čeká na data",
  blocked: "Zatím nedostupné",
};

const tones: Record<
  FeatureAvailability,
  "success" | "accent" | "neutral"
> = {
  ready: "success",
  scaffolded: "accent",
  blocked: "neutral",
};

type FeatureStateProps = {
  title: string;
  description: string;
  availability: FeatureAvailability;
  nextStep: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function FeatureState({
  title,
  description,
  availability,
  nextStep,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: FeatureStateProps) {
  return (
    <section
      className="mx-auto w-full max-w-xl"
      aria-labelledby="feature-state-title"
    >
      <Badge tone={tones[availability]} className="mb-3">
        {labels[availability]}
      </Badge>
      <h1
        id="feature-state-title"
        className="font-display text-display-md text-fg"
      >
        {title}
      </h1>
      <p className="mt-3 text-body-lg text-fg-secondary">{description}</p>
      <Card className="mt-6" role="status">
        <p className="text-body-sm font-semibold text-fg">Co chybí</p>
        <p className="mt-1 text-body-sm text-fg-muted">{nextStep}</p>
      </Card>
      {(primaryHref || secondaryHref) && (
        <div className="mt-8 flex flex-wrap gap-3">
          {primaryHref && primaryLabel ? (
            <Link
              href={primaryHref}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-action px-4 text-body-sm font-semibold text-fg-on-brand shadow-xs transition hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {primaryLabel}
            </Link>
          ) : null}
          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-body-sm font-semibold text-fg shadow-xs transition hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}
