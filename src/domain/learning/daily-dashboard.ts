import { z } from "zod";

/**
 * Daily dashboard (D-037) — student must not decide what to do.
 * One plan · one CTA · compact secondary signals.
 */

export const dailyStepKinds = ["learn", "review", "test"] as const;
export type DailyStepKind = (typeof dailyStepKinds)[number];

export const dailyStepKindLabelsCs: Record<DailyStepKind, string> = {
  learn: "Naučit",
  review: "Zopakovat",
  test: "Mini test",
};

export const dailyPlanStepSchema = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(dailyStepKinds),
  /** Full line e.g. „Naučit: Realismus v Rusku – 12 min“ */
  labelCs: z.string().min(1).max(160),
  titleCs: z.string().min(1).max(120),
  minutes: z.number().int().min(1).max(90),
  href: z.string().min(1).max(200),
  done: z.boolean(),
});

export type DailyPlanStep = z.infer<typeof dailyPlanStepSchema>;

export const dailyMissionDaySchema = z.object({
  learnerId: z.string().min(1).max(64),
  /** YYYY-MM-DD */
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.array(dailyPlanStepSchema).min(1).max(6),
  completedAt: z.string().datetime().nullable(),
  /** Knowledge units strengthened today (completion copy). */
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
  if (n === 0) return "Hotovo. Dnes jsi dokončil/a plán.";
  if (n === 1) return "Hotovo. Dnes jsi posílil/a 1 znalost.";
  if (n >= 2 && n <= 4) return `Hotovo. Dnes jsi posílil/a ${n} znalosti.`;
  return `Hotovo. Dnes jsi posílil/a ${n} znalostí.`;
}

export type BuildDailyPlanInput = {
  dueCardCount: number;
  learnTopicTitle?: string;
  learnHref?: string;
  reviewHref?: string;
  testHref?: string;
};

/**
 * Deterministic 3-step plan (12+8+7 ≈ 27 min).
 * Student never chooses order — system does.
 */
export function buildDailyPlanSteps(
  input: BuildDailyPlanInput,
): Omit<DailyPlanStep, "done">[] {
  const learnTitle = input.learnTopicTitle ?? "Realismus v Rusku";
  const learnHref = input.learnHref ?? "/app/learn/rychle/realismus";
  const reviewHref = input.reviewHref ?? "/app/review/mixed";
  const testHref = input.testHref ?? "/app/tests/otazky/cjl-otazky";

  const cards = Math.max(0, Math.min(24, Math.floor(input.dueCardCount)));
  const learnMin = 12;
  const reviewMin = cards === 0 ? 5 : 8;
  const testMin = 7;

  return [
    {
      id: "learn",
      kind: "learn",
      titleCs: learnTitle,
      minutes: learnMin,
      href: learnHref,
      labelCs: `Naučit: ${learnTitle} – ${learnMin} min`,
    },
    {
      id: "review",
      kind: "review",
      titleCs: cards === 0 ? "Žádné due kartičky" : `${cards} kartiček`,
      minutes: reviewMin,
      href: reviewHref,
      labelCs:
        cards === 0
          ? `Zopakovat: otevři review (0 due) – ${reviewMin} min`
          : `Zopakovat: ${cards} kartiček – ${reviewMin} min`,
    },
    {
      id: "test",
      kind: "test",
      titleCs: "Mini test",
      minutes: testMin,
      href: testHref,
      labelCs: `Mini test – ${testMin} min`,
    },
  ];
}

export function totalPlanMinutes(steps: Array<{ minutes: number }>): number {
  return steps.reduce((s, x) => s + x.minutes, 0);
}

export function nextIncompleteStep(
  steps: DailyPlanStep[],
): DailyPlanStep | null {
  return steps.find((s) => !s.done) ?? null;
}

export function allStepsDone(steps: DailyPlanStep[]): boolean {
  return steps.length > 0 && steps.every((s) => s.done);
}

/** Estimate KU strengthened from completed steps. */
export function estimateKnowledgeStrengthened(steps: DailyPlanStep[]): number {
  let n = 0;
  for (const s of steps) {
    if (!s.done) continue;
    if (s.kind === "learn") n += 5;
    else if (s.kind === "review") n += 6;
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

export type DailyDashboardSecondary = {
  readinessPct: number | null;
  readinessHref: string;
  weekDeltaPct: number | null;
  weakLabelCs: string | null;
  weakHref: string | null;
  streakDays: number;
  upcomingReviews: number;
  weeklySpark: number[];
};

export type DailyDashboardView = {
  greetingCs: string;
  daysRemainingCs: string;
  daysRemaining: number;
  planTitleCs: string;
  steps: DailyPlanStep[];
  totalMinutes: number;
  totalMinutesCs: string;
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
  secondary: Omit<DailyDashboardSecondary, "streakDays"> & {
    streakDays?: number;
  };
}): DailyDashboardView {
  const completed =
    Boolean(input.day.completedAt) || allStepsDone(input.day.steps);
  const next = nextIncompleteStep(input.day.steps);
  const total = totalPlanMinutes(input.day.steps);

  return {
    greetingCs: greetingCs(input.displayName, input.now),
    daysRemainingCs: formatDaysRemainingCs(input.daysRemaining),
    daysRemaining: input.daysRemaining,
    planTitleCs: "DNEŠNÍ PLÁN",
    steps: input.day.steps,
    totalMinutes: total,
    totalMinutesCs: `Celkem cca ${total} minut.`,
    ctaLabelCs: completed ? "Dnes hotovo" : "ZAČÍT DNEŠNÍ MISI",
    ctaHref: completed
      ? "/app/progress"
      : (next?.href ?? input.day.steps[0]?.href ?? "/app/learn"),
    completed,
    completionCs: completed
      ? formatCompletionCs(input.day.knowledgeStrengthened)
      : null,
    secondary: {
      ...input.secondary,
      streakDays: input.secondary.streakDays ?? input.streak.currentStreak,
    },
  };
}
