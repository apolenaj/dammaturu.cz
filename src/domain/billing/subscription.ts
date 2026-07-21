import { z } from "zod";
import {
  billingPlanIds,
  comparePlans,
  type BillingPlanId,
} from "@/domain/billing/plans";

/**
 * Subscription lifecycle (D-061).
 * Stripe is source of truth when configured; local store mirrors it.
 */

export const billingSubscriptionStatuses = [
  "none",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "expired",
  "incomplete",
] as const;

export type BillingSubscriptionStatus =
  (typeof billingSubscriptionStatuses)[number];

export const billingSubscriptionSchema = z.object({
  learnerId: z.string().min(1).max(64),
  userId: z.string().min(1).max(64).nullable().default(null),
  planId: z.enum(billingPlanIds).default("free"),
  status: z.enum(billingSubscriptionStatuses).default("none"),
  stripeCustomerId: z.string().min(1).max(120).nullable().default(null),
  stripeSubscriptionId: z.string().min(1).max(120).nullable().default(null),
  stripePriceId: z.string().min(1).max(120).nullable().default(null),
  /** Current period end (ISO). */
  currentPeriodEnd: z.string().datetime().nullable().default(null),
  cancelAtPeriodEnd: z.boolean().default(false),
  trialEndsAt: z.string().datetime().nullable().default(null),
  /** Last invoice failure message (safe, no PAN). */
  lastPaymentErrorCs: z.string().max(400).nullable().default(null),
  /** Manual / beta grants (bypass Stripe for testing). */
  manualGrant: z
    .object({
      planId: z.enum(billingPlanIds),
      reasonCs: z.string().max(200),
      expiresAt: z.string().datetime().nullable(),
    })
    .nullable()
    .default(null),
  updatedAt: z.string().datetime(),
});

export type BillingSubscription = z.infer<typeof billingSubscriptionSchema>;

export function emptySubscription(
  learnerId: string,
  nowIso: string,
): BillingSubscription {
  return {
    learnerId,
    userId: null,
    planId: "free",
    status: "none",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    trialEndsAt: null,
    lastPaymentErrorCs: null,
    manualGrant: null,
    updatedAt: nowIso,
  };
}

export function parseBillingSubscription(raw: unknown): BillingSubscription {
  return billingSubscriptionSchema.parse(raw);
}

/** Statuses that keep paid entitlements. */
export const entitledStatuses: readonly BillingSubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due", // grace — still entitled while Stripe retries
];

export function isSubscriptionEntitled(
  sub: BillingSubscription | null,
): boolean {
  if (!sub) return false;
  if (sub.manualGrant) {
    if (!sub.manualGrant.expiresAt) return true;
    return new Date(sub.manualGrant.expiresAt).getTime() > Date.now();
  }
  if (sub.planId === "free" || sub.status === "none") return true; // free always "entitled" to free
  return entitledStatuses.includes(sub.status);
}

export function resolvePlanFromSubscription(
  sub: BillingSubscription | null,
): BillingPlanId {
  if (!sub) return "free";
  if (sub.manualGrant) {
    if (
      !sub.manualGrant.expiresAt ||
      new Date(sub.manualGrant.expiresAt).getTime() > Date.now()
    ) {
      return sub.manualGrant.planId;
    }
  }
  if (sub.planId === "free") return "free";
  if (entitledStatuses.includes(sub.status)) return sub.planId;
  // canceled / unpaid / expired / incomplete → FREE
  return "free";
}

export function subscriptionStatusLabelCs(
  status: BillingSubscriptionStatus,
): string {
  switch (status) {
    case "none":
      return "Bez předplatného";
    case "trialing":
      return "Zkušební období";
    case "active":
      return "Aktivní";
    case "past_due":
      return "Neúspěšná platba — zkoušíme znovu";
    case "canceled":
      return "Zrušeno";
    case "unpaid":
      return "Nezaplaceno";
    case "expired":
      return "Vypršelo";
    case "incomplete":
      return "Nedokončený checkout";
    default:
      return status;
  }
}

export type BillingChangeKind =
  | "upgrade"
  | "downgrade"
  | "cancel"
  | "reactivate"
  | "same";

export function classifyPlanChange(
  from: BillingPlanId,
  to: BillingPlanId,
): BillingChangeKind {
  if (from === to) return "same";
  if (to === "free") return "cancel";
  if (from === "free") return "upgrade";
  const diff = comparePlans(to, from);
  if (diff > 0) return "upgrade";
  if (diff < 0) return "downgrade";
  return "same";
}
