import type Stripe from "stripe";
import type { BillingPlanId } from "@/domain/billing/plans";
import { billingPlanIds } from "@/domain/billing/plans";
import type {
  BillingSubscription,
  BillingSubscriptionStatus,
} from "@/domain/billing/subscription";
import {
  findSubscriptionByStripeCustomerId,
  findSubscriptionByStripeSubscriptionId,
  getOrCreateBillingSubscription,
  saveBillingSubscription,
} from "@/server/billing/store";
import { getStripe } from "@/server/billing/stripe";
import { recordProductEvent } from "@/server/product-analytics/store";

function mapStripeStatus(
  status: Stripe.Subscription.Status,
): BillingSubscriptionStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "unpaid";
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    case "paused":
      return "expired";
    default:
      return "expired";
  }
}

function planFromMetadata(meta: Stripe.Metadata | null | undefined): BillingPlanId | null {
  const raw = meta?.plan_id;
  if (raw && (billingPlanIds as readonly string[]).includes(raw)) {
    return raw as BillingPlanId;
  }
  return null;
}

async function resolveLearnerSub(input: {
  customerId?: string | null;
  subscriptionId?: string | null;
  learnerIdMeta?: string | null;
}): Promise<BillingSubscription | null> {
  if (input.subscriptionId) {
    const bySub = await findSubscriptionByStripeSubscriptionId(
      input.subscriptionId,
    );
    if (bySub) return bySub;
  }
  if (input.customerId) {
    const byCust = await findSubscriptionByStripeCustomerId(input.customerId);
    if (byCust) return byCust;
  }
  if (input.learnerIdMeta) {
    return getOrCreateBillingSubscription(input.learnerIdMeta);
  }
  return null;
}

export async function handleStripeWebhookEvent(
  event: Stripe.Event,
): Promise<{ ok: true } | { ok: false; error: string }> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const learnerId =
        session.metadata?.learner_id || session.client_reference_id;
      if (!learnerId) return { ok: true };
      let sub = await getOrCreateBillingSubscription(learnerId);
      const planId =
        planFromMetadata(session.metadata) ??
        (sub.planId !== "free" ? sub.planId : "smart");
      sub = {
        ...sub,
        userId: session.metadata?.user_id ?? sub.userId,
        stripeCustomerId:
          typeof session.customer === "string"
            ? session.customer
            : sub.stripeCustomerId,
        stripeSubscriptionId:
          typeof session.subscription === "string"
            ? session.subscription
            : sub.stripeSubscriptionId,
        planId,
        status: "active",
        lastPaymentErrorCs: null,
        updatedAt: new Date().toISOString(),
      };
      await saveBillingSubscription(sub);
      if (planId !== "free") {
        await recordProductEvent({
          learnerKey: learnerId,
          event: "upgrade_completed",
          funnelStep: "upgrade",
          planId,
        });
      }
      return { ok: true };
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof stripeSub.customer === "string" ? stripeSub.customer : null;
      let sub = await resolveLearnerSub({
        customerId,
        subscriptionId: stripeSub.id,
        learnerIdMeta: stripeSub.metadata?.learner_id,
      });
      if (!sub) return { ok: true };

      const priceId = stripeSub.items.data[0]?.price?.id ?? null;
      const planId =
        planFromMetadata(stripeSub.metadata) ??
        planFromMetadata(stripeSub.items.data[0]?.price?.metadata) ??
        sub.planId;

      const status = mapStripeStatus(stripeSub.status);
      sub = {
        ...sub,
        stripeCustomerId: customerId ?? sub.stripeCustomerId,
        stripeSubscriptionId: stripeSub.id,
        stripePriceId: priceId,
        planId: status === "canceled" || status === "unpaid" ? sub.planId : planId,
        status:
          status === "canceled" && stripeSub.cancel_at_period_end
            ? "active"
            : status === "canceled"
              ? "expired"
              : status,
        currentPeriodEnd: stripeSub.current_period_end
          ? new Date(stripeSub.current_period_end * 1000).toISOString()
          : null,
        cancelAtPeriodEnd: Boolean(stripeSub.cancel_at_period_end),
        trialEndsAt: stripeSub.trial_end
          ? new Date(stripeSub.trial_end * 1000).toISOString()
          : null,
        lastPaymentErrorCs:
          status === "past_due"
            ? sub.lastPaymentErrorCs ?? "Platba se nepodařila — Stripe zkouší znovu."
            : null,
        updatedAt: new Date().toISOString(),
      };
      await saveBillingSubscription(sub);
      return { ok: true };
    }

    case "customer.subscription.deleted": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof stripeSub.customer === "string" ? stripeSub.customer : null;
      let sub = await resolveLearnerSub({
        customerId,
        subscriptionId: stripeSub.id,
        learnerIdMeta: stripeSub.metadata?.learner_id,
      });
      if (!sub) return { ok: true };
      sub = {
        ...sub,
        status: "expired",
        planId: "free",
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: stripeSub.id,
        updatedAt: new Date().toISOString(),
      };
      await saveBillingSubscription(sub);
      return { ok: true };
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : null;
      let sub = await resolveLearnerSub({
        customerId,
        subscriptionId:
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : null,
      });
      if (!sub) return { ok: true };
      sub = {
        ...sub,
        status: "past_due",
        lastPaymentErrorCs:
          "Platba selhala. Aktualizuj kartu v zákaznickém portálu — tvoje materiály zůstávají dostupné.",
        updatedAt: new Date().toISOString(),
      };
      await saveBillingSubscription(sub);
      return { ok: true };
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : null;
      let sub = await resolveLearnerSub({
        customerId,
        subscriptionId:
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : null,
      });
      if (!sub) return { ok: true };
      if (sub.status === "past_due" || sub.status === "unpaid") {
        sub = {
          ...sub,
          status: "active",
          lastPaymentErrorCs: null,
          updatedAt: new Date().toISOString(),
        };
        await saveBillingSubscription(sub);
      }
      return { ok: true };
    }

    default:
      return { ok: true };
  }
}

export async function constructStripeEvent(
  rawBody: string,
  signature: string,
): Promise<Stripe.Event> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    throw new Error("Stripe webhook není nakonfigurovaný.");
  }
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
