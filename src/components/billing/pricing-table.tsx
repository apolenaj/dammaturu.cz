"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { BillingPlanDef } from "@/domain/billing/plans";
import type { ResolvedPlanPrice } from "@/domain/billing/pricing";
import { startCheckoutAction } from "@/server/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
          className="rounded-md border border-danger/30 bg-danger-soft/30 px-4 py-3 text-body-sm text-fg"
        >
          {error}
        </p>
      ) : null}

      {!checkoutConfigured ? (
        <p className="rounded-xl border border-border bg-subtle/50 px-4 py-3 text-body-sm text-fg-secondary">
          Plány a entitlements jsou v kódu. Stripe checkout se zapne po doplnění{" "}
          <code className="text-caption">STRIPE_SECRET_KEY</code> a Price ID.
          Do té doby můžeš začít na FREE registrací.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const active = currentPlanId === plan.id;
          return (
            <article
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border bg-surface p-5 shadow-xs",
                plan.highlightCs
                  ? "border-action/40 ring-1 ring-action/20"
                  : "border-border",
              )}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-title-md text-fg">
                    {plan.nameCs}
                  </h2>
                  {plan.highlightCs ? (
                    <Badge tone="brand">{plan.highlightCs}</Badge>
                  ) : null}
                  {active ? <Badge tone="success">Tvůj plán</Badge> : null}
                </div>
                <p className="text-body-sm text-fg-secondary">{plan.taglineCs}</p>
                <p className="font-display text-2xl text-fg">
                  {plan.resolved.price.labelCs}
                </p>
                {plan.resolved.isLaunchPrice && plan.price.amountCzk > 0 ? (
                  <p className="text-caption text-fg-muted">
                    Standardně {plan.price.labelCs}
                  </p>
                ) : null}
              </div>

              <ul className="mt-4 flex-1 space-y-1.5 text-body-sm text-fg-secondary">
                {plan.features.map((f) => (
                  <li key={f}>· {featureLabelsCs[f] ?? f}</li>
                ))}
              </ul>

              <p className="mt-3 text-caption text-fg-muted">
                Max {plan.limits.maxMaterials} materiálů ·{" "}
                {plan.limits.mockExamsPerMonth === "unlimited"
                  ? "neomezené nanečisto"
                  : `${plan.limits.mockExamsPerMonth}× nanečisto / měsíc`}
              </p>

              <Button
                type="button"
                className="mt-4 min-h-12 w-full"
                variant={plan.id === "smart" ? "primary" : "outline"}
                disabled={pending || active}
                onClick={() => checkout(plan.id)}
              >
                {active ? "Aktivní" : plan.ctaCs}
              </Button>
            </article>
          );
        })}
      </div>

      <p className="text-caption text-fg-muted">
        Po zrušení nebo vypršení předplatného nepřijdeš o už nahrané osobní
        materiály — zůstávají ke čtení. Omezí se nová nahrávání a placené
        funkce.
      </p>
    </div>
  );
}
