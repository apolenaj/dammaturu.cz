import { cn } from "@/lib/cn";

export type ProgressProps = {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  tone?: "brand" | "accent" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
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
  className,
}: ProgressProps) {
  const pct = Math.max(0, Math.min(100, max === 0 ? 0 : (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label ? (
            <span className="text-body-sm font-medium text-fg">{label}</span>
          ) : (
            <span />
          )}
          {showValue ? (
            <span className="text-caption text-fg-muted tabular-nums">
              {Math.round(pct)} %
            </span>
          ) : null}
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-subtle",
          heights[size],
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-base ease-out",
            tones[tone],
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
