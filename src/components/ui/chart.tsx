import { cn } from "@/lib/cn";

export type BarDatum = {
  label: string;
  value: number;
  tone?: "brand" | "accent" | "success" | "warning" | "danger" | "muted";
};

const barTone: Record<NonNullable<BarDatum["tone"]>, string> = {
  brand: "bg-action",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  muted: "bg-fg-disabled",
};

export type BarChartProps = {
  data: BarDatum[];
  max?: number;
  className?: string;
  "aria-label"?: string;
};

/** Accessible CSS bar chart — no chart library dependency. */
export function BarChart({
  data,
  max,
  className,
  "aria-label": ariaLabel = "Sloupcový graf",
}: BarChartProps) {
  const peak =
    max ??
    Math.max(
      1,
      ...data.map((d) => d.value),
    );

  return (
    <div
      className={cn("space-y-3", className)}
      role="img"
      aria-label={ariaLabel}
    >
      {data.map((item) => {
        const pct = Math.max(0, Math.min(100, (item.value / peak) * 100));
        return (
          <div key={item.label} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3">
            <span className="truncate text-body-sm text-fg-secondary">
              {item.label}
            </span>
            <div className="h-2.5 overflow-hidden rounded-full bg-subtle">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-base ease-out",
                  barTone[item.tone ?? "brand"],
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-right text-caption tabular-nums text-fg-muted">
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export type SparklineProps = {
  values: number[];
  className?: string;
  "aria-label"?: string;
};

/** Minimal SVG sparkline for readiness trends. */
export function Sparkline({
  values,
  className,
  "aria-label": ariaLabel = "Trend",
}: SparklineProps) {
  if (values.length < 2) {
    return (
      <p className="text-body-sm text-fg-muted">Nedostatek dat pro trend.</p>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 160;
  const h = 40;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("h-10 w-40 overflow-visible", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <polyline
        fill="none"
        stroke="var(--action-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
