"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { BillingPlanDef } from "@/domain/billing/plans";
import type { ResolvedPlanPrice } from "@/domain/billing/pricing";
import { startCheckoutAction } from "@/server/actions/billing";
import { cn } from "@/lib/cn";

export type PublicPlanCard = BillingPlanDef & {
  resolved: ResolvedPlanPrice;
};

const featureLabelsCs: Record<string, string> = {
  personal_materials_read: "Čtení vlastních materiálů (vždy)",
  personal_materials_upload: "Nahrávání materiálů",
  daily_mission: "Denní mise",
  flashcards: "Kartičky",
  spaced_review: "Opakování",
  cermat_prep: "CERMAT trénink",
  mock_exam: "Zkouška nanečisto",
  oral_simulation: "Ústní simulace",
  zachran_me: "Zachraň mě",
  advanced_planner: "Pokročilý plánovač",
  ai_explanations: "AI vysvětlení",
  ai_voice_coach: "AI hlasový kouč",
  priority_support: "Prioritní podpora",
  exam_intensive_pack: "90denní intenzivní balíček",
};

export function PricingTable({
  plans,
  checkoutConfigured,
  currentPlanId,
}: {
  plans: PublicPlanCard[];
  checkoutConfigured: boolean;
  currentPlanId?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function checkout(planId: string) {
    setError(null);
    if (planId === "free") {
      router.push("/registrace");
      return;
    }
    startTransition(async () => {
      const res = await startCheckoutAction({ planId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = res.url;
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {error}
        </p>
      ) : null}

      {!checkoutConfigured ? (
        <p className="rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-400 backdrop-blur-sm">
          Plány a entitlements jsou v kódu. Stripe checkout se zapne po doplnění{" "}
          <code className="text-xs text-cyan-300">STRIPE_SECRET_KEY</code> a Price
          ID. Do té doby můžeš začít na FREE registrací.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const active = currentPlanId === plan.id;
          const highlighted = Boolean(plan.highlightCs);
          const isPrimaryCta = plan.id === "smart";

          const card = (
            <article
              className={cn(
                "flex h-full flex-col p-5 backdrop-blur-sm",
                highlighted
                  ? "rounded-[15px] border border-white/10 bg-slate-900/80"
                  : "rounded-2xl border border-white/10 bg-slate-900/50",
              )}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    {plan.nameCs}
                  </h2>
                  {plan.highlightCs ? (
                    <span className="inline-flex items-center rounded-full border border-violet-400/35 bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-violet-200">
                      {plan.highlightCs}
                    </span>
                  ) : null}
                  {active ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                      Tvůj plán
                    </span>
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed text-slate-400">
                  {plan.taglineCs}
                </p>
                <p className="text-2xl font-bold tracking-tight text-white">
                  {plan.resolved.price.labelCs}
                </p>
                {plan.resolved.isLaunchPrice && plan.price.amountCzk > 0 ? (
                  <p className="text-xs text-slate-500">
                    Standardně {plan.price.labelCs}
                  </p>
                ) : null}
              </div>

              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-300">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span>{featureLabelsCs[f] ?? f}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-xs text-slate-500">
                Max {plan.limits.maxMaterials} materiálů ·{" "}
                {plan.limits.mockExamsPerMonth === "unlimited"
                  ? "neomezené nanečisto"
                  : `${plan.limits.mockExamsPerMonth}× nanečisto / měsíc`}
              </p>

              <button
                type="button"
                className={cn(
                  "mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 disabled:cursor-not-allowed disabled:opacity-60",
                  isPrimaryCta || highlighted
                    ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 text-white shadow-[0_0_24px_-4px_rgba(99,102,241,0.65)] hover:brightness-110"
                    : "border border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10",
                )}
                disabled={pending || active}
                onClick={() => checkout(plan.id)}
              >
                {active ? "Aktivní" : plan.ctaCs}
              </button>
            </article>
          );

          if (highlighted) {
            return (
              <div
                key={plan.id}
                className="rounded-2xl bg-gradient-to-br from-sky-400 via-indigo-500 to-violet-500 p-px shadow-[0_0_30px_rgba(139,92,246,0.2)]"
              >
                {card}
              </div>
            );
          }

          return (
            <div key={plan.id} className="h-full">
              {card}
            </div>
          );
        })}
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Po zrušení nebo vypršení předplatného nepřijdeš o už nahrané osobní
        materiály — zůstávají ke čtení. Omezí se nová nahrávání a placené
        funkce.
      </p>
    </div>
  );
}
