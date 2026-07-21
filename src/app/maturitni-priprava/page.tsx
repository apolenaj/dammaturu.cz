import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/shell/MarketingShell";

export const metadata: Metadata = {
  title: "Maturitní příprava",
};

export default function MaturitniPripravaPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
          Maturitní příprava bez chaosu
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          DámMaturu.cz není sbírka materiálů. Je to systém, který ti řekne, co
          se učit, ověří to active recall, najde slabiny a ukáže readiness —
          jestli jsi opravdu připravená.
        </p>
        <ul className="mt-8 space-y-3 text-ink-muted">
          <li>Žádné halucinované fakty — obsah má provenance.</li>
          <li>Denní mise místo „vyber si z menu“.</li>
          <li>Mastery po znalostních jednotkách, ne dojem z čtení.</li>
        </ul>
        <Link
          href="/jak-to-funguje"
          className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Podrobný postup
        </Link>
      </div>
    </MarketingShell>
  );
}
