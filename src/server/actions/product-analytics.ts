"use server";

import {
  buildAnonymizedProductExport,
  buildProductAnalyticsDashboard,
  type ProductAnalyticsDashboard,
} from "@/domain/product-analytics";
import { track } from "@/lib/analytics";
import { assertAdmin } from "@/server/admin-auth";
import {
  listProductEvents,
  listProductLearnerStates,
} from "@/server/product-analytics/store";

export async function getProductAnalyticsDashboardAction(): Promise<ProductAnalyticsDashboard> {
  const gate = await assertAdmin();
  if (!gate.ok) {
    return buildProductAnalyticsDashboard([], []);
  }
  const [events, states] = await Promise.all([
    listProductEvents(),
    listProductLearnerStates(),
  ]);
  const dash = buildProductAnalyticsDashboard(events, states);
  track("product_analytics_dashboard_viewed", {
    events: dash.eventCount,
    learners: dash.learnerCount,
  });
  return dash;
}

export async function exportAnonymizedProductAnalyticsAction(): Promise<
  | { ok: true; export: ReturnType<typeof buildAnonymizedProductExport> }
  | { ok: false; error: string }
> {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return gate;
    const [events, states] = await Promise.all([
      listProductEvents(),
      listProductLearnerStates(),
    ]);
    const payload = buildAnonymizedProductExport(events, states);
    track("product_analytics_export", { events: payload.events.length });
    return { ok: true, export: payload };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
