import type { BillingPlanId } from "@/domain/billing/plans";
import { resolvePlanPrice, trialDaysForPlan } from "@/domain/billing/pricing";
import type { BillingSubscription } from "@/domain/billing/subscription";
import {
  getOrCreateBillingSubscription,
  saveBillingSubscription,
} from "@/server/billing/store";
import { getStripe, siteUrl } from "@/server/billing/stripe";

export async function ensureStripeCustomer(input: {
  learnerId: string;
  userId: string;
  email: string | null;
}): Promise<{ customerId: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe není nakonfigurovaný." };

  let sub = await getOrCreateBillingSubscription(input.learnerId);
  if (sub.stripeCustomerId) {
    return { customerId: sub.stripeCustomerId };
  }

  const customer = await stripe.customers.create({
    email: input.email ?? undefined,
    metadata: {
      learner_id: input.learnerId,
      user_id: input.userId,
    },
  });

  sub = {
    ...sub,
    userId: input.userId,
    stripeCustomerId: customer.id,
    updatedAt: new Date().toISOString(),
  };
  await saveBillingSubscription(sub);
  return { customerId: customer.id };
}

export async function createCheckoutSession(input: {
  learnerId: string;
  userId: string;
  email: string | null;
  planId: Exclude<BillingPlanId, "free">;
}): Promise<{ url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) {
    return {
      error:
        "Platby zatím nejsou zapojené (chybí STRIPE_SECRET_KEY). Plány už jsou v kódu — klíč doplň v env.",
    };
  }

  const resolved = resolvePlanPrice(input.planId);
  if (!resolved.stripePriceId) {
    return {
      error: `Chybí Stripe Price ID pro ${input.planId} (STRIPE_PRICE_*).`,
    };
  }

  const customer = await ensureStripeCustomer(input);
  if ("error" in customer) return customer;

  const trial = trialDaysForPlan(input.planId);
  const mode =
    resolved.price.interval === "month" || resolved.price.interval === "day"
      ? "subscription"
      : "payment";

  const session = await stripe.checkout.sessions.create({
    mode,
    customer: customer.customerId,
    client_reference_id: input.learnerId,
    metadata: {
      learner_id: input.learnerId,
      user_id: input.userId,
      plan_id: input.planId,
    },
    line_items: [{ price: resolved.stripePriceId, quantity: 1 }],
    success_url: `${siteUrl()}/app/profile?billing=success`,
    cancel_url: `${siteUrl()}/cenik?billing=cancel`,
    allow_promotion_codes: true,
    subscription_data:
      mode === "subscription"
        ? {
            trial_period_days: trial > 0 ? trial : undefined,
            metadata: {
              learner_id: input.learnerId,
              plan_id: input.planId,
            },
          }
        : undefined,
  });

  if (!session.url) return { error: "Checkout session bez URL." };
  return { url: session.url };
}

export async function createBillingPortalSession(input: {
  learnerId: string;
}): Promise<{ url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe není nakonfigurovaný." };

  const sub = await getOrCreateBillingSubscription(input.learnerId);
  if (!sub.stripeCustomerId) {
    return { error: "Nejdřív zvol plán (ještě nemáš Stripe zákazníka)." };
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${siteUrl()}/app/profile?billing=portal`,
  });
  return { url: portal.url };
}

export function applyLocalSubscriptionPatch(
  prev: BillingSubscription,
  patch: Partial<BillingSubscription>,
): BillingSubscription {
  return {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}
