"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import {
  billingPlanIds,
  BILLING_PLANS,
  type BillingPlanId,
} from "@/domain/billing/plans";
import { listPublicPricing, resolvePlanPrice } from "@/domain/billing/pricing";
import {
  classifyPlanChange,
  subscriptionStatusLabelCs,
} from "@/domain/billing/subscription";
import {
  createBillingPortalSession,
  createCheckoutSession,
} from "@/server/billing/checkout";
import { getLearnerEntitlements } from "@/server/billing/entitlements";
import {
  isStripeCheckoutConfigured,
  isStripeConfigured,
} from "@/server/billing/stripe";
import {
  getOrCreateBillingSubscription,
  saveBillingSubscription,
} from "@/server/billing/store";
import { getAuthIdentity } from "@/server/learner-session";

export type BillingOverview = {
  configured: boolean;
  checkoutConfigured: boolean;
  planId: BillingPlanId;
  planNameCs: string;
  statusCs: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  lastPaymentErrorCs: string | null;
  features: string[];
  limits: (typeof BILLING_PLANS)[BillingPlanId]["limits"];
  pricing: ReturnType<typeof listPublicPricing>;
  personalDataNoteCs: string;
};

export async function getBillingOverviewAction(): Promise<BillingOverview | null> {
  const identity = await getAuthIdentity();
  if (!identity) return null;

  const { subscription, planId, features, limits } =
    await getLearnerEntitlements(identity.learnerId);

  return {
    configured: isStripeConfigured(),
    checkoutConfigured: isStripeCheckoutConfigured(),
    planId,
    planNameCs: BILLING_PLANS[planId].nameCs,
    status: subscription.status,
    statusCs: subscriptionStatusLabelCs(subscription.status),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialEndsAt: subscription.trialEndsAt,
    lastPaymentErrorCs: subscription.lastPaymentErrorCs,
    features: [...features],
    limits,
    pricing: listPublicPricing(),
    personalDataNoteCs:
      "Tvoje nahrané materiály zůstávají vždy čitelné — i po vypršení předplatného. Omezíme jen nové nahrávání a placené funkce.",
  };
}

export async function startCheckoutAction(input: {
  planId: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const identity = await getAuthIdentity();
  if (!identity) return { ok: false, error: "Nejdřív se přihlas." };

  if (!(billingPlanIds as readonly string[]).includes(input.planId)) {
    return { ok: false, error: "Neznámý plán." };
  }
  const planId = input.planId as BillingPlanId;
  if (planId === "free") {
    return { ok: false, error: "FREE nevyžaduje platbu." };
  }

  const current = await getLearnerEntitlements(identity.learnerId);
  const change = classifyPlanChange(current.planId, planId);
  track("billing_checkout_started", { planId, change });
  const { recordProductEvent } = await import(
    "@/server/product-analytics/store"
  );
  await recordProductEvent({
    learnerKey: identity.learnerId,
    event: "upgrade_started",
    planId,
  });

  const result = await createCheckoutSession({
    learnerId: identity.learnerId,
    userId: identity.userId,
    email: identity.email,
    planId,
  });
  if ("error" in result) return { ok: false, error: result.error };
  return { ok: true, url: result.url };
}

export async function openBillingPortalAction(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const identity = await getAuthIdentity();
  if (!identity) return { ok: false, error: "Nejdřív se přihlas." };

  track("billing_portal_opened", {});
  const result = await createBillingPortalSession({
    learnerId: identity.learnerId,
  });
  if ("error" in result) return { ok: false, error: result.error };
  return { ok: true, url: result.url };
}

/**
 * Dev/beta: grant a plan without Stripe (never in production without ADMIN).
 */
export async function grantPlanForTestingAction(input: {
  planId: string;
  days?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "Test grant v produkci není povolen." };
  }
  const identity = await getAuthIdentity();
  if (!identity) return { ok: false, error: "Nejdřív se přihlas." };
  if (!(billingPlanIds as readonly string[]).includes(input.planId)) {
    return { ok: false, error: "Neznámý plán." };
  }
  const planId = input.planId as BillingPlanId;
  const days = Math.min(90, Math.max(1, input.days ?? 30));
  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  let sub = await getOrCreateBillingSubscription(identity.learnerId);
  sub = {
    ...sub,
    userId: identity.userId,
    planId,
    status: planId === "free" ? "none" : "active",
    manualGrant:
      planId === "free"
        ? null
        : {
            planId,
            reasonCs: "dev grant",
            expiresAt: expires.toISOString(),
          },
    updatedAt: new Date().toISOString(),
  };
  await saveBillingSubscription(sub);
  if (planId !== "free") {
    const { recordProductEvent } = await import(
      "@/server/product-analytics/store"
    );
    await recordProductEvent({
      learnerKey: identity.learnerId,
      event: "upgrade_completed",
      funnelStep: "upgrade",
      planId,
    });
  }
  revalidatePath("/app/profile");
  revalidatePath("/cenik");
  return { ok: true };
}

export async function getPublicPricingAction() {
  return {
    plans: billingPlanIds.map((id) => ({
      ...BILLING_PLANS[id],
      resolved: resolvePlanPrice(id),
    })),
    checkoutConfigured: isStripeCheckoutConfigured(),
  };
}
