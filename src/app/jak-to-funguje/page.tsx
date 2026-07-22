import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/shell/MarketingShell";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicMetadata({
  title: "Jak to funguje",
  description:
    "Od mezery k jistotě: denní mise, vybavení, oprava chyb a pokrok podle výsledků — ne podle dojmu z čtení.",
  path: "/jak-to-funguje",
});

const steps = [
  {
    title: "Začni materiály nebo katalogem",
    text: "Nahraješ poznámky, nebo použiješ připravený ČJL katalog. Otázky vycházejí ze zdroje.",
  },
  {
    title: "Dnešní mise",
    text: "Jedna obrazovka řekne, co dělat teď — bez hledání „kde začít“.",
  },
  {
    title: "Vybavení a zpětná vazba",
    text: "Nejdřív si vzpomeneš, pak uvidíš vysvětlení a zdroj. Pasivní čtení nestačí.",
  },
  {
    title: "Chyby se vracejí",
    text: "Špatné odpovědi jdou do opakování. Víš, co ještě není jistota.",
  },
  {
    title: "Vidíš, co umíš",
    text: "Pokrok podle cvičení — Nové / Učím se / K procvičení / Silné.",
  },
];

export default function JakToFungujePage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-action">
          Metoda
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-fg">
          Jak to funguje
        </h1>
        <p className="mt-4 text-lg text-fg-secondary">
          Studijní systém, ne chatbot. Od nahrání materiálů k pocitu jistoty
          před maturitou.
        </p>
        <ol className="mt-10 space-y-6">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-action-soft text-sm font-bold text-action"
                aria-hidden
              >
                {index + 1}
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold text-fg">
                  {step.title}
                </h2>
                <p className="mt-1 text-fg-secondary">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-body-sm text-fg-secondary">
          Veřejné přehledy témat:{" "}
          <Link href="/priprava" className="font-semibold text-action underline">
            Příprava k maturitě
          </Link>
          .
        </p>
      </div>
    </MarketingShell>
  );
}
