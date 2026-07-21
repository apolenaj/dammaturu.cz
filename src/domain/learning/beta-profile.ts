import { z } from "zod";
import { BETA_TARGET_DATE } from "@/domain/onboarding/schema";
import { errorTypeLabelsCs, type ErrorType } from "@/domain/learning/error-memory";
import type { ReadinessSnapshot, ReadinessUnit } from "@/domain/learning/readiness";

/**
 * Private BETA profile (D-039).
 * One real learner → verify full learning loop.
 * Telemetry is product-improvement oriented; no sensitive PII we don't need.
 */

export const BETA_COHORT_ID = "cjl-private-aug-2026" as const;

export const betaConfig = {
  cohortId: BETA_COHORT_ID,
  targetDate: BETA_TARGET_DATE,
  /** Days looked back for plan adherence. */
  adherenceWindowDays: 14,
  /** Topic considered neglected if no activity this many days. */
  neglectDays: 7,
} as const;

/** Explicit allowlist — what we may store in beta telemetry. */
export const BETA_TELEMETRY_ALLOWED = [
  "opaque learner id",
  "feature / route id",
  "topic slug",
  "session minutes",
  "question correct/incorrect (boolean)",
  "error type enum",
  "drop-off step / route",
  "dateKey + timestamp",
] as const;

/** Explicit denylist — never store in beta telemetry. */
export const BETA_TELEMETRY_DENIED = [
  "email / phone",
  "full school name / address",
  "free-text student answers",
  "IP / device fingerprint",
  "payment data",
  "photos / voice",
  "exact GPS",
] as const;

export const betaEnrollmentSchema = z.object({
  mode: z.literal(true),
  cohortId: z.string().min(1).max(64),
  enrolledAt: z.string().datetime(),
});

export type BetaEnrollment = z.infer<typeof betaEnrollmentSchema>;

export const betaTelemetryKinds = [
  "session_completed",
  "question_answered",
  "feature_used",
  "drop_off",
  "mission_day",
] as const;

export type BetaTelemetryKind = (typeof betaTelemetryKinds)[number];

export const betaTelemetryEventSchema = z.object({
  id: z.string().uuid(),
  /** Opaque learner key — never displayName / email. */
  learnerKey: z.string().min(1).max(64),
  kind: z.enum(betaTelemetryKinds),
  /** Product surface, e.g. daily_mission, flashcards, question_engine. */
  feature: z.string().min(1).max(80),
  topicSlug: z.string().min(1).max(120).optional(),
  minutes: z.number().int().min(0).max(480).optional(),
  correct: z.boolean().optional(),
  /** Route or step where learner left (drop-off). */
  dropOffAt: z.string().min(1).max(160).optional(),
  errorType: z.string().min(1).max(64).optional(),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  at: z.string().datetime(),
});

export type BetaTelemetryEvent = z.infer<typeof betaTelemetryEventSchema>;

export function isBetaTargetDate(targetDate: string): boolean {
  return targetDate === betaConfig.targetDate;
}

export function createBetaEnrollment(nowIso: string): BetaEnrollment {
  return {
    mode: true,
    cohortId: betaConfig.cohortId,
    enrolledAt: nowIso,
  };
}

export function daysRemainingToTarget(
  targetDate: string,
  now: Date = new Date(),
): number {
  const target = new Date(`${targetDate}T12:00:00`);
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  return Math.max(
    0,
    Math.ceil((target.getTime() - today.getTime()) / 86_400_000),
  );
}

export function formatTargetDateCs(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d}. ${m}. ${y}`;
}

/** Coverage = share of KU with any real evidence (seen). */
export function computeCoveragePct(units: ReadinessUnit[]): number {
  if (units.length === 0) return 0;
  const seen = units.filter(
    (u) => u.state.evidenceCount > 0 || u.state.band !== "not_seen",
  ).length;
  return Math.round((100 * seen) / units.length);
}

export type StudentBetaPulse = {
  active: true;
  cohortId: string;
  targetDate: string;
  targetDateLabelCs: string;
  daysRemaining: number;
  coveragePct: number;
  masteryPct: number;
  minutesStudied: number;
  weakLabelsCs: string[];
  planAdherencePct: number;
  planAdherenceLabelCs: string;
  noteCs: string;
};

export function buildStudentBetaPulse(input: {
  enrollment: BetaEnrollment;
  targetDate: string;
  units: ReadinessUnit[];
  readiness: ReadinessSnapshot | null;
  minutesStudied: number;
  /** Completed mission days in window / expected study days. */
  planDaysCompleted: number;
  planDaysExpected: number;
  now?: Date;
}): StudentBetaPulse {
  const now = input.now ?? new Date();
  const daysRemaining = daysRemainingToTarget(input.targetDate, now);
  const coveragePct = computeCoveragePct(input.units);
  const masteryPct = input.readiness?.overallPct ?? 0;
  const weakLabelsCs =
    input.readiness?.weakAreas.slice(0, 3).map((w) => w.labelCs) ?? [];
  const expected = Math.max(1, input.planDaysExpected);
  const planAdherencePct = Math.min(
    100,
    Math.round((100 * input.planDaysCompleted) / expected),
  );

  let planAdherenceLabelCs: string;
  if (planAdherencePct >= 85) planAdherenceLabelCs = "Plán držíš výborně";
  else if (planAdherencePct >= 60) planAdherenceLabelCs = "Plán držíš solidně";
  else if (planAdherencePct >= 35) planAdherenceLabelCs = "Plán občas ujíždí";
  else planAdherenceLabelCs = "Plán potřebuje restart";

  return {
    active: true,
    cohortId: input.enrollment.cohortId,
    targetDate: input.targetDate,
    targetDateLabelCs: formatTargetDateCs(input.targetDate),
    daysRemaining,
    coveragePct,
    masteryPct,
    minutesStudied: Math.max(0, input.minutesStudied),
    weakLabelsCs,
    planAdherencePct,
    planAdherenceLabelCs,
    noteCs:
      "Private beta — sledujeme jen učení a produktové signály, ne citlivé údaje.",
  };
}

export type FeatureUsageRow = {
  feature: string;
  sessions: number;
  minutes: number;
};

export type DropOffRow = {
  dropOffAt: string;
  count: number;
};

export type CommonErrorRow = {
  errorType: string;
  labelCs: string;
  count: number;
};

export type NeglectedTopicRow = {
  topicSlug: string;
  lastSeenDateKey: string | null;
  daysSince: number | null;
};

export type ProductInsight = {
  id: string;
  severity: "info" | "watch" | "act";
  titleCs: string;
  bodyCs: string;
};

export type AdminBetaDashboard = {
  cohortId: string;
  targetDate: string;
  targetDateLabelCs: string;
  daysRemaining: number;
  learnerCount: number;
  /** Opaque keys only. */
  learnerKeys: string[];
  sessionsCompleted: number;
  minutesStudied: number;
  questionsAnswered: number;
  accuracyPct: number | null;
  masteryDeltaPct: number | null;
  topicsNeglected: NeglectedTopicRow[];
  dropOffPoints: DropOffRow[];
  mostCommonErrors: CommonErrorRow[];
  featureUsage: FeatureUsageRow[];
  insights: ProductInsight[];
  privacyNoteCs: string;
  computedAt: string;
};

function countBy<T>(items: T[], keyFn: (x: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const item of items) {
    const k = keyFn(item);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export function buildAdminBetaDashboard(input: {
  events: BetaTelemetryEvent[];
  learnerKeys: string[];
  /** Latest mastery − earliest weekly (or null). */
  masteryDeltaPct: number | null;
  neglectedTopics: NeglectedTopicRow[];
  now?: Date;
}): AdminBetaDashboard {
  const now = input.now ?? new Date();
  const events = input.events;
  const sessionsCompleted = events.filter(
    (e) => e.kind === "session_completed" || e.kind === "mission_day",
  ).length;
  const minutesStudied = events.reduce((s, e) => s + (e.minutes ?? 0), 0);
  const questions = events.filter((e) => e.kind === "question_answered");
  const questionsAnswered = questions.length;
  const answeredWithFlag = questions.filter((e) => e.correct != null);
  const accuracyPct =
    answeredWithFlag.length === 0
      ? null
      : Math.round(
          (100 * answeredWithFlag.filter((e) => e.correct).length) /
            answeredWithFlag.length,
        );

  const featureMap = new Map<string, { sessions: number; minutes: number }>();
  for (const e of events) {
    const row = featureMap.get(e.feature) ?? { sessions: 0, minutes: 0 };
    if (e.kind === "session_completed" || e.kind === "feature_used" || e.kind === "mission_day") {
      row.sessions += 1;
    }
    row.minutes += e.minutes ?? 0;
    featureMap.set(e.feature, row);
  }
  const featureUsage: FeatureUsageRow[] = [...featureMap.entries()]
    .map(([feature, v]) => ({ feature, ...v }))
    .sort((a, b) => b.sessions - a.sessions || b.minutes - a.minutes);

  const dropCounts = countBy(
    events.filter((e) => e.kind === "drop_off" && e.dropOffAt),
    (e) => e.dropOffAt!,
  );
  const dropOffPoints: DropOffRow[] = [...dropCounts.entries()]
    .map(([dropOffAt, count]) => ({ dropOffAt, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const errorCounts = countBy(
    events.filter((e) => e.errorType),
    (e) => e.errorType!,
  );
  const mostCommonErrors: CommonErrorRow[] = [...errorCounts.entries()]
    .map(([errorType, count]) => ({
      errorType,
      labelCs:
        errorTypeLabelsCs[errorType as ErrorType] ?? errorType.replace(/_/g, " "),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const insights = buildProductInsights({
    sessionsCompleted,
    minutesStudied,
    accuracyPct,
    masteryDeltaPct: input.masteryDeltaPct,
    topicsNeglected: input.neglectedTopics,
    dropOffPoints,
    mostCommonErrors,
    featureUsage,
  });

  return {
    cohortId: betaConfig.cohortId,
    targetDate: betaConfig.targetDate,
    targetDateLabelCs: formatTargetDateCs(betaConfig.targetDate),
    daysRemaining: daysRemainingToTarget(betaConfig.targetDate, now),
    learnerCount: input.learnerKeys.length,
    learnerKeys: input.learnerKeys,
    sessionsCompleted,
    minutesStudied,
    questionsAnswered,
    accuracyPct,
    masteryDeltaPct: input.masteryDeltaPct,
    topicsNeglected: input.neglectedTopics.slice(0, 10),
    dropOffPoints,
    mostCommonErrors,
    featureUsage: featureUsage.slice(0, 12),
    insights,
    privacyNoteCs:
      "Bez e-mailu, volných odpovědí a zařízení. Jen signály, které pomáhají vylepšit learning loop.",
    computedAt: now.toISOString(),
  };
}

export function buildProductInsights(input: {
  sessionsCompleted: number;
  minutesStudied: number;
  accuracyPct: number | null;
  masteryDeltaPct: number | null;
  topicsNeglected: NeglectedTopicRow[];
  dropOffPoints: DropOffRow[];
  mostCommonErrors: CommonErrorRow[];
  featureUsage: FeatureUsageRow[];
}): ProductInsight[] {
  const out: ProductInsight[] = [];

  if (input.sessionsCompleted < 3) {
    out.push({
      id: "activation",
      severity: "act",
      titleCs: "Málo dokončených sessions",
      bodyCs:
        "Learning loop se ještě neověřil end-to-end. Zkontroluj onboarding → první misi → review.",
    });
  }

  if (input.masteryDeltaPct != null && input.masteryDeltaPct < 1) {
    out.push({
      id: "mastery-flat",
      severity: "watch",
      titleCs: "Mastery skoro neroste",
      bodyCs:
        "Čas učením možná nejde do evidence. Ověř grading → mastery apply a denní mise.",
    });
  } else if (input.masteryDeltaPct != null && input.masteryDeltaPct >= 5) {
    out.push({
      id: "mastery-up",
      severity: "info",
      titleCs: "Mastery roste",
      bodyCs: `Delta ${input.masteryDeltaPct > 0 ? "+" : ""}${input.masteryDeltaPct} p. b. — loop dává měřitelný pokrok.`,
    });
  }

  if (input.accuracyPct != null && input.accuracyPct < 45) {
    out.push({
      id: "accuracy-low",
      severity: "act",
      titleCs: "Nízká accuracy",
      bodyCs:
        "Buď je obsah moc těžký / špatně vysvětlený, nebo otázky neodpovídají coverage fázi. Uprav scaffolding.",
    });
  }

  const topDrop = input.dropOffPoints[0];
  if (topDrop && topDrop.count >= 2) {
    out.push({
      id: "drop-off",
      severity: "act",
      titleCs: `Drop-off: ${topDrop.dropOffAt}`,
      bodyCs: `${topDrop.count}× — friction v tomto kroku. Zjednoduš UI nebo zkráť session.`,
    });
  }

  const topErr = input.mostCommonErrors[0];
  if (topErr && topErr.count >= 3) {
    out.push({
      id: "common-error",
      severity: "watch",
      titleCs: `Nejčastější chyba: ${topErr.labelCs}`,
      bodyCs:
        "Přidej cílený micro-lesson / ErrorMemory drill na tento typ — ne další generic content.",
    });
  }

  if (input.topicsNeglected.length >= 2) {
    out.push({
      id: "neglect",
      severity: "watch",
      titleCs: "Zanedbaná témata",
      bodyCs: `${input.topicsNeglected
        .slice(0, 3)
        .map((t) => t.topicSlug)
        .join(", ")} — planner by je měl dostat do Coverage / Final review.`,
    });
  }

  const mission = input.featureUsage.find((f) => f.feature === "daily_mission");
  const flash = input.featureUsage.find((f) => f.feature === "flashcards");
  if (mission && flash && flash.sessions > mission.sessions * 2) {
    out.push({
      id: "feature-skew",
      severity: "info",
      titleCs: "Flashcards převažují nad misí",
      bodyCs:
        "Studentka možná obchází denní plán. Zvýrazni misi na Dnes, nebo flashcards vázané na plán.",
    });
  }

  if (out.length === 0) {
    out.push({
      id: "ok",
      severity: "info",
      titleCs: "Zatím bez kritického signálu",
      bodyCs:
        "Sbírej dál sessions a chyby — rozhoduj podle trendů, ne podle jednotlivých dnů.",
    });
  }

  return out.slice(0, 6);
}

export function dateKeyFromIso(iso: string): string {
  return iso.slice(0, 10);
}

export function daysBetweenKeys(fromKey: string, toKey: string): number {
  const a = new Date(`${fromKey}T12:00:00`).getTime();
  const b = new Date(`${toKey}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}
