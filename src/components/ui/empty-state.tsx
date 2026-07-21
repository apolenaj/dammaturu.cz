import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
};

/**
 * Useful empty state — calm, clear next step.
 */
export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  actionHref,
  className,
}: EmptyStateProps) {
  const showAction = Boolean(actionLabel && (onAction || actionHref));

  return (
    <div
      className={cn(
        "flex flex-col items-start rounded-2xl border border-dashed border-border bg-surface-muted/80 px-6 py-9 animate-in-rise",
        className,
      )}
      role="status"
    >
      {icon ? (
        <div
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-action-soft text-action shadow-xs"
          aria-hidden
        >
          {icon}
        </div>
      ) : (
        <div
          className="mb-4 h-1.5 w-10 rounded-full bg-action/40"
          aria-hidden
        />
      )}
      <h2 className="font-display text-title-sm tracking-tight text-fg text-balance">
        {title}
      </h2>
      <p className="mt-1.5 max-w-md text-body-sm leading-relaxed text-fg-muted">
        {description}
      </p>
      {showAction ? (
        actionHref ? (
          <Link
            href={actionHref}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-4 text-body-sm font-semibold text-fg-on-brand shadow-xs transition duration-fast ease-out hover:bg-action-hover active:scale-[0.985]"
          >
            {actionLabel}
          </Link>
        ) : (
          <Button className="mt-6" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      ) : null}
    </div>
  );
}
