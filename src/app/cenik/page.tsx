import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/marketing/landing/landing-nav";
import { PricingTable } from "@/components/billing/pricing-table";
import { getPublicPricingAction } from "@/server/actions/billing";
import { getAuthIdentity } from "@/server/learner-session";
import { getLearnerEntitlements } from "@/server/billing/entitlements";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicMetadata({
  title: "Ceník",
  description:
    "DámMaturu beta je teď zdarma. Placené plány zveřejníme, až bude platba opravdu zapnutá.",
  path: "/cenik",
});

export default async function CenikPage() {
  const { plans, checkoutConfigured } = await getPublicPricingAction();
  const identity = await getAuthIdentity();
  const currentPlanId = identity
    ? (await getLearnerEntitlements(identity.learnerId)).planId
    : null;

  return (
    <div className="min-h-dvh overflow-x-clip bg-[#070913] font-sans text-white antialiased">
      <LandingNav />
      <main id="main-content" className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_60%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <p className="inline-flex items-center rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
            Ceník
          </p>
          {checkoutConfigured ? (
            <>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Plány DámMaturu
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
                FREE zdarma. SMART, AI PRO a MATURITA MAX podle entitlements v
                kódu. Po vypršení nepřijdeš o nahrané materiály.
              </p>
              <div className="mt-10">
                <PricingTable
                  plans={plans}
                  checkoutConfigured={checkoutConfigured}
                  currentPlanId={currentPlanId}
                />
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Beta je zdarma
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
                Placené plány zatím neprodáváme — checkout není zapnutý. Učíš se z
                dostupného obsahu češtiny k maturitě bez fiktivních cen. Až bude
                platba opravdu aktivní, napíšeme to tady na rovinu.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/app/learn"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 px-6 text-sm font-semibold text-white shadow-[0_0_28px_-6px_rgba(99,102,241,0.7)] transition hover:brightness-110"
                >
                  Začít se učit zdarma
                </Link>
                <Link
                  href="/priprava"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
                >
                  Prohlédnout témata
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <footer className="border-t border-white/5 px-4 py-8 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} DámMaturu.cz
      </footer>
    </div>
  );
}
