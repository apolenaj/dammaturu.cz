import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export type RecoveryAction =
  | { kind: "retry"; label?: string; onClick: () => void }
  | { kind: "link"; label: string; href: string };

/**
 * Human-friendly recovery — never shows stacks, CLI, or raw errors.
 */
export function StudyRecoveryState({
  title = "Něco se nepovedlo",
  description = "Učení můžeš většinou pokračovat z materiálů nebo jinou aktivitou.",
  actions,
  className,
}: {
  title?: string;
  description?: string;
  actions?: RecoveryAction[];
  className?: string;
}) {
  const resolved: RecoveryAction[] =
    actions ??
    ([
      { kind: "link", label: "Vrátit se k materiálům", href: "/app/materials" },
      { kind: "link", label: "Zpět na Učit se", href: "/app/learn" },
    ] satisfies RecoveryAction[]);

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-lg space-y-4 rounded-xl border border-border bg-surface px-4 py-6 shadow-xs",
        className,
      )}
      role="alert"
    >
      <div>
        <h2 className="font-display text-xl text-fg">{title}</h2>
        <p className="mt-1 text-body-sm text-fg-secondary">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {resolved.map((a, i) => {
          if (a.kind === "retry") {
            return (
              <Button key={`retry-${i}`} type="button" onClick={a.onClick}>
                {a.label ?? "Zkusit znovu"}
              </Button>
            );
          }
          return (
            <Link
              key={a.href}
              href={a.href}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-canvas px-4 text-body-sm font-semibold text-fg transition hover:bg-subtle"
            >
              {a.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Empty / unavailable study content — no developer hints. */
export function ContentUnavailableState({
  title,
  description = "Tento obsah teď není k dispozici. Zkus jinou aktivitu nebo se vrať k materiálům.",
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-2xl space-y-4 px-3 pb-10", className)}>
      <h1 className="font-display text-display-md text-fg">{title}</h1>
      <StudyRecoveryState
        title="Obsah zatím není připravený"
        description={description}
        actions={[
          { kind: "link", label: "Vrátit se k materiálům", href: "/app/materials" },
          { kind: "link", label: "Pokračovat v učení", href: "/app/learn" },
          { kind: "link", label: "Dnešní mise", href: "/app/dashboard" },
        ]}
      />
    </div>
  );
}
