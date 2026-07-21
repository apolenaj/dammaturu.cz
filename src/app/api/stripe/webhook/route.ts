import { NextResponse } from "next/server";
import {
  constructStripeEvent,
  handleStripeWebhookEvent,
} from "@/server/billing/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook — raw body required for signature verification.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  try {
    const event = await constructStripeEvent(rawBody, signature);
    const result = await handleStripeWebhookEvent(event);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe/webhook]", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
