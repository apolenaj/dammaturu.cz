import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clientBeaconEventNames,
  funnelStepForEvent,
} from "@/domain/product-analytics";
import { recordProductEvent } from "@/server/product-analytics/store";
import {
  clientIpFromHeaders,
  rateLimit,
} from "@/server/security/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  event: z.enum(clientBeaconEventNames),
  topicSlug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9][a-z0-9_-]*$/i)
    .optional(),
  featureId: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9_-]*$/i)
    .optional(),
});

/**
 * Anonymous / guest product funnel beacon.
 * No free text. Optional opaque learner key from session cookies only.
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

  let learnerKey: string | null = null;
  try {
    const { getViewerSession } = await import("@/server/viewer-session");
    const viewer = await getViewerSession({ createGuestIfMissing: false });
    learnerKey = viewer?.learnerId ?? null;
  } catch {
    learnerKey = null;
  }

  const event =
    parsed.data.event === "homepage_viewed"
      ? ("homepage_view" as const)
      : parsed.data.event;

  await recordProductEvent({
    learnerKey,
    event,
    funnelStep: funnelStepForEvent(event),
    topicSlug: parsed.data.topicSlug,
    featureId: parsed.data.featureId,
  });

  return NextResponse.json({ ok: true });
}
