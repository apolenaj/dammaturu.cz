import Link from "next/link";
import { cn } from "@/lib/cn";

const linkPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-action px-5 text-body-sm font-semibold text-fg-on-brand shadow-xs transition hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

const linkSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-surface px-5 text-body-sm font-semibold text-fg shadow-xs transition hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export function CtaPair({
  className,
  primaryHref = "/onboarding",
  primaryLabel = "Zjistit moji připravenost",
  secondaryHref = "/jak-to-funguje",
  secondaryLabel = "Jak to funguje",
}: {
  className?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap", className)}>
      <Link href={primaryHref} className={linkPrimary}>
        {primaryLabel}
      </Link>
      <Link href={secondaryHref} className={linkSecondary}>
        {secondaryLabel}
      </Link>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
      )}
    >
      {eyebrow ? (
        <p className="text-overline text-action">{eyebrow}</p>
      ) : null}
      <h2
        className={cn(
          "font-display text-title-lg text-fg sm:text-[1.875rem]",
          eyebrow && "mt-2",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-body-lg text-fg-secondary">{description}</p>
      ) : null}
    </div>
  );
}
