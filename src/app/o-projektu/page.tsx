import type { Metadata } from "next";
import { MarketingShell } from "@/components/shell/MarketingShell";

export const metadata: Metadata = {
  title: "O projektu",
};

export default function OProjektuPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
          O projektu
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          DámMaturu.cz vzniká jako škálovatelná vzdělávací platforma. První beta
          ověřuje kompletní learning loop na konkrétním ČJL corpusu — bez
          fake funkcí a bez AI jako hlavního positioningu.
        </p>
        <p className="mt-4 text-ink-muted">
          Promise je jednoduchý: víš, co se naučit, a víš, kdy jsi připraven.
        </p>
      </div>
    </MarketingShell>
  );
}
