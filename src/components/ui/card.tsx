import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type CardVariant = "default" | "muted" | "interactive" | "hero";

const variants: Record<CardVariant, string> = {
  default: "border-border bg-surface shadow-sm",
  muted: "border-border-subtle bg-surface-muted shadow-xs",
  interactive:
    "border-border bg-surface shadow-sm transition duration-base ease-out hover:-translate-y-px hover:border-border-strong hover:shadow-md active:translate-y-0",
  hero: "border-action/20 bg-gradient-to-br from-action-soft/40 via-surface to-surface shadow-md",
};

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  padding?: "sm" | "md" | "lg";
};

const paddings = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6 sm:p-7",
} as const;

export function Card({
  className,
  variant = "default",
  padding = "md",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border",
        variants[variant],
        paddings[padding],
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-3 space-y-1.5", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-display text-title-sm tracking-tight text-fg text-balance",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-body-sm leading-relaxed text-fg-muted", className)}
      {...props}
    />
  );
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-5 flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  );
}
