import { z } from "zod";

/**
 * Daily Mission engine (D-037 rebuild).
 * Answers one question: „Co mám dnes udělat?“
 * Priority: overdue → mistakes → weak high-priority → exam → new.
 * Time budgets: 10 / 15 / 30 / 45 / 60+ minutes.
 */

export const dailyStepKinds = [
  "review",
  "mistakes",
  "learn",
  "exam",
  "test",
] as const;
export type DailyStepKind = (typeof dailyStepKinds)[number];

export const dailyStepKindLabelsCs: Record<DailyStepKind, string> = {
  review: "Zopakovat",
  mistakes: "Moje chyby",
  learn: "Učit",
  exam: "K maturitě",
  test: "Ověřit",
};

export const dailyPlanStepSchema = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(dailyStepKinds),
  /** Priority 1 = highest (overdue). */
  priority: z.number().int().min(1).max(5).default(3),
  labelCs: z.string().min(1).max(160),
  titleCs: z.string().min(1).max(120),
  minutes: z.number().int().min(1).max(90),
  href: z.string().min(1).max(200),
  reasonCs: z.string().min(1).max(200).optional(),
  done: z.boolean(),
});

export type DailyPlanStep = z.infer<typeof dailyPlanStepSchema>;

export const dailyMissionDaySchema = z.object({
  learnerId: z.string().min(1).max(64),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.array(dailyPlanStepSchema).min(1).max(6),
  budgetMinutes: z.number().int().min(10).max(120).default(30),
  completedAt: z.string().datetime().nullable(),
  knowledgeStrengthened: z.number().int().min(0).max(500),
  updatedAt: z.string().datetime(),
});

export type DailyMissionDay = z.infer<typeof dailyMissionDaySchema>;

export const dailyStreakSchema = z.object({
  learnerId: z.string().min(1).max(64),
  currentStreak: z.number().int().min(0).max(10_000),
  longestStreak: z.number().int().min(0).max(10_000),
  lastCompletedDateKey: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  updatedAt: z.string().datetime(),
});

export type DailyStreak = z.infer<typeof dailyStreakSchema>;

export const TIME_BUDGETS = [10, 15, 30, 45, 60] as const;
export type TimeBudget = (typeof TIME_BUDGETS)[number];

/** Map free-form dailyMinutes → discrete budget bucket. */
export function resolveTimeBudget(dailyMinutes: number): TimeBudget {
  const m = Math.max(1, Math.floor(dailyMinutes));
  if (m <= 12) return 10;
  if (m <= 20) return 15;
  if (m <= 37) return 30;
  if (m <= 52) return 45;
  return 60;
}

export type GreetingPartOfDay = "morning" | "afternoon" | "evening" | "night";

export function partOfDay(now: Date): GreetingPartOfDay {
  const h = now.getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

export function greetingCs(displayName: string, now: Date): string {
  const name = displayName.trim() || "studente";
  switch (partOfDay(now)) {
    case "morning":
      return `Dobré ráno, ${name}`;
    case "afternoon":
      return `Dobré odpoledne, ${name}`;
    case "evening":
      return `Dobrý večer, ${name}`;
    case "night":
      return `Ahoj, ${name}`;
  }
}

export function dateKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDaysRemainingCs(days: number): string {
  if (days <= 0) return "Cíl je dnes — drž tempo.";
  if (days === 1) return "Do cíle zbývá 1 den.";
  if (days >= 2 && days <= 4) return `Do cíle zbývá ${days} dny.`;
  return `Do cíle zbývá ${days} dní.`;
}

export function formatCompletionCs(knowledgeStrengthened: number): string {
  const n = Math.max(0, knowledgeStrengthened);
  if (n === 0) return "Hotovo. Dnes jsi dokončil/a misi.";
  if (n === 1) return "Hotovo. Dnes jsi posílil/a 1 znalost.";
  if (n >= 2 && n <= 4) return `Hotovo. Dnes jsi posílil/a ${n} znalosti.`;
  return `Hotovo. Dnes jsi posílil/a ${n} znalostí.`;
}

export type MissionSignals = {
  /** Overdue / due review items. */
  overdueCount: number;
  /** Active (non-mastered) mistakes. */
  openMistakesCount: number;
  /** Weak high-exam-weight area. */
  weakAreaLabelCs: string | null;
  weakAreaHref: string | null;
  weakAreaPct: number | null;
  /** Days to target exam date. */
  daysRemaining: number;
  /** Suggested new/learn topic when nothing weaker. */
  newTopicLabelCs?: string;
  newTopicHref?: string;
  reviewHref?: string;
  mistakesHref?: string;
  examHref?: string;
  testHref?: string;
};

export type MissionCandidate = {
  id: string;
  kind: DailyStepKind;
  priority: 1 | 2 | 3 | 4 | 5;
  titleCs: string;
  minutes: number;
  href: string;
  reasonCs: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Build prioritized candidates from real signals (never invent counts).
 */
export function buildMissionCandidates(
  signals: MissionSignals,
): MissionCandidate[] {
  const candidates: MissionCandidate[] = [];

  if (signals.overdueCount > 0) {
    const n = Math.min(24, signals.overdueCount);
    candidates.push({
      id: "overdue-review",
      kind: "review",
      priority: 1,
      titleCs: `${n} položek k opakování`,
      minutes: clamp(Math.round(n * 1.15), 6, 22),
      href: signals.reviewHref ?? "/app/review/mixed",
      reasonCs: "Po splatnosti — nejdřív to, na čem začínáš zapomínat.",
    });
  }

  if (signals.openMistakesCount > 0) {
    const n = Math.min(12, signals.openMistakesCount);
    candidates.push({
      id: "mistakes",
      kind: "mistakes",
      priority: 2,
      titleCs: `${n} chyb k procvičení`,
      minutes: clamp(n * 3, 6, 18),
      href: signals.mistakesHref ?? "/app/mistakes",
      reasonCs: "Opakované chyby — vrať se k nim dřív, než ztvrdnou.",
    });
  }

  if (signals.weakAreaLabelCs && signals.weakAreaHref) {
    candidates.push({
      id: "weak-priority",
      kind: "learn",
      priority: 3,
      titleCs: signals.weakAreaLabelCs,
      minutes: 12,
      href: signals.weakAreaHref,
      reasonCs:
        signals.weakAreaPct != null && signals.weakAreaPct < 55
          ? "Slabé místo s vysokou vahou u maturity."
          : "Relativně nejslabší oblast — cílená session.",
    });
  }

  if (signals.daysRemaining <= 28) {
    const urgent = signals.daysRemaining <= 10;
    candidates.push({
      id: "exam-prep",
      kind: "exam",
      priority: 4,
      titleCs: urgent ? "Maturitní nácvik" : "Požadavky k maturitě",
      minutes: urgent ? 14 : 10,
      href: signals.examHref ?? "/app/tests",
      reasonCs: urgent
        ? "Blíží se termín — ověř typické úlohy."
        : "Doplň pokrytí toho, co maturita vyžaduje.",
    });
  }

  candidates.push({
    id: "new-knowledge",
    kind: "learn",
    priority: 5,
    titleCs: signals.newTopicLabelCs ?? "Nová látka",
    minutes: 10,
    href: signals.newTopicHref ?? "/app/learn",
    reasonCs: "Až je fronta v klidu — posuň pokrytí dál.",
  });

  // Always allow a short verify when budget allows and we have other work
  if (signals.overdueCount > 0 || signals.openMistakesCount > 0) {
    candidates.push({
      id: "mini-check",
      kind: "test",
      priority: 5,
      titleCs: "Krátké ověření",
      minutes: 7,
      href: signals.testHref ?? "/app/tests/otazky/cjl-otazky",
      reasonCs: "Rychlá kontrola, že to sedí.",
    });
  }

  return candidates.sort((a, b) => a.priority - b.priority);
}

/**
 * Pack candidates into a realistic session within the time budget.
 * Higher priority always wins; minutes may shrink to fit.
 */
export function packMissionIntoBudget(
  candidates: MissionCandidate[],
  budgetMinutes: number,
): Omit<DailyPlanStep, "done">[] {
  const budget = clamp(budgetMinutes, 10, 90);
  const steps: Omit<DailyPlanStep, "done">[] = [];
  let remaining = budget;

  for (const c of candidates) {
    if (remaining < 5 && steps.length > 0) break;

    let mins = c.minutes;
    if (mins > remaining) {
      // First item may consume almost all budget
      if (steps.length === 0) {
        mins = Math.max(5, remaining);
      } else if (remaining >= 5) {
        mins = remaining;
      } else {
        break;
      }
    }

    // Skip lowest-priority filler when budget is tight and we already have core work
    if (
      c.priority >= 5 &&
      steps.length >= 2 &&
      remaining < mins + 3
    ) {
      continue;
    }

    const kindLabel = dailyStepKindLabelsCs[c.kind];
    steps.push({
      id: c.id,
      kind: c.kind,
      priority: c.priority,
      titleCs: c.titleCs,
      minutes: mins,
      href: c.href,
      reasonCs: c.reasonCs,
      labelCs: `${kindLabel}: ${c.titleCs} – ${mins} min`,
    });
    remaining -= mins;
    if (steps.length >= 4) break;
  }

  if (steps.length === 0) {
    // Absolute fallback — still a real session, not empty dashboard
    steps.push({
      id: "fallback-learn",
      kind: "learn",
      priority: 5,
      titleCs: "Krátká studijní session",
      minutes: Math.min(budget, 15),
      href: "/app/learn",
      reasonCs: "Začni klidně tady — appka doplní frontu z cvičení.",
      labelCs: `Učit: Krátká studijní session – ${Math.min(budget, 15)} min`,
    });
  }

  return steps;
}

export type BuildDailyPlanInput = {
  dueCardCount: number;
  learnTopicTitle?: string;
  learnHref?: string;
  reviewHref?: string;
  testHref?: string;
  /** Preferred: full signals + budget. */
  signals?: MissionSignals;
  dailyMinutes?: number;
};

/**
 * Build today's mission steps (priority order + time budget).
 */
export function buildDailyPlanSteps(
  input: BuildDailyPlanInput,
): Omit<DailyPlanStep, "done">[] {
  const budget = resolveTimeBudget(input.dailyMinutes ?? 30);
  const signals: MissionSignals = input.signals ?? {
    overdueCount: input.dueCardCount,
    openMistakesCount: 0,
    weakAreaLabelCs: input.learnTopicTitle ?? null,
    weakAreaHref: input.learnHref ?? null,
    weakAreaPct: null,
    daysRemaining: 40,
    reviewHref: input.reviewHref,
    testHref: input.testHref,
  };
  return packMissionIntoBudget(buildMissionCandidates(signals), budget);
}

export function buildDailyMissionPlan(input: {
  signals: MissionSignals;
  dailyMinutes: number;
}): {
  steps: Omit<DailyPlanStep, "done">[];
  budgetMinutes: TimeBudget;
  totalMinutes: number;
} {
  const budgetMinutes = resolveTimeBudget(input.dailyMinutes);
  const steps = packMissionIntoBudget(
    buildMissionCandidates(input.signals),
    budgetMinutes,
  );
  return {
    steps,
    budgetMinutes,
    totalMinutes: totalPlanMinutes(steps),
  };
}

export function totalPlanMinutes(steps: Array<{ minutes: number }>): number {
  return steps.reduce((s, x) => s + x.minutes, 0);
}

export function remainingPlanMinutes(steps: DailyPlanStep[]): number {
  return totalPlanMinutes(steps.filter((s) => !s.done));
}

export function nextIncompleteStep(
  steps: DailyPlanStep[],
): DailyPlanStep | null {
  return steps.find((s) => !s.done) ?? null;
}

export function allStepsDone(steps: DailyPlanStep[]): boolean {
  return steps.length > 0 && steps.every((s) => s.done);
}

export function estimateKnowledgeStrengthened(steps: DailyPlanStep[]): number {
  let n = 0;
  for (const s of steps) {
    if (!s.done) continue;
    if (s.kind === "learn") n += 5;
    else if (s.kind === "review") n += 6;
    else if (s.kind === "mistakes") n += 4;
    else if (s.kind === "exam") n += 4;
    else n += 3;
  }
  return n;
}

export function applyStreakOnComplete(
  prev: DailyStreak,
  completedDateKey: string,
  nowIso: string,
): DailyStreak {
  const last = prev.lastCompletedDateKey;
  let current = prev.currentStreak;
  if (last === completedDateKey) {
    return { ...prev, updatedAt: nowIso };
  }
  if (last) {
    const prevDate = new Date(`${last}T12:00:00`);
    const curDate = new Date(`${completedDateKey}T12:00:00`);
    const diffDays = Math.round(
      (curDate.getTime() - prevDate.getTime()) / 86_400_000,
    );
    current = diffDays === 1 ? current + 1 : 1;
  } else {
    current = 1;
  }
  return {
    ...prev,
    currentStreak: current,
    longestStreak: Math.max(prev.longestStreak, current),
    lastCompletedDateKey: completedDateKey,
    updatedAt: nowIso,
  };
}

export function emptyStreak(learnerId: string, nowIso: string): DailyStreak {
  return {
    learnerId,
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDateKey: null,
    updatedAt: nowIso,
  };
}

/** Minimal secondary — streak only (no competing dashboard). */
export type DailyDashboardSecondary = {
  streakDays: number;
  readinessPct?: number | null;
  readinessHref?: string;
  weekDeltaPct?: number | null;
  weakLabelCs?: string | null;
  weakHref?: string | null;
  upcomingReviews?: number;
  weeklySpark?: number[];
};

export type DailyDashboardView = {
  greetingCs: string;
  questionCs: string;
  daysRemainingCs: string;
  daysRemaining: number;
  planTitleCs: string;
  steps: DailyPlanStep[];
  totalMinutes: number;
  remainingMinutes: number;
  totalMinutesCs: string;
  budgetMinutes: number;
  ctaLabelCs: string;
  ctaHref: string;
  completed: boolean;
  completionCs: string | null;
  secondary: DailyDashboardSecondary;
};

export function buildDailyDashboardView(input: {
  displayName: string;
  daysRemaining: number;
  day: DailyMissionDay;
  streak: DailyStreak;
  now: Date;
  secondary?: Partial<DailyDashboardSecondary>;
}): DailyDashboardView {
  const completed =
    Boolean(input.day.completedAt) || allStepsDone(input.day.steps);
  const next = nextIncompleteStep(input.day.steps);
  const total = totalPlanMinutes(input.day.steps);
  const remaining = remainingPlanMinutes(input.day.steps);
  const budget = input.day.budgetMinutes ?? total;

  return {
    greetingCs: greetingCs(input.displayName, input.now),
    questionCs: "Co mám dnes udělat?",
    daysRemainingCs: formatDaysRemainingCs(input.daysRemaining),
    daysRemaining: input.daysRemaining,
    planTitleCs: "DNEŠNÍ MISE",
    steps: input.day.steps,
    totalMinutes: total,
    remainingMinutes: remaining,
    totalMinutesCs: `Sezení na cca ${total} min (rozpočet ${budget} min).`,
    budgetMinutes: budget,
    ctaLabelCs: completed
      ? "Dnes hotovo"
      : `Začít dnešní misi — ${remaining} min`,
    ctaHref: completed
      ? "/app/progress"
      : (next?.href ?? input.day.steps[0]?.href ?? "/app/learn"),
    completed,
    completionCs: completed
      ? formatCompletionCs(input.day.knowledgeStrengthened)
      : null,
    secondary: {
      streakDays: input.secondary?.streakDays ?? input.streak.currentStreak,
      readinessPct: input.secondary?.readinessPct ?? null,
      readinessHref: input.secondary?.readinessHref ?? "/app/progress",
      weekDeltaPct: input.secondary?.weekDeltaPct ?? null,
      weakLabelCs: input.secondary?.weakLabelCs ?? null,
      weakHref: input.secondary?.weakHref ?? null,
      upcomingReviews: input.secondary?.upcomingReviews ?? 0,
      weeklySpark: input.secondary?.weeklySpark ?? [],
    },
  };
}
