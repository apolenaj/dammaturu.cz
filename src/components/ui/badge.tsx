import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-subtle text-fg-secondary ring-1 ring-inset ring-border-subtle",
  brand: "bg-action-soft text-action ring-1 ring-inset ring-action/15",
  accent: "bg-accent-soft text-accent-hover ring-1 ring-inset ring-accent/20",
  success: "bg-success-soft text-success ring-1 ring-inset ring-success/15",
  warning: "bg-warning-soft text-warning ring-1 ring-inset ring-warning/15",
  danger: "bg-danger-soft text-danger ring-1 ring-inset ring-danger/15",
  info: "bg-info-soft text-info ring-1 ring-inset ring-info/15",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-caption font-semibold tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
