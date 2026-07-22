import { cn } from "@/lib/cn";

export type MasteryLevel =
  | "unknown"
  | "exposed"
  | "fragile"
  | "stable"
  | "proficient"
  | "mastered";

const masteryLabel: Record<MasteryLevel, string> = {
  unknown: "Nové",
  exposed: "Učím se",
  fragile: "K procvičení",
  stable: "Silné",
  proficient: "Silné",
  mastered: "Silné",
};

const masteryColor: Record<MasteryLevel, string> = {
  unknown: "text-mastery-unknown",
  exposed: "text-mastery-exposed",
  fragile: "text-mastery-fragile",
  stable: "text-mastery-stable",
  proficient: "text-mastery-proficient",
  mastered: "text-mastery-mastered",
};

const masteryTrack: Record<MasteryLevel, string> = {
  unknown: "stroke-mastery-unknown",
  exposed: "stroke-mastery-exposed",
  fragile: "stroke-mastery-fragile",
  stable: "stroke-mastery-stable",
  proficient: "stroke-mastery-proficient",
  mastered: "stroke-mastery-mastered",
};

export type ScoreProps = {
  value: number;
  max?: number;
  label?: string;
  mastery?: MasteryLevel;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: { box: "h-16 w-16", text: "text-lg", stroke: 6 },
  md: { box: "h-24 w-24", text: "text-2xl", stroke: 7 },
  lg: { box: "h-32 w-32", text: "text-3xl", stroke: 8 },
} as const;

export function Score({
  value,
  max = 100,
  label = "Připravenost",
  mastery,
  size = "md",
  className,
}: ScoreProps) {
  const pct = Math.max(0, Math.min(100, max === 0 ? 0 : (value / max) * 100));
  const conf = sizes[size];
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const strokeClass = mastery
    ? masteryTrack[mastery]
    : pct >= 70
      ? "stroke-success"
      : pct >= 40
        ? "stroke-accent"
        : "stroke-action";

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center gap-2.5 animate-in-rise",
        className,
      )}
      role="img"
      aria-label={`${label}: ${Math.round(pct)} procent${mastery ? `, úroveň ${masteryLabel[mastery]}` : ""}`}
    >
      <div className={cn("relative", conf.box)}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            className="stroke-subtle"
            strokeWidth={conf.stroke}
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            className={cn(
              strokeClass,
              "transition-[stroke-dashoffset] duration-slow ease-out",
            )}
            strokeWidth={conf.stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-display font-semibold tabular-nums tracking-tight text-fg",
              conf.text,
            )}
          >
            {Math.round(pct)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
            %
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-body-sm font-semibold text-fg">{label}</p>
        {mastery ? (
          <p className={cn("text-caption font-semibold", masteryColor[mastery])}>
            {masteryLabel[mastery]}
          </p>
        ) : null}
      </div>
    </div>
  );
}
