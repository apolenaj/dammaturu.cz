import { randomUUID } from "node:crypto";
import {
  betaConfig,
  type BetaTelemetryEvent,
} from "@/domain/learning/beta-profile";
import {
  appendBetaTelemetryEvent,
  clearBetaTelemetryForTests,
} from "@/server/beta-telemetry/store";

/** Seed privacy-safe beta telemetry for PO dashboard. */
export async function seedBetaTelemetry(input?: {
  learnerKey?: string;
  reset?: boolean;
}): Promise<{
  learnerKey: string;
  eventCount: number;
}> {
  if (input?.reset) {
    await clearBetaTelemetryForTests();
  }

  const learnerKey = input?.learnerKey ?? "beta-demo-learner";
  const now = new Date("2026-07-21T12:00:00.000Z");

  const templates: Array<Omit<BetaTelemetryEvent, "id">> = [
    {
      learnerKey,
      kind: "mission_day",
      feature: "daily_mission",
      minutes: 27,
      topicSlug: "realismus",
      dateKey: "2026-07-20",
      at: "2026-07-20T18:00:00.000Z",
    },
    {
      learnerKey,
      kind: "mission_day",
      feature: "daily_mission",
      minutes: 27,
      topicSlug: "realismus",
      dateKey: "2026-07-19",
      at: "2026-07-19T18:00:00.000Z",
    },
    {
      learnerKey,
      kind: "session_completed",
      feature: "flashcards",
      minutes: 12,
      topicSlug: "romantismus",
      dateKey: "2026-07-18",
      at: "2026-07-18T17:00:00.000Z",
    },
    {
      learnerKey,
      kind: "session_completed",
      feature: "flashcards",
      minutes: 15,
      topicSlug: "romantismus",
      dateKey: "2026-07-17",
      at: "2026-07-17T17:00:00.000Z",
    },
    {
      learnerKey,
      kind: "session_completed",
      feature: "flashcards",
      minutes: 10,
      topicSlug: "romantismus",
      dateKey: "2026-07-16",
      at: "2026-07-16T17:00:00.000Z",
    },
    {
      learnerKey,
      kind: "question_answered",
      feature: "question_engine",
      correct: true,
      topicSlug: "realismus",
      dateKey: "2026-07-20",
      at: "2026-07-20T18:10:00.000Z",
    },
    {
      learnerKey,
      kind: "question_answered",
      feature: "question_engine",
      correct: false,
      topicSlug: "realismus",
      dateKey: "2026-07-20",
      at: "2026-07-20T18:12:00.000Z",
    },
    {
      learnerKey,
      kind: "question_answered",
      feature: "question_engine",
      correct: true,
      topicSlug: "jazyk",
      dateKey: "2026-07-19",
      at: "2026-07-19T18:10:00.000Z",
    },
    {
      learnerKey,
      kind: "drop_off",
      feature: "teach_it_back",
      dropOffAt: "/app/learn/nauc-zpatky/cjl-teach-back",
      dateKey: "2026-07-18",
      at: "2026-07-18T16:00:00.000Z",
    },
    {
      learnerKey,
      kind: "drop_off",
      feature: "teach_it_back",
      dropOffAt: "/app/learn/nauc-zpatky/cjl-teach-back",
      dateKey: "2026-07-15",
      at: "2026-07-15T16:00:00.000Z",
    },
    {
      learnerKey,
      kind: "feature_used",
      feature: "error_memory",
      errorType: "wrong_author",
      topicSlug: "autori-dila",
      dateKey: "2026-07-19",
      at: "2026-07-19T19:00:00.000Z",
    },
    {
      learnerKey,
      kind: "feature_used",
      feature: "error_memory",
      errorType: "wrong_author",
      topicSlug: "autori-dila",
      dateKey: "2026-07-18",
      at: "2026-07-18T19:00:00.000Z",
    },
    {
      learnerKey,
      kind: "feature_used",
      feature: "error_memory",
      errorType: "wrong_literary_period",
      topicSlug: "narodni-obrozeni",
      dateKey: "2026-07-17",
      at: "2026-07-17T19:00:00.000Z",
    },
    {
      learnerKey,
      kind: "feature_used",
      feature: "spaced_review",
      minutes: 8,
      topicSlug: "rozbory",
      dateKey: "2026-07-14",
      at: "2026-07-14T10:00:00.000Z",
    },
  ];

  void betaConfig;
  void now;
  let eventCount = 0;
  for (const t of templates) {
    await appendBetaTelemetryEvent({ ...t, id: randomUUID() });
    eventCount += 1;
  }

  return { learnerKey, eventCount };
}
