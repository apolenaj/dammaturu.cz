import { cn } from "@/lib/cn";

export type SkeletonProps = {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "full";
};

export function Skeleton({ className, rounded = "md" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-skeleton bg-subtle",
        rounded === "sm" && "rounded-sm",
        rounded === "md" && "rounded-md",
        rounded === "lg" && "rounded-lg",
        rounded === "full" && "rounded-full",
        className,
      )}
      aria-hidden
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Načítání…</span>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      className="rounded-xl border border-border bg-surface p-5 shadow-sm"
      aria-busy="true"
    >
      <span className="sr-only">Načítání karty…</span>
      <Skeleton className="mb-3 h-5 w-1/3" />
      <SkeletonText lines={3} />
      <Skeleton className="mt-4 h-10 w-28" />
    </div>
  );
}
