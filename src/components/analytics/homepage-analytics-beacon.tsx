"use client";

import { useEffect, useRef } from "react";
import { trackProductBeacon } from "@/lib/product-analytics-beacon";

/** Fire-once homepage funnel beacon — no PII. */
export function HomepageAnalyticsBeacon() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackProductBeacon("homepage_view");
  }, []);

  return null;
}
