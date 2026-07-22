import Link from "next/link";
import { cn } from "@/lib/cn";

const linkPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-lg bg-action px-6 text-body-sm font-semibold tracking-wide text-fg-on-brand shadow-xs transition duration-fast ease-out hover:bg-action-hover hover:shadow-sm active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

const linkSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-surface px-6 text-body-sm font-semibold text-fg shadow-xs transition duration-fast ease-out hover:bg-subtle active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export function CtaPair({
  className,
  primaryHref = "/app/learn",
  primaryLabel = "Začít se učit bez registrace",
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
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap",
        className,
      )}
    >
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
          "font-display text-title-lg tracking-tight text-fg text-balance sm:text-display-sm",
          eyebrow && "mt-2",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-body-lg leading-relaxed text-fg-secondary">
          {description}
        </p>
      ) : null}
    </div>
  );
}
