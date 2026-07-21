"use server";

import {
  buildAnonymizedLearningExport,
  buildLearningAnalyticsDashboard,
  type AnonymizedLearningExport,
  type LearningAnalyticsDashboard,
} from "@/domain/learning/learning-analytics";
import { track } from "@/lib/analytics";
import { listLearningEvents } from "@/server/learning-analytics/store";
import { assertAdmin } from "@/server/admin-auth";

export async function getLearningAnalyticsDashboardAction(): Promise<LearningAnalyticsDashboard> {
  const gate = await assertAdmin();
  if (!gate.ok) {
    return buildLearningAnalyticsDashboard([]);
  }
  const events = await listLearningEvents();
  const dash = buildLearningAnalyticsDashboard(events);
  track("learning_analytics_dashboard_viewed", {
    events: dash.eventCount,
    learners: dash.questionsAnswered.activeLearners,
  });
  return dash;
}

export async function exportAnonymizedLearningDataAction(): Promise<
  | { ok: true; export: AnonymizedLearningExport }
  | { ok: false; error: string }
> {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return gate;
    const events = await listLearningEvents();
    const payload = buildAnonymizedLearningExport(events);
    track("learning_analytics_export", {
      events: payload.events.length,
    });
    return { ok: true, export: payload };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
