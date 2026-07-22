import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/shell/MarketingShell";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicMetadata({
  title: "Maturitní příprava",
  description:
    "Jak DámMaturu připravuje na maturitu z češtiny: mise, cvičení ze zdroje, ústní nanečisto a jasný pokrok.",
  path: "/maturitni-priprava",
});

export default function MaturitniPripravaPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">
          Maturitní příprava bez chaosu
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-fg-secondary">
          DámMaturu.cz není jen sbírka materiálů. Je to systém, který ti řekne,
          co se učit, ověří to vybavením a ukáže, co už držíš.
        </p>
        <ul className="mt-8 space-y-3 text-fg-secondary">
          <li>Fakta mají zdroj — nejistota se neskrývá.</li>
          <li>Denní mise místo „vyber si z menu“.</li>
          <li>Pokrok podle cvičení, ne podle dojmu z čtení.</li>
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/jak-to-funguje"
            className="inline-flex min-h-11 items-center rounded-lg bg-action px-4 text-sm font-semibold text-fg-on-brand hover:bg-action-hover"
          >
            Jak to funguje
          </Link>
          <Link
            href="/priprava"
            className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-fg hover:bg-subtle"
          >
            Veřejná témata
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}
