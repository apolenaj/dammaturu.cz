import {
  BILLING_PLANS,
  type BillingPlanId,
  type PlanPrice,
} from "@/domain/billing/plans";

/**
 * Resolve display + Stripe price for a plan.
 * SMART launch price (99 Kč) via BILLING_SMART_LAUNCH_PRICE_CZK or flag.
 */

export type ResolvedPlanPrice = {
  planId: BillingPlanId;
  price: PlanPrice;
  isLaunchPrice: boolean;
  /** Env Stripe Price id when set. */
  stripePriceId: string | null;
};

function envFlag(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function isSmartLaunchPricingEnabled(): boolean {
  const flag = envFlag("BILLING_SMART_LAUNCH_ENABLED");
  if (flag === "0" || flag === "false") return false;
  if (flag === "1" || flag === "true") return true;
  // Default: launch price on until explicitly disabled
  return Boolean(BILLING_PLANS.smart.launchPrice);
}

export function resolvePlanPrice(planId: BillingPlanId): ResolvedPlanPrice {
  const def = BILLING_PLANS[planId];
  const useLaunch =
    planId === "smart" &&
    Boolean(def.launchPrice) &&
    isSmartLaunchPricingEnabled();

  let price = useLaunch && def.launchPrice ? def.launchPrice : def.price;

  if (planId === "smart" && useLaunch) {
    const overrideCzk = envFlag("BILLING_SMART_LAUNCH_PRICE_CZK");
    if (overrideCzk && /^\d+$/.test(overrideCzk)) {
      const czk = Number(overrideCzk);
      price = {
        amountCzk: czk,
        unitAmountHalere: czk * 100,
        currency: "czk",
        interval: "month",
        labelCs: `${czk} Kč / měsíc (launch)`,
      };
    }
  }

  const stripePriceId =
    envFlag(
      planId === "smart" && useLaunch
        ? "STRIPE_PRICE_SMART_LAUNCH"
        : stripePriceEnvKey(planId),
    ) ?? envFlag(stripePriceEnvKey(planId)) ?? null;

  return {
    planId,
    price,
    isLaunchPrice: useLaunch,
    stripePriceId,
  };
}

function stripePriceEnvKey(planId: BillingPlanId): string {
  switch (planId) {
    case "smart":
      return "STRIPE_PRICE_SMART";
    case "ai_pro":
      return "STRIPE_PRICE_AI_PRO";
    case "maturita_max":
      return "STRIPE_PRICE_MATURITA_MAX";
    default:
      return "STRIPE_PRICE_FREE";
  }
}

export function listPublicPricing(): ResolvedPlanPrice[] {
  return (["free", "smart", "ai_pro", "maturita_max"] as BillingPlanId[]).map(
    resolvePlanPrice,
  );
}

export function trialDaysForPlan(planId: BillingPlanId): number {
  if (planId === "free") return 0;
  const raw = envFlag("BILLING_TRIAL_DAYS");
  if (raw && /^\d+$/.test(raw)) return Math.min(30, Number(raw));
  // Default trial for paid monthly plans
  if (planId === "maturita_max") return 0;
  return 7;
}
