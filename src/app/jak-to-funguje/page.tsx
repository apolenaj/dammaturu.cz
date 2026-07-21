import type { Metadata } from "next";
import { MarketingShell } from "@/components/shell/MarketingShell";

export const metadata: Metadata = {
  title: "Jak to funguje",
};

const steps = [
  {
    title: "Diagnostika",
    text: "Zjistíme, co už umíš a kde jsou mezery — bez tipování.",
  },
  {
    title: "Plán",
    text: "Každý den dostaneš jasnou misi. Nemusíš řešit, co dál.",
  },
  {
    title: "Učení + active recall",
    text: "Krátký výklad a hned vybavování. Pasivní čtení nestačí.",
  },
  {
    title: "Test a oprava chyb",
    text: "Chyby se automaticky vracejí do opakování.",
  },
  {
    title: "Spaced repetition + mastery",
    text: "Opakuješ ve správný čas. Vidíš skutečnou připravenost.",
  },
];

export default function JakToFungujePage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">
          Metoda
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
          Jak to funguje
        </h1>
        <p className="mt-4 text-lg text-ink-muted">
          Learning loop, ne chat. Systém tě provede od mezery k mastery.
        </p>
        <ol className="mt-10 space-y-6">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-sm font-bold text-brand"
                aria-hidden
              >
                {index + 1}
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">
                  {step.title}
                </h2>
                <p className="mt-1 text-ink-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </MarketingShell>
  );
}
