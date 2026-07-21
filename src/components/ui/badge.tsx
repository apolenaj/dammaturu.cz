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
  neutral: "bg-subtle text-fg-secondary",
  brand: "bg-action-soft text-action",
  accent: "bg-accent-soft text-accent-hover",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
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
