import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/shell/MarketingShell";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicMetadata({
  title: "O projektu",
  description:
    "DámMaturu.cz — studijní systém k maturitě z češtiny. Beta ověřuje learning loop na ČJL, bez fake funkcí.",
  path: "/o-projektu",
});

export default function OProjektuPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">
          O projektu
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-fg-secondary">
          DámMaturu.cz vzniká jako škálovatelná vzdělávací platforma. První beta
          ověřuje kompletní learning loop na češtině k maturitě — bez fake
          funkcí a bez AI jako hlavního positioningu.
        </p>
        <p className="mt-4 text-fg-secondary">
          Promise je jednoduchý: víš, co se naučit, a víš, co už umíš.
        </p>
        <p className="mt-8 text-body-sm text-fg-secondary">
          <Link href="/priprava" className="font-semibold text-action underline">
            Veřejná příprava
          </Link>
          {" · "}
          <Link href="/cenik" className="font-semibold text-action underline">
            Ceník
          </Link>
        </p>
      </div>
    </MarketingShell>
  );
}
