"use server";

import {
  betaConfig,
  buildAdminBetaDashboard,
  buildStudentBetaPulse,
  type AdminBetaDashboard,
  type StudentBetaPulse,
} from "@/domain/learning/beta-profile";
import { dateKeyFromDate } from "@/domain/learning/daily-dashboard";
import { track } from "@/lib/analytics";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";
import { getReadinessSnapshotForLearner } from "@/server/readiness/store";
import { getErrorBook } from "@/server/error-memory/store";
import {
  appendBetaTelemetryEvent,
  listBetaTelemetryEvents,
  sumMinutesForLearner,
} from "@/server/beta-telemetry/store";
import {
  buildNeglectedTopics,
  countCompletedMissionDays,
  lastSeenFromEvents,
  listLearnerRecords,
  resolveBetaEnrollment,
} from "@/server/beta-profile/helpers";

export async function getStudentBetaPulseAction(): Promise<{
  pulse: StudentBetaPulse | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { pulse: null, learnerId: null };
  const learner = await getLearner(learnerId);
  if (!learner) return { pulse: null, learnerId };

  const enrollment = resolveBetaEnrollment(learner);
  if (!enrollment) return { pulse: null, learnerId };

  const [readiness, minutesRaw, adherence] = await Promise.all([
    getReadinessSnapshotForLearner({ learnerId }),
    sumMinutesForLearner(learnerId),
    countCompletedMissionDays({
      learnerId,
      windowDays: betaConfig.adherenceWindowDays,
    }),
  ]);

  const minutesStudied =
    minutesRaw > 0
      ? minutesRaw
      : adherence.completed * Math.min(45, learner.profile.dailyMinutes);

  const pulse = buildStudentBetaPulse({
    enrollment,
    targetDate: learner.profile.targetDate || betaConfig.targetDate,
    units: readiness?.book.units ?? [],
    readiness: readiness?.snapshot ?? null,
    minutesStudied,
    planDaysCompleted: adherence.completed,
    planDaysExpected: adherence.expected,
  });

  return { pulse, learnerId };
}

export async function getAdminBetaDashboardAction(): Promise<AdminBetaDashboard> {
  const { assertAdmin } = await import("@/server/admin-auth");
  const gate = await assertAdmin();
  if (!gate.ok) {
    return buildAdminBetaDashboard({
      events: [],
      learnerKeys: [],
      masteryDeltaPct: null,
      neglectedTopics: [],
    });
  }
  const [events, learners] = await Promise.all([
    listBetaTelemetryEvents(),
    listLearnerRecords(),
  ]);

  const betaLearners = learners.filter((l) => resolveBetaEnrollment(l));
  const learnerKeys =
    betaLearners.length > 0
      ? betaLearners.map((l) => l.id)
      : [...new Set(events.map((e) => e.learnerKey))];

  // Mastery delta from first beta learner with readiness history
  let masteryDeltaPct: number | null = null;
  for (const l of betaLearners) {
    const snap = await getReadinessSnapshotForLearner({ learnerId: l.id });
    if (snap?.snapshot.weekDeltaPct != null) {
      masteryDeltaPct = snap.snapshot.weekDeltaPct;
      break;
    }
    const hist = snap?.book.weeklyHistory ?? [];
    if (hist.length >= 2) {
      masteryDeltaPct =
        Math.round(
          (hist[hist.length - 1]!.overallPct - hist[0]!.overallPct) * 10,
        ) / 10;
      break;
    }
  }

  // Merge error types from ErrorMemory (typed enums only — no free-text answers)
  const errorEvents = [...events];
  for (const l of betaLearners) {
    const book = await getErrorBook(l.id);
    if (!book) continue;
    for (const err of book.memories.slice(0, 40)) {
      errorEvents.push({
        id: err.id,
        learnerKey: l.id,
        kind: "feature_used",
        feature: "error_memory",
        errorType: err.errorType,
        topicSlug: err.knowledgeUnit.slug,
        dateKey: dateKeyFromDate(new Date(err.date)),
        at: err.date,
      });
    }
  }

  const todayKey = dateKeyFromDate(new Date());
  const lastSeen = lastSeenFromEvents(events);
  const topicSlugs = [
    ...new Set([
      ...events.map((e) => e.topicSlug).filter(Boolean) as string[],
      "romantismus",
      "realismus",
      "narodni-obrozeni",
      "rozbory",
      "jazyk",
    ]),
  ];
  const neglected = buildNeglectedTopics({
    topicSlugs,
    lastSeenBySlug: lastSeen,
    todayKey,
    neglectDays: betaConfig.neglectDays,
  });

  const dash = buildAdminBetaDashboard({
    events: errorEvents,
    learnerKeys,
    masteryDeltaPct,
    neglectedTopics: neglected,
  });

  track("beta_admin_dashboard_viewed", {
    sessions: dash.sessionsCompleted,
    learners: dash.learnerCount,
  });

  return dash;
}

/** Record privacy-safe beta telemetry (no free-text / PII). */
export async function recordBetaTelemetryAction(input: {
  kind: "session_completed" | "question_answered" | "feature_used" | "drop_off" | "mission_day";
  feature: string;
  topicSlug?: string;
  minutes?: number;
  correct?: boolean;
  dropOffAt?: string;
  errorType?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const learner = await getLearner(learnerId);
    if (!learner || !resolveBetaEnrollment(learner)) {
      return { ok: true }; // silently skip non-beta
    }
    const now = new Date();
    await appendBetaTelemetryEvent({
      learnerKey: learnerId,
      kind: input.kind,
      feature: input.feature,
      topicSlug: input.topicSlug,
      minutes: input.minutes,
      correct: input.correct,
      dropOffAt: input.dropOffAt,
      errorType: input.errorType,
      dateKey: dateKeyFromDate(now),
      at: now.toISOString(),
    });
    track("beta_telemetry_recorded", { kind: input.kind, feature: input.feature });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
