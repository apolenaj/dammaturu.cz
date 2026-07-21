import { cn } from "@/lib/cn";

export type ProgressProps = {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  tone?: "brand" | "accent" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  /** Soft shine sweep on the fill. */
  animated?: boolean;
  /** Pulse when complete. */
  celebrate?: boolean;
  className?: string;
};

const tones = {
  brand: "bg-action",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
} as const;

const heights = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-3.5",
} as const;

export function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  tone = "brand",
  size = "md",
  animated = true,
  celebrate,
  className,
}: ProgressProps) {
  const pct = Math.max(0, Math.min(100, max === 0 ? 0 : (value / max) * 100));
  const done = pct >= 99.5;
  const shouldCelebrate = celebrate ?? done;

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          {label ? (
            <span className="text-body-sm font-semibold text-fg">{label}</span>
          ) : (
            <span />
          )}
          {showValue ? (
            <span className="text-caption font-semibold tabular-nums text-fg-muted">
              {Math.round(pct)} %
            </span>
          ) : null}
        </div>
      )}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-subtle",
          heights[size],
          shouldCelebrate && done && "animate-celebrate",
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
      >
        <div
          className={cn(
            "relative h-full overflow-hidden rounded-full transition-[width] duration-slow ease-out",
            tones[tone],
          )}
          style={{ width: `${pct}%` }}
        >
          {animated && pct > 8 && pct < 100 ? (
            <span
              className="pointer-events-none absolute inset-0 bg-progress-shine opacity-60 animate-bar-shine"
              aria-hidden
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
