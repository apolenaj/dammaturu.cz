import { z } from "zod";

/**
 * Progress motivation / elegant gamification (D-047).
 * Primary = real progress to exam goal. XP is secondary footnote.
 * No avatars, diamonds, or distraction currencies.
 */

export const progressMilestoneIds = [
  "first_topic_mastered",
  "fifty_ku_mastered",
  "seven_day_streak",
  "first_simulation",
  "eighty_pct_curriculum",
] as const;

export type ProgressMilestoneId = (typeof progressMilestoneIds)[number];

export type ProgressMilestoneDef = {
  id: ProgressMilestoneId;
  titleCs: string;
  descriptionCs: string;
  /** How this supports studying (not a trophy hunt). */
  studyWhyCs: string;
};

export const PROGRESS_MILESTONES: ProgressMilestoneDef[] = [
  {
    id: "first_topic_mastered",
    titleCs: "První téma zvládnuto",
    descriptionCs: "Jedna oblast má solidní mastery coverage (≥ 80 %).",
    studyWhyCs: "Dokazuješ, že umíš dotáhnout téma do použitelné úrovně.",
  },
  {
    id: "fifty_ku_mastered",
    titleCs: "50 knowledge units mastered",
    descriptionCs: "50 KU ve stavu mastered.",
    studyWhyCs: "Objem zvládnutého učiva — základ pro maturitní pokrytí.",
  },
  {
    id: "seven_day_streak",
    titleCs: "7 dní konzistentní práce",
    descriptionCs: "Sedm po sobě jdoucích dní s dokončenou denní misí.",
    studyWhyCs: "Konzistence bije nárazové cramming — držíš tempo k deadline.",
  },
  {
    id: "first_simulation",
    titleCs: "První simulace dokončena",
    descriptionCs: "Dokončená Zkouška nanečisto.",
    studyWhyCs: "Trénink ústního výkonu pod časem — blíže reálné zkoušce.",
  },
  {
    id: "eighty_pct_curriculum",
    titleCs: "80 % curriculum mastered",
    descriptionCs: "Celková připravenost (mastery coverage) ≥ 80 %.",
    studyWhyCs: "Široké pokrytí učiva — hlavní signál postupu k cíli.",
  },
];

export function milestoneDef(
  id: ProgressMilestoneId,
): ProgressMilestoneDef | undefined {
  return PROGRESS_MILESTONES.find((m) => m.id === id);
}

/** Weekly goal: mission days completed (PRODUCT_SPEC-aligned). */
export const WEEKLY_MISSION_GOAL = 5;

export const progressTopicCompletionSchema = z.object({
  topicId: z.string().min(1).max(80),
  labelCs: z.string().min(1).max(120),
  pct: z.number().min(0).max(100),
  completedAt: z.string().datetime(),
});

export type ProgressTopicCompletion = z.infer<
  typeof progressTopicCompletionSchema
>;

export const progressPersonalBestsSchema = z.object({
  mockExamScore: z.number().int().min(0).max(100).nullable(),
  mockExamAt: z.string().datetime().nullable(),
  mockExamTopicSlug: z.string().min(1).max(120).nullable(),
  longestStreak: z.number().int().min(0).max(10_000),
  speedRoundScore: z.number().int().min(0).max(100_000).nullable(),
});

export type ProgressPersonalBests = z.infer<typeof progressPersonalBestsSchema>;

export const progressLearnerStateSchema = z.object({
  learnerId: z.string().min(1).max(64),
  /** Secondary only — never the hero metric. */
  secondaryXp: z.number().int().min(0).max(1_000_000),
  /** Prevent double XP for the same mission day. */
  lastMissionXpDateKey: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  unlockedMilestoneIds: z.array(z.enum(progressMilestoneIds)).max(20),
  unlockedAt: z.record(z.string(), z.string().datetime()).default({}),
  topicCompletions: z.array(progressTopicCompletionSchema).max(40),
  personalBests: progressPersonalBestsSchema,
  mockExamCompletions: z.number().int().min(0).max(10_000),
  updatedAt: z.string().datetime(),
});

export type ProgressLearnerState = z.infer<typeof progressLearnerStateSchema>;

export function emptyProgressState(
  learnerId: string,
  nowIso: string,
): ProgressLearnerState {
  return {
    learnerId,
    secondaryXp: 0,
    lastMissionXpDateKey: null,
    unlockedMilestoneIds: [],
    unlockedAt: {},
    topicCompletions: [],
    personalBests: {
      mockExamScore: null,
      mockExamAt: null,
      mockExamTopicSlug: null,
      longestStreak: 0,
      speedRoundScore: null,
    },
    mockExamCompletions: 0,
    updatedAt: nowIso,
  };
}

export function parseProgressLearnerState(raw: unknown): ProgressLearnerState {
  return progressLearnerStateSchema.parse(raw);
}

/** Threshold: area/topic considered „zvládnuto“. */
export const TOPIC_MASTERED_PCT = 80;

export type MilestoneEvalInput = {
  masteredKuCount: number;
  readinessOverallPct: number;
  areaPcts: Array<{ id: string; labelCs: string; pct: number }>;
  currentStreak: number;
  longestStreak: number;
  mockExamCompletions: number;
};

export function evaluateUnlockedMilestones(
  input: MilestoneEvalInput,
): ProgressMilestoneId[] {
  const out: ProgressMilestoneId[] = [];
  if (input.areaPcts.some((a) => a.pct >= TOPIC_MASTERED_PCT)) {
    out.push("first_topic_mastered");
  }
  if (input.masteredKuCount >= 50) out.push("fifty_ku_mastered");
  if (input.currentStreak >= 7 || input.longestStreak >= 7) {
    out.push("seven_day_streak");
  }
  if (input.mockExamCompletions >= 1) out.push("first_simulation");
  if (input.readinessOverallPct >= 80) out.push("eighty_pct_curriculum");
  return out;
}

/**
 * Secondary XP — small, derived from real events.
 * UI must treat this as footnote, not primary motivation.
 */
export const secondaryXpRewards = {
  missionDay: 12,
  milestone: 40,
  mockExam: 25,
  topicComplete: 20,
  personalBest: 15,
} as const;

export function mergeMilestoneUnlocks(
  state: ProgressLearnerState,
  newlyEligible: ProgressMilestoneId[],
  nowIso: string,
): { state: ProgressLearnerState; justUnlocked: ProgressMilestoneId[] } {
  const justUnlocked: ProgressMilestoneId[] = [];
  const unlocked = new Set(state.unlockedMilestoneIds);
  const unlockedAt = { ...state.unlockedAt };
  let xp = state.secondaryXp;
  for (const id of newlyEligible) {
    if (!unlocked.has(id)) {
      unlocked.add(id);
      unlockedAt[id] = nowIso;
      justUnlocked.push(id);
      xp += secondaryXpRewards.milestone;
    }
  }
  return {
    justUnlocked,
    state: {
      ...state,
      secondaryXp: xp,
      unlockedMilestoneIds: [...unlocked],
      unlockedAt,
      updatedAt: nowIso,
    },
  };
}

export function applyTopicCompletionsFromAreas(
  state: ProgressLearnerState,
  areas: Array<{ id: string; labelCs: string; pct: number }>,
  nowIso: string,
): ProgressLearnerState {
  const existing = new Set(state.topicCompletions.map((t) => t.topicId));
  const next = [...state.topicCompletions];
  let xp = state.secondaryXp;
  for (const a of areas) {
    if (a.pct >= TOPIC_MASTERED_PCT && !existing.has(a.id)) {
      next.push({
        topicId: a.id,
        labelCs: a.labelCs,
        pct: a.pct,
        completedAt: nowIso,
      });
      xp += secondaryXpRewards.topicComplete;
    }
  }
  return {
    ...state,
    topicCompletions: next,
    secondaryXp: xp,
    updatedAt: nowIso,
  };
}

export function recordMockExamInState(
  state: ProgressLearnerState,
  input: { score: number; topicSlug: string; nowIso: string },
): { state: ProgressLearnerState; isPersonalBest: boolean } {
  const prevBest = state.personalBests.mockExamScore;
  const isPersonalBest = prevBest == null || input.score > prevBest;
  let xp = state.secondaryXp + secondaryXpRewards.mockExam;
  if (isPersonalBest) xp += secondaryXpRewards.personalBest;
  return {
    isPersonalBest,
    state: {
      ...state,
      secondaryXp: xp,
      mockExamCompletions: state.mockExamCompletions + 1,
      personalBests: {
        ...state.personalBests,
        mockExamScore: isPersonalBest
          ? input.score
          : state.personalBests.mockExamScore,
        mockExamAt: isPersonalBest
          ? input.nowIso
          : state.personalBests.mockExamAt,
        mockExamTopicSlug: isPersonalBest
          ? input.topicSlug
          : state.personalBests.mockExamTopicSlug,
      },
      updatedAt: input.nowIso,
    },
  };
}

export function recordMissionDayXp(
  state: ProgressLearnerState,
  dateKey: string,
  nowIso: string,
): ProgressLearnerState {
  if (state.lastMissionXpDateKey === dateKey) return state;
  return {
    ...state,
    secondaryXp: state.secondaryXp + secondaryXpRewards.missionDay,
    lastMissionXpDateKey: dateKey,
    updatedAt: nowIso,
  };
}

export function syncStreakBest(
  state: ProgressLearnerState,
  longestStreak: number,
  nowIso: string,
): ProgressLearnerState {
  return {
    ...state,
    personalBests: {
      ...state.personalBests,
      longestStreak: Math.max(
        state.personalBests.longestStreak,
        longestStreak,
      ),
    },
    updatedAt: nowIso,
  };
}

export type WeeklyGoalView = {
  targetDays: number;
  completedDays: number;
  pct: number;
  labelCs: string;
  remainingCs: string;
};

export function buildWeeklyGoalView(completedDays: number): WeeklyGoalView {
  const target = WEEKLY_MISSION_GOAL;
  const done = Math.min(completedDays, target);
  const pct = Math.round((100 * done) / target);
  const left = Math.max(0, target - completedDays);
  return {
    targetDays: target,
    completedDays,
    pct,
    labelCs: `Týdenní cíl: ${completedDays} / ${target} misí`,
    remainingCs:
      left === 0
        ? "Týdenní cíl splněn — drž tempo."
        : left === 1
          ? "Zbývá 1 mise tento týden."
          : `Zbývá ${left} misí tento týden.`,
  };
}

export type MilestoneStatusView = {
  id: ProgressMilestoneId;
  titleCs: string;
  descriptionCs: string;
  studyWhyCs: string;
  unlocked: boolean;
  unlockedAt: string | null;
};

export type ProgressMotivationView = {
  /** Primary north star — days / readiness toward exam. */
  primaryGoalCs: string;
  daysRemaining: number;
  readinessPct: number | null;
  dailyMission: {
    completed: boolean;
    stepsDone: number;
    stepsTotal: number;
    labelCs: string;
    href: string;
  };
  weeklyGoal: WeeklyGoalView;
  streak: {
    current: number;
    longest: number;
    labelCs: string;
  };
  mastery: {
    masteredKuCount: number;
    overallPct: number | null;
    labelCs: string;
  };
  topicCompletions: ProgressTopicCompletion[];
  milestones: MilestoneStatusView[];
  personalBests: {
    mockExamScore: number | null;
    longestStreak: number;
    speedRoundScore: number | null;
    linesCs: string[];
  };
  /** Footnote only. */
  secondaryXp: number;
  secondaryXpNoteCs: string;
  philosophyCs: string;
};

export const progressPhilosophyCs =
  "Gamifikace podporuje studium: denní mise, týdenní cíl a milníky měří reálný postup k maturitě. XP je jen sekundární stopka — ne cíl.";

export function buildProgressMotivationView(input: {
  daysRemaining: number;
  readinessPct: number | null;
  masteredKuCount: number;
  dailyCompleted: boolean;
  dailyStepsDone: number;
  dailyStepsTotal: number;
  weeklyMissionDays: number;
  currentStreak: number;
  longestStreak: number;
  state: ProgressLearnerState;
}): ProgressMotivationView {
  const unlocked = new Set(input.state.unlockedMilestoneIds);
  const milestones: MilestoneStatusView[] = PROGRESS_MILESTONES.map((m) => ({
    id: m.id,
    titleCs: m.titleCs,
    descriptionCs: m.descriptionCs,
    studyWhyCs: m.studyWhyCs,
    unlocked: unlocked.has(m.id),
    unlockedAt: input.state.unlockedAt[m.id] ?? null,
  }));

  const pb = input.state.personalBests;
  const linesCs: string[] = [];
  if (pb.mockExamScore != null) {
    linesCs.push(`Zkouška nanečisto: nejlepší skóre rubriky ${pb.mockExamScore}/100`);
  }
  if (pb.longestStreak > 0) {
    linesCs.push(`Nejdelší streak: ${pb.longestStreak} dní`);
  }
  if (pb.speedRoundScore != null) {
    linesCs.push(`Speed Round personal best: ${pb.speedRoundScore}`);
  }
  if (linesCs.length === 0) {
    linesCs.push("Zatím bez personal bests — dokonči misi nebo simulaci.");
  }

  const days = input.daysRemaining;
  const primaryGoalCs =
    days <= 0
      ? "Cíl je dnes — drž denní misi a slabá místa."
      : input.readinessPct != null
        ? `Do cíle ${days} dní · připravenost ${input.readinessPct} % mastery coverage`
        : `Do cíle ${days} dní · plň denní misi a týdenní cíl`;

  return {
    primaryGoalCs,
    daysRemaining: days,
    readinessPct: input.readinessPct,
    dailyMission: {
      completed: input.dailyCompleted,
      stepsDone: input.dailyStepsDone,
      stepsTotal: input.dailyStepsTotal,
      labelCs: input.dailyCompleted
        ? "Dnešní mise hotová"
        : `Dnešní mise: ${input.dailyStepsDone}/${input.dailyStepsTotal} kroků`,
      href: "/app/dashboard",
    },
    weeklyGoal: buildWeeklyGoalView(input.weeklyMissionDays),
    streak: {
      current: input.currentStreak,
      longest: Math.max(input.longestStreak, pb.longestStreak),
      labelCs:
        input.currentStreak > 0
          ? `${input.currentStreak} dní v řadě`
          : "Streak 0 — začni dnešní misí",
    },
    mastery: {
      masteredKuCount: input.masteredKuCount,
      overallPct: input.readinessPct,
      labelCs:
        input.readinessPct != null
          ? `${input.masteredKuCount} KU mastered · coverage ${input.readinessPct} %`
          : `${input.masteredKuCount} KU mastered`,
    },
    topicCompletions: input.state.topicCompletions,
    milestones,
    personalBests: {
      mockExamScore: pb.mockExamScore,
      longestStreak: Math.max(input.longestStreak, pb.longestStreak),
      speedRoundScore: pb.speedRoundScore,
      linesCs,
    },
    secondaryXp: input.state.secondaryXp,
    secondaryXpNoteCs: `XP ${input.state.secondaryXp} (sekundární — ne primární motivace)`,
    philosophyCs: progressPhilosophyCs,
  };
}

/** Monday dateKey (YYYY-MM-DD) for ISO-ish local week start. */
export function weekStartDateKey(d: Date): string {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  const day = x.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function dateKeysInWeek(weekStartKey: string): string[] {
  const start = new Date(`${weekStartKey}T12:00:00`);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    keys.push(`${y}-${m}-${dd}`);
  }
  return keys;
}
