import { NextResponse } from "next/server";
import { z } from "zod";
import { recordProductEvent } from "@/server/product-analytics/store";
import {
  clientIpFromHeaders,
  rateLimit,
} from "@/server/security/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  event: z.enum(["homepage_viewed"]),
});

/**
 * Anonymous product funnel beacon (homepage).
 * No cookies required; never accepts free text / PII.
 */
export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  const limited = rateLimit({
    key: `analytics:product:${ip}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await recordProductEvent({
    learnerKey: null,
    event: parsed.data.event,
    funnelStep: "homepage",
  });

  return NextResponse.json({ ok: true });
}
