"use client";

import { useEffect, useRef } from "react";

/** Fire-once homepage funnel beacon — no PII. */
export function HomepageAnalyticsBeacon() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void fetch("/api/analytics/product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "homepage_viewed" }),
      keepalive: true,
    }).catch(() => {
      // ignore beacon failures
    });
  }, []);

  return null;
}
