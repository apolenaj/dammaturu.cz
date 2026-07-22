import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export type AppPageHeaderProps = {
  /** Page title — one clear job. */
  title: string;
  /** Why this screen exists (purpose). */
  purpose: string;
  /** Optional eyebrow / context badge text. */
  eyebrow?: string;
  /** Single primary action — prefer one CTA. */
  primaryAction?: {
    label: string;
    href: string;
  };
  /** Optional secondary text link. */
  secondaryAction?: {
    label: string;
    href: string;
  };
  className?: string;
  children?: ReactNode;
};

/**
 * Authenticated screen header: purpose + one primary action.
 * Use on every learner hub to cut decision overload.
 */
export function AppPageHeader({
  title,
  purpose,
  eyebrow,
  primaryAction,
  secondaryAction,
  className,
  children,
}: AppPageHeaderProps) {
  return (
    <header className={cn("space-y-4", className)}>
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-title-lg tracking-tight text-fg text-balance sm:text-display-sm">
          {title}
        </h1>
        <p className="max-w-xl text-body-sm leading-relaxed text-fg-secondary sm:text-body-md">
          {purpose}
        </p>
      </div>
      {primaryAction || secondaryAction ? (
        <div className="flex flex-wrap items-center gap-3">
          {primaryAction ? (
            <Link
              href={primaryAction.href}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-5 text-body-sm font-semibold tracking-wide text-fg-on-brand shadow-xs transition duration-fast ease-out hover:bg-action-hover hover:shadow-sm active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {primaryAction.label}
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link
              href={secondaryAction.href}
              className="text-body-sm font-semibold text-action underline-offset-2 hover:underline"
            >
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      ) : null}
      {children}
    </header>
  );
}

export type AppLoadingStateProps = {
  label?: string;
  className?: string;
};

/** Consistent loading skeleton for learner screens — reserves space to limit CLS. */
export function AppLoadingState({
  label = "Načítám…",
  className,
}: AppLoadingStateProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-lg space-y-5 py-2", className)}
      aria-busy="true"
      aria-live="polite"
      style={{ minHeight: "16rem" }}
    >
      <span className="sr-only">{label}</span>
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-subtle" />
        <div className="h-8 w-2/3 max-w-xs animate-pulse rounded-md bg-subtle" />
        <div className="h-4 w-full animate-pulse rounded-md bg-subtle" />
        <div className="h-4 w-5/6 animate-pulse rounded-md bg-subtle" />
      </div>
      <div className="h-12 w-40 animate-pulse rounded-md bg-subtle" />
      <div className="h-36 animate-pulse rounded-xl bg-subtle" />
    </div>
  );
}

export type AppErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  homeHref?: string;
  materialsHref?: string;
  /** When true, offer offline / materials continuation. */
  allowOfflineContinue?: boolean;
  className?: string;
};

/** Useful error state with retry + escape hatches — never raw errors. */
export function AppErrorState({
  title = "Něco se pokazilo",
  description = "Zkus to znovu. Když problém zůstane, vrať se k materiálům a pokračuj v učení.",
  onRetry,
  homeHref = "/app/dashboard",
  materialsHref = "/app/materials",
  allowOfflineContinue = true,
  className,
}: AppErrorStateProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-lg space-y-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-6",
        className,
      )}
      role="alert"
    >
      <div>
        <h2 className="font-display text-xl text-fg">{title}</h2>
        <p className="mt-1 text-body-sm text-fg-secondary">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {onRetry ? (
          <Button type="button" onClick={onRetry}>
            Zkusit znovu
          </Button>
        ) : null}
        {allowOfflineContinue ? (
          <Link
            href={materialsHref}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-canvas px-4 text-body-sm font-semibold text-fg"
          >
            Vrátit se k materiálům
          </Link>
        ) : null}
        {allowOfflineContinue ? (
          <Link
            href="/app/learn"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-canvas px-4 text-body-sm font-semibold text-fg"
          >
            Pokračovat offline
          </Link>
        ) : null}
        <Link
          href={homeHref}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-canvas px-4 text-body-sm font-semibold text-fg"
        >
          Zpět na Dnes
        </Link>
      </div>
    </div>
  );
}
