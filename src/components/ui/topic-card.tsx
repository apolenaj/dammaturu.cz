import Link from "next/link";
import type { ReactNode } from "react";
import { MasteryStateChip } from "@/components/ui/mastery-state-chip";
import type { StudentVisualState } from "@/domain/learning/mastery-engine";
import { cn } from "@/lib/cn";

export type TopicCardProps = {
  title: string;
  metaCs?: string;
  progressCs?: string;
  dueCs?: string;
  visualState?: StudentVisualState;
  ctaLabel: string;
  ctaHref: string;
  className?: string;
  children?: ReactNode;
};

/**
 * Shared topic / study card — calm surface, one primary CTA, optional state chip.
 */
export function TopicCard({
  title,
  metaCs,
  progressCs,
  dueCs,
  visualState,
  ctaLabel,
  ctaHref,
  className,
  children,
}: TopicCardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-surface px-4 py-4 shadow-xs",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-fg text-balance">
            {title}
          </h3>
          {metaCs ? (
            <p className="text-caption text-fg-muted">{metaCs}</p>
          ) : null}
        </div>
        {visualState ? <MasteryStateChip visualState={visualState} /> : null}
      </div>

      {(progressCs || dueCs) && (
        <dl className="mt-3 space-y-1.5 text-body-sm">
          {progressCs ? (
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">Pokrok</dt>
              <dd className="text-right font-medium text-fg">{progressCs}</dd>
            </div>
          ) : null}
          {dueCs ? (
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">Dnes zopakovat</dt>
              <dd className="text-right font-medium text-fg">{dueCs}</dd>
            </div>
          ) : null}
        </dl>
      )}

      {children}

      <Link
        href={ctaHref}
        className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl bg-action px-4 text-body-sm font-semibold tracking-wide text-fg-on-brand shadow-xs transition duration-fast ease-out hover:bg-action-hover hover:shadow-sm active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
      >
        {ctaLabel}
      </Link>
    </article>
  );
}
