import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Score } from "@/components/ui/score";
import { cn } from "@/lib/cn";

/** Marketing UI preview — illustrative, not live user data. */
export function DashboardPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface shadow-lg",
        className,
      )}
      aria-hidden
    >
      <div className="flex items-center justify-between border-b border-border-subtle bg-surface-muted px-4 py-3">
        <div>
          <p className="text-caption font-semibold text-fg-muted">Dnes</p>
          <p className="text-body-sm font-semibold text-fg">Tvá mise · 22 min</p>
        </div>
        <Badge tone="brand">Ukázka</Badge>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-canvas px-3 py-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Další krok
            </p>
            <p className="mt-1 text-body-sm font-semibold text-fg">
              Opakovat: znaky realismu
            </p>
            <p className="mt-0.5 text-body-sm text-fg-muted">
              Kvůli chybě ze včerejška · active recall
            </p>
          </div>
          <Progress label="Mise dnes" value={2} max={3} showValue size="sm" />
          <div className="flex gap-2">
            <span className="rounded-md bg-action px-3 py-2 text-caption font-semibold text-fg-on-brand">
              Začít misi
            </span>
            <span className="rounded-md border border-border px-3 py-2 text-caption font-semibold text-fg-secondary">
              Plán
            </span>
          </div>
        </div>
        <Score value={68} size="sm" label="Maturita Score" mastery="stable" />
      </div>
    </div>
  );
}

export function LessonPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface shadow-lg",
        className,
      )}
      aria-hidden
    >
      <div className="border-b border-border-subtle px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-caption font-semibold text-fg-muted">
            Lekce · Realismus
          </p>
          <Badge tone="accent">Recall</Badge>
        </div>
        <p className="mt-1 text-body-sm font-semibold text-fg">
          Co je základní estetický princip realismu?
        </p>
      </div>
      <div className="space-y-3 p-4">
        <p className="rounded-lg bg-subtle px-3 py-3 text-body-sm text-fg-secondary">
          Pravdivý obraz skutečnosti bez idealizace — v celé komplexnosti.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-success px-3 py-2 text-caption font-semibold text-fg-on-brand">
            Umím
          </span>
          <span className="rounded-md border border-border px-3 py-2 text-caption font-semibold text-fg-secondary">
            Skoro
          </span>
          <span className="rounded-md border border-border px-3 py-2 text-caption font-semibold text-fg-secondary">
            Neumím
          </span>
        </div>
        <p className="text-caption text-fg-muted">
          Zdroj: Realismus — studijní materiál · provenance
        </p>
      </div>
    </div>
  );
}

export function WeakspotsPreview({ className }: { className?: string }) {
  const rows = [
    { label: "Homonyma vs. mnohoznačnost", level: "Křehké", tone: "warning" as const },
    { label: "Kytice — motivy", level: "Stabilní", tone: "success" as const },
    { label: "Jirásek — klíčová díla", level: "Mezera", tone: "danger" as const },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface shadow-md",
        className,
      )}
      aria-hidden
    >
      <div className="border-b border-border-subtle px-4 py-3">
        <p className="text-body-sm font-semibold text-fg">Slabá místa</p>
        <p className="text-caption text-fg-muted">Podle chyb a due reviews</p>
      </div>
      <ul className="divide-y divide-border-subtle">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <span className="text-body-sm text-fg">{row.label}</span>
            <Badge tone={row.tone}>{row.level}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlanPreview({ className }: { className?: string }) {
  const days = [
    { day: "Po", focus: "Diagnostika ČJL", done: true },
    { day: "Út", focus: "Romantismus · znaky", done: true },
    { day: "St", focus: "Máj · motivy", done: false },
    { day: "Čt", focus: "Review + chyby", done: false },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface shadow-md",
        className,
      )}
      aria-hidden
    >
      <div className="border-b border-border-subtle px-4 py-3">
        <p className="text-body-sm font-semibold text-fg">Týdenní plán</p>
        <p className="text-caption text-fg-muted">Do maturity · time budget 25 min/den</p>
      </div>
      <ul className="space-y-2 p-4">
        {days.map((d) => (
          <li
            key={d.day}
            className="flex items-center gap-3 rounded-lg bg-subtle/80 px-3 py-2.5"
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-caption font-bold",
                d.done
                  ? "bg-success-soft text-success"
                  : "bg-action-soft text-action",
              )}
            >
              {d.day}
            </span>
            <span className="text-body-sm text-fg">{d.focus}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MethodsPreview({ className }: { className?: string }) {
  const methods = [
    { title: "Micro-výklad", meta: "30–90 s" },
    { title: "Flashcards", meta: "Active recall" },
    { title: "Cloze", meta: "Doplňovačky" },
    { title: "Short answer", meta: "Vlastními slovy" },
  ];

  return (
    <div
      className={cn("grid grid-cols-2 gap-2 sm:gap-3", className)}
      aria-hidden
    >
      {methods.map((m) => (
        <div
          key={m.title}
          className="rounded-xl border border-border bg-surface px-3 py-4 shadow-sm"
        >
          <p className="text-body-sm font-semibold text-fg">{m.title}</p>
          <p className="mt-1 text-caption text-fg-muted">{m.meta}</p>
        </div>
      ))}
    </div>
  );
}

export function ReviewPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-4 shadow-md",
        className,
      )}
      aria-hidden
    >
      <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
        Opakování dnes
      </p>
      <p className="mt-2 font-display text-title-sm text-fg">7 položek due</p>
      <Progress className="mt-4" value={3} max={7} label="Hotovo" showValue size="sm" />
      <p className="mt-3 text-body-sm text-fg-muted">
        Nejdřív overdue a chyby — pak nové učivo.
      </p>
    </div>
  );
}

export function SimulationPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-4 shadow-md",
        className,
      )}
      aria-hidden
    >
      <div className="flex items-center justify-between">
        <p className="text-body-sm font-semibold text-fg">Simulace ústní</p>
        <Badge tone="neutral">Připravuje se</Badge>
      </div>
      <p className="mt-2 text-body-sm text-fg-secondary">
        Timed mix otázek napříč tématy — výsledek jde do mastery, ne do dojmu.
      </p>
      <div className="mt-4 rounded-lg bg-subtle px-3 py-3">
        <p className="text-caption text-fg-muted">Ukázkový prompt</p>
        <p className="mt-1 text-body-sm font-medium text-fg">
          Charakterizuj romantismus a uveď příklad z Máje.
        </p>
      </div>
    </div>
  );
}
