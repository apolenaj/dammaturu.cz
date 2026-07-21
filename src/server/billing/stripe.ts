import Stripe from "stripe";

/**
 * Stripe client — null when not configured (local/beta without keys).
 */

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  );
}

/** Checkout can run with secret only; portal + webhooks need full config. */
export function isStripeCheckoutConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return stripeSingleton;
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
