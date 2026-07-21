import type { ReactNode } from "react";
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

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start rounded-xl border border-dashed border-border bg-surface-muted/60 px-5 py-8",
        className,
      )}
      role="status"
    >
      {icon ? (
        <div
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-action-soft text-action"
          aria-hidden
        >
          {icon}
        </div>
      ) : null}
      <h2 className="font-display text-title-sm text-fg">{title}</h2>
      <p className="mt-1 max-w-md text-body-sm text-fg-muted">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-5" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
