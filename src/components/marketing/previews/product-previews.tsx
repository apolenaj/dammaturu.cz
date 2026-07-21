import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Score } from "@/components/ui/score";
import { cn } from "@/lib/cn";

/** Marketing UI preview — mirrors real screens; illustrative, not live data. */

function PreviewChrome({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-surface shadow-lg",
        className,
      )}
      aria-hidden
    >
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle bg-surface-muted/80 px-4 py-3">
        <div className="min-w-0">
          <p className="text-caption font-semibold text-fg-muted">{title}</p>
          {subtitle ? (
            <p className="truncate text-body-sm font-semibold text-fg">
              {subtitle}
            </p>
          ) : null}
        </div>
        <Badge tone="brand">Ukázka</Badge>
      </div>
      {children}
    </div>
  );
}

/** Mirrors /app/dashboard — dnešní mise. */
export function DashboardPreview({ className }: { className?: string }) {
  return (
    <PreviewChrome
      title="Dnes"
      subtitle="Co mám dnes udělat?"
      className={className}
    >
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-border bg-canvas px-3.5 py-3">
          <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
            Dnešní mise · 25 min
          </p>
          <p className="mt-1.5 text-body-sm font-semibold text-fg">
            1. Opakuj slabší body · 2. Procvič pravopis · 3. Ústní — Máj
          </p>
        </div>
        <Progress label="Postup mise" value={1} max={3} showValue size="sm" />
        <div className="flex gap-2">
          <span className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-action px-3 text-caption font-semibold text-fg-on-brand">
            Začít dnešní misi
          </span>
        </div>
      </div>
    </PreviewChrome>
  );
}

/** Mirrors /app/materials upload + Ready state. */
export function UploadPreview({ className }: { className?: string }) {
  return (
    <PreviewChrome
      title="Moje materiály"
      subtitle="Nahraj PDF nebo DOCX"
      className={className}
    >
      <div className="space-y-3 p-4">
        <div className="rounded-xl border border-dashed border-action/40 bg-action-soft/40 px-4 py-6 text-center">
          <p className="text-body-sm font-semibold text-fg">
            Přetáhni soubor sem
          </p>
          <p className="mt-1 text-caption text-fg-muted">
            PDF · DOCX · TXT · max. přiměřená velikost
          </p>
        </div>
        <ul className="space-y-2">
          {[
            { name: "Poznámky — romantismus.pdf", state: "Připraveno" },
            { name: "Školní seznam literatury.docx", state: "Zpracovává se" },
          ].map((f) => (
            <li
              key={f.name}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-canvas px-3 py-2.5"
            >
              <span className="truncate text-body-sm text-fg">{f.name}</span>
              <Badge
                tone={f.state === "Připraveno" ? "success" : "warning"}
              >
                {f.state}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </PreviewChrome>
  );
}

/** Mirrors materials study / tests with explanation — not a chatbot. */
export function MaterialsTestPreview({ className }: { className?: string }) {
  return (
    <PreviewChrome
      title="Studium z materiálů"
      subtitle="Otázka z tvého textu"
      className={className}
    >
      <div className="space-y-3 p-4">
        <p className="text-body-sm font-semibold text-fg">
          Co podle tvých poznámek charakterizuje romantismus?
        </p>
        <div className="space-y-2">
          {["Idealizace hrdiny", "Přesný popis továrny", "Úřední styl"].map(
            (opt, i) => (
              <div
                key={opt}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-body-sm",
                  i === 0
                    ? "border-success/40 bg-success-soft/50 font-semibold text-fg"
                    : "border-border bg-canvas text-fg-secondary",
                )}
              >
                {opt}
              </div>
            ),
          )}
        </div>
        <div className="rounded-lg border border-border-subtle bg-subtle px-3 py-2.5">
          <p className="text-caption font-semibold text-fg">Vysvětlení</p>
          <p className="mt-1 text-caption text-fg-secondary">
            V tvém materiálu: důraz na cit, individualitu a idealizaci — ne na
            „fotografií“ reality.
          </p>
          <p className="mt-2 text-caption text-fg-muted">
            Odkaz na úryvek z nahraného souboru
          </p>
        </div>
      </div>
    </PreviewChrome>
  );
}

/** Mirrors /app/progress readiness. */
export function ReadinessPreview({ className }: { className?: string }) {
  return (
    <PreviewChrome
      title="Pokrok"
      subtitle="Kde stojíš podle výsledků"
      className={className}
    >
      <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <Score value={64} size="sm" label="Připravenost" />
        <ul className="space-y-2">
          {[
            { label: "Didaktický test", pct: 58 },
            { label: "Ústní — literatura", pct: 71 },
            { label: "Jazyk a styl", pct: 62 },
          ].map((row) => (
            <li key={row.label}>
              <Progress
                label={row.label}
                value={row.pct}
                showValue
                size="sm"
              />
            </li>
          ))}
        </ul>
      </div>
    </PreviewChrome>
  );
}

/** Mirrors /app/cermat. */
export function CermatPreview({ className }: { className?: string }) {
  return (
    <PreviewChrome
      title="CERMAT ČJL"
      subtitle="Cvičný didaktický trénink"
      className={className}
    >
      <div className="space-y-3 p-4">
        <p className="text-caption text-fg-muted">
          Cvičné otázky ve stylu testu — ne oficiální zadání CERMAT.
        </p>
        <div className="flex flex-wrap gap-2">
          {["Pravopis", "Skladba", "Porozumění", "Morfologie"].map((c) => (
            <span
              key={c}
              className="rounded-md bg-subtle px-2.5 py-1 text-caption font-semibold text-fg-secondary"
            >
              {c}
            </span>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-canvas px-3 py-3">
          <p className="text-body-sm font-semibold text-fg">
            Ve které větě je pravopisná chyba?
          </p>
          <p className="mt-2 text-caption text-fg-muted">
            Režim: trénink bez limitu · po odpovědi vysvětlení
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-lg bg-action px-3 py-2 text-caption font-semibold text-fg-on-brand">
            Spustit trénink
          </span>
          <span className="rounded-lg border border-border px-3 py-2 text-caption font-semibold text-fg-secondary">
            Časovaná simulace
          </span>
        </div>
      </div>
    </PreviewChrome>
  );
}

/** Mirrors /app/simulation oral. */
export function SimulationPreview({ className }: { className?: string }) {
  return (
    <PreviewChrome
      title="Zkouška nanečisto"
      subtitle="Ústní · kniha z tvého seznamu"
      className={className}
    >
      <div className="space-y-3 p-4">
        <div className="rounded-xl border border-border bg-canvas px-3 py-3">
          <p className="text-caption font-semibold text-fg-muted">Losovaná kniha</p>
          <p className="mt-1 text-body-sm font-semibold text-fg">
            Máj — Karel Hynek Mácha
          </p>
          <p className="mt-1 text-caption text-fg-secondary">
            Příprava 3 min · odpověď · doplňující otázky
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Obsah", v: "72" },
            { l: "Struktura", v: "68" },
            { l: "Fakta", v: "80" },
          ].map((x) => (
            <div
              key={x.l}
              className="rounded-lg bg-subtle px-2 py-2 text-center"
            >
              <p className="font-display text-title-sm tabular-nums text-fg">
                {x.v}
              </p>
              <p className="text-caption text-fg-muted">{x.l}</p>
            </div>
          ))}
        </div>
        <p className="text-caption text-fg-muted">
          Feedback s evidencí — ne školní známka 1–5.
        </p>
      </div>
    </PreviewChrome>
  );
}

/** Journey strip for success path. */
export function JourneyPreview({ className }: { className?: string }) {
  const steps = [
    { n: "1", t: "Nahraj materiály" },
    { n: "2", t: "Dnešní mise" },
    { n: "3", t: "Testy + CERMAT" },
    { n: "4", t: "Ústní nanečisto" },
    { n: "5", t: "Sleduj pokrok" },
  ];
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-5 shadow-md sm:p-6",
        className,
      )}
      aria-hidden
    >
      <ol className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
        {steps.map((s, i) => (
          <li key={s.n} className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-action text-caption font-bold text-fg-on-brand">
              {s.n}
            </span>
            <span className="text-body-sm font-semibold text-fg">{s.t}</span>
            {i < steps.length - 1 ? (
              <span
                className="mx-1 hidden h-px w-6 bg-border sm:inline-block"
                aria-hidden
              />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
