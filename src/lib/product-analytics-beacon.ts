"use client";

import type { ClientBeaconEventName } from "@/domain/product-analytics";

/**
 * Fire-and-forget product analytics beacon.
 * Only allowlisted events; never send free text / PII.
 */
export function trackProductBeacon(
  event: ClientBeaconEventName,
  extra?: { topicSlug?: string; featureId?: string },
): void {
  try {
    void fetch("/api/analytics/product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        topicSlug: extra?.topicSlug,
        featureId: extra?.featureId,
      }),
      keepalive: true,
    }).catch(() => {
      /* ignore beacon failures */
    });
  } catch {
    /* ignore */
  }
}
