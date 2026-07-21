import { z } from "zod";

/**
 * Deadline-aware study planner (D-038).
 * Always uses the student's real exam `targetDate` — never a hardcoded beta deadline.
 * Phases: Coverage → Consolidation → Exam readiness → Final review.
 * Missed days / mastery / materials / date change → recalculate; never dump unreal backlog.
 */

export const plannerPhases = [
  "coverage",
  "consolidation",
  "exam_readiness",
  "final_review",
] as const;

export type PlannerPhase = (typeof plannerPhases)[number];

export const plannerPhaseLabelsCs: Record<PlannerPhase, string> = {
  coverage: "Coverage — pochopit celý obsah",
  consolidation: "Consolidation — active recall + tests",
  exam_readiness: "Exam readiness — mixed tests + oral",
  final_review: "Final review — slabiny a high-value facts",
};

export const plannerPhaseShortCs: Record<PlannerPhase, string> = {
  coverage: "Coverage",
  consolidation: "Consolidation",
  exam_readiness: "Exam readiness",
  final_review: "Final review",
};

export const plannerPhaseFocusCs: Record<PlannerPhase, string> = {
  coverage:
    "Nejdřív pochopit celý obsah — nové KU, mikrobloky, bez zahlcení testy.",
  consolidation:
    "Upevnit: active recall, Teach It Back, mini testy na známé učivo.",
  exam_readiness:
    "Smíšené testy, interleaving, oral / vysvětlení — maturita jako celek.",
  final_review:
    "Jen největší slabiny a high-value facts. Žádný nový obsah navíc.",
};

/** Tunable caps — prevent unreal backlog after missed days. */
export const plannerConfig = {
  /** Fraction of remaining calendar days kept as buffer (min 3, max 10). */
  bufferFraction: 0.12,
  bufferDaysMin: 3,
  bufferDaysMax: 10,
  /** Default study days per week when learner didn't specify. */
  defaultAvailableDaysPerWeek: 5,
  /** Phase share of study days (sums to 1). */
  phaseShares: {
    coverage: 0.4,
    consolidation: 0.28,
    exam_readiness: 0.2,
    final_review: 0.12,
  } as Record<PlannerPhase, number>,
  /** Minutes per new topic (coverage). */
  minutesPerNewTopic: 14,
  /** Minutes per review item. */
  minutesPerReview: 2.5,
  /** Minutes per consolidation block. */
  minutesPerConsolidationBlock: 12,
  /** Difficulty 1–5 mapped from feeling + content. */
  baseDifficulty: 3,
  /** Max catch-up as fraction of daily budget after missed days. */
  maxCatchUpFraction: 0.35,
  /** Hard cap: never schedule more than this × daily minutes in one day. */
  maxDailyLoadFactor: 1.2,
  /** Max new topics suggested in one day. */
  maxNewTopicsPerDay: 2,
  /** Max review items suggested in one day. */
  maxReviewsPerDay: 24,
  /** Mastery thresholds for phase gates. */
  coverageMasteryGate: 45,
  consolidationMasteryGate: 65,
  examMasteryGate: 78,
} as const;

export const plannerInputsSchema = z.object({
  /** Student's real exam date (ISO). Required — no product default. */
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dailyMinutes: z.number().int().min(10).max(240),
  /** How many days/week the student can study (3–7). */
  availableDaysPerWeek: z.number().int().min(3).max(7).default(5),
  /** Topic / KU count in curriculum (+ materials contribution). */
  contentUnits: z.number().int().min(1).max(500),
  /** 1 easy … 5 hard. Optional — estimated when omitted. */
  difficultyIndex: z.number().min(1).max(5).optional(),
  /** Current mastery / readiness coverage 0–100. */
  masteryPct: z.number().min(0).max(100),
  /** Spaced items currently due. */
  dueReviews: z.number().int().min(0).max(2000),
  /** Calendar days missed since last completed study day. */
  missedDays: z.number().int().min(0).max(365),
  /** Self-reported readiness 1–5 (onboarding). */
  readinessFeeling: z.number().int().min(1).max(5).optional(),
  /** Ready uploaded materials (affects content + risks). */
  materialsReadyCount: z.number().int().min(0).max(500).optional(),
  materialsKnowledgePoints: z.number().int().min(0).max(50_000).optional(),
});

export type PlannerInputs = z.infer<typeof plannerInputsSchema>;

export type PhaseWindow = {
  phase: PlannerPhase;
  labelCs: string;
  focusCs: string;
  startDayOffset: number;
  endDayOffset: number;
  dayCount: number;
  /** Inclusive date range if anchored from today. */
  startDate: string;
  endDate: string;
};

export type DailyLoadPlan = {
  /** Minutes the planner asks for today (capped). */
  scheduledMinutes: number;
  /** Raw demand before caps (for transparency). */
  rawDemandMinutes: number;
  backlogCapped: boolean;
  newTopics: number;
  reviewItems: number;
  consolidationBlocks: number;
  noteCs: string;
};

export type DeadlinePlan = {
  targetDate: string;
  computedAt: string;
  daysRemaining: number;
  bufferDays: number;
  availableDaysPerWeek: number;
  studyDays: number;
  /** Total available study minutes until deadline (study days × daily). */
  availableMinutes: number;
  /** Estimated minutes to cover remaining content + reviews. */
  requiredMinutes: number;
  contentUnits: number;
  difficultyIndex: number;
  masteryPct: number;
  dueReviews: number;
  reviewsNeeded: number;
  missedDays: number;
  materialsReadyCount: number;
  materialsKnowledgePoints: number;
  currentPhase: PlannerPhase;
  currentPhaseLabelCs: string;
  phases: PhaseWindow[];
  today: DailyLoadPlan;
  feasibility: "on_track" | "tight" | "at_risk";
  feasibilityCs: string;
  recalculatedAfterMiss: boolean;
  summaryLinesCs: string[];
};

function daysBetween(from: Date, to: Date): number {
  const a = new Date(from);
  a.setHours(12, 0, 0, 0);
  const b = new Date(to);
  b.setHours(12, 0, 0, 0);
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / 86_400_000));
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  return addDays(dateKey, days);
}

export function toPlannerDateKey(d: Date): string {
  return toDateKey(d);
}

/**
 * Which calendar days count as study days given days/week availability.
 * 7 = every day, 6 = Mon–Sat, 5 = Mon–Fri, 4 = Mon–Thu, 3 = Mon/Wed/Fri.
 */
export function isAvailableStudyDay(
  date: Date,
  availableDaysPerWeek: number,
): boolean {
  const dow = date.getDay(); // 0 = Sun … 6 = Sat
  const n = Math.min(7, Math.max(3, Math.floor(availableDaysPerWeek)));
  if (n >= 7) return true;
  if (n >= 6) return dow !== 0;
  if (n >= 5) return dow >= 1 && dow <= 5;
  if (n >= 4) return dow >= 1 && dow <= 4;
  return dow === 1 || dow === 3 || dow === 5;
}

/** Count study-day slots between today (inclusive) and target (exclusive of after-target). */
export function countAvailableStudyDays(input: {
  todayKey: string;
  targetDate: string;
  availableDaysPerWeek: number;
}): number {
  const daysRemaining = daysBetween(
    new Date(`${input.todayKey}T12:00:00`),
    new Date(`${input.targetDate}T12:00:00`),
  );
  if (daysRemaining <= 0) return 0;
  let count = 0;
  for (let i = 0; i < daysRemaining; i++) {
    const key = addDays(input.todayKey, i);
    const d = new Date(`${key}T12:00:00`);
    if (isAvailableStudyDay(d, input.availableDaysPerWeek)) count += 1;
  }
  return count;
}

/**
 * Derive days/week from study mode when learner has no explicit setting.
 */
export function resolveAvailableDaysPerWeek(input: {
  studyMode?: "standard" | "intensive";
  availableDaysPerWeek?: number;
}): number {
  if (
    input.availableDaysPerWeek != null &&
    input.availableDaysPerWeek >= 3 &&
    input.availableDaysPerWeek <= 7
  ) {
    return input.availableDaysPerWeek;
  }
  if (input.studyMode === "intensive") return 6;
  return plannerConfig.defaultAvailableDaysPerWeek;
}

export function computeBufferDays(daysRemaining: number): number {
  if (daysRemaining <= 0) return 0;
  const raw = Math.round(daysRemaining * plannerConfig.bufferFraction);
  return Math.min(
    plannerConfig.bufferDaysMax,
    Math.max(plannerConfig.bufferDaysMin, raw),
  );
}

export function estimateDifficultyIndex(input: {
  readinessFeeling?: number;
  masteryPct: number;
  contentUnits: number;
}): number {
  let d = plannerConfig.baseDifficulty;
  if (input.readinessFeeling != null) {
    d += (3 - input.readinessFeeling) * 0.35;
  }
  if (input.masteryPct < 40) d += 0.6;
  else if (input.masteryPct > 75) d -= 0.5;
  if (input.contentUnits > 28) d += 0.3;
  return Math.min(5, Math.max(1, Math.round(d * 10) / 10));
}

/**
 * Reviews still needed beyond what's currently due —
 * gaps in mastery imply future spaced load.
 */
export function estimateReviewsNeeded(input: {
  contentUnits: number;
  masteryPct: number;
  dueReviews: number;
}): number {
  const unseenShare = Math.max(0, 1 - input.masteryPct / 100);
  const futureFromGaps = Math.round(input.contentUnits * unseenShare * 2.2);
  return input.dueReviews + futureFromGaps;
}

export function estimateRequiredMinutes(input: {
  contentUnits: number;
  masteryPct: number;
  reviewsNeeded: number;
  difficultyIndex: number;
}): number {
  const remainingUnits = Math.ceil(
    input.contentUnits * Math.max(0.05, 1 - input.masteryPct / 100),
  );
  const difficultyFactor = 0.75 + input.difficultyIndex / 5;
  const coverageMin =
    remainingUnits * plannerConfig.minutesPerNewTopic * difficultyFactor;
  const reviewMin =
    input.reviewsNeeded * plannerConfig.minutesPerReview * difficultyFactor;
  const consolidationMin =
    Math.ceil(input.contentUnits * 0.35) *
    plannerConfig.minutesPerConsolidationBlock *
    0.5;
  return Math.round(coverageMin + reviewMin + consolidationMin);
}

function allocatePhaseDays(studyDays: number): Record<PlannerPhase, number> {
  const shares = plannerConfig.phaseShares;
  const raw = plannerPhases.map((p) => ({
    phase: p,
    days: studyDays * shares[p],
  }));
  const floored = raw.map((r) => ({
    ...r,
    days: Math.floor(r.days),
  }));
  let used = floored.reduce((s, r) => s + r.days, 0);
  let i = 0;
  while (used < studyDays && i < 20) {
    floored[i % floored.length]!.days += 1;
    used += 1;
    i += 1;
  }
  // Ensure each phase has ≥1 day when studyDays ≥ 4
  if (studyDays >= 4) {
    for (const row of floored) {
      if (row.days < 1) {
        const donor = floored.find((x) => x.days > 1);
        if (donor) {
          donor.days -= 1;
          row.days = 1;
        }
      }
    }
  }
  return Object.fromEntries(
    floored.map((r) => [r.phase, r.days]),
  ) as Record<PlannerPhase, number>;
}

export function buildPhaseWindows(input: {
  todayKey: string;
  studyDays: number;
}): PhaseWindow[] {
  const counts = allocatePhaseDays(input.studyDays);
  const windows: PhaseWindow[] = [];
  let offset = 0;
  for (const phase of plannerPhases) {
    const dayCount = counts[phase] ?? 0;
    if (dayCount <= 0) continue;
    const startDayOffset = offset;
    const endDayOffset = offset + dayCount - 1;
    windows.push({
      phase,
      labelCs: plannerPhaseLabelsCs[phase],
      focusCs: plannerPhaseFocusCs[phase],
      startDayOffset,
      endDayOffset,
      dayCount,
      startDate: addDays(input.todayKey, startDayOffset),
      endDate: addDays(input.todayKey, endDayOffset),
    });
    offset += dayCount;
  }
  return windows;
}

/**
 * Pick current phase from calendar windows, with mastery gates that can
 * advance early or hold in coverage if mastery is very low.
 */
export function resolveCurrentPhase(input: {
  phases: PhaseWindow[];
  dayOffset: number;
  masteryPct: number;
  daysRemaining: number;
  bufferDays: number;
}): PlannerPhase {
  // Near / inside buffer → final review (weaknesses + high-value facts)
  if (input.daysRemaining <= Math.max(input.bufferDays, 5)) {
    return "final_review";
  }
  // Last stretch before buffer: exam readiness (mixed + oral)
  if (input.daysRemaining <= input.bufferDays + 10) {
    if (input.masteryPct < plannerConfig.coverageMasteryGate) {
      return "coverage"; // still cover if critically low mastery
    }
    return "exam_readiness";
  }
  if (input.masteryPct < plannerConfig.coverageMasteryGate) {
    return "coverage";
  }
  const hit = input.phases.find(
    (p) =>
      input.dayOffset >= p.startDayOffset &&
      input.dayOffset <= p.endDayOffset,
  );
  if (!hit) {
    return input.phases[input.phases.length - 1]?.phase ?? "final_review";
  }
  // Mastery can skip ahead
  if (
    hit.phase === "coverage" &&
    input.masteryPct >= plannerConfig.consolidationMasteryGate
  ) {
    return "consolidation";
  }
  if (
    hit.phase === "consolidation" &&
    input.masteryPct >= plannerConfig.examMasteryGate
  ) {
    return "exam_readiness";
  }
  return hit.phase;
}

export function planTodayLoad(input: {
  phase: PlannerPhase;
  dailyMinutes: number;
  missedDays: number;
  dueReviews: number;
  contentUnits: number;
  masteryPct: number;
  difficultyIndex: number;
}): DailyLoadPlan {
  const remainingUnits = Math.ceil(
    input.contentUnits * Math.max(0.05, 1 - input.masteryPct / 100),
  );
  const catchUp =
    input.missedDays > 0
      ? Math.min(
          input.dailyMinutes * plannerConfig.maxCatchUpFraction,
          input.missedDays * input.dailyMinutes * 0.2,
        )
      : 0;

  let newTopics = 0;
  let reviewItems = 0;
  let consolidationBlocks = 0;

  switch (input.phase) {
    case "coverage":
      newTopics = Math.min(plannerConfig.maxNewTopicsPerDay, Math.max(1, remainingUnits > 0 ? 1 : 0));
      reviewItems = Math.min(12, input.dueReviews);
      consolidationBlocks = 0;
      break;
    case "consolidation":
      newTopics = remainingUnits > 8 ? 1 : 0;
      reviewItems = Math.min(plannerConfig.maxReviewsPerDay, Math.max(8, input.dueReviews));
      consolidationBlocks = 1;
      break;
    case "exam_readiness":
      newTopics = 0;
      reviewItems = Math.min(plannerConfig.maxReviewsPerDay, Math.max(10, input.dueReviews));
      consolidationBlocks = 1;
      break;
    case "final_review":
      newTopics = 0;
      reviewItems = Math.min(16, Math.max(6, input.dueReviews));
      consolidationBlocks = 0;
      break;
  }

  const rawDemand =
    newTopics * plannerConfig.minutesPerNewTopic +
    reviewItems * plannerConfig.minutesPerReview +
    consolidationBlocks * plannerConfig.minutesPerConsolidationBlock +
    catchUp;

  const maxLoad = Math.round(
    input.dailyMinutes * plannerConfig.maxDailyLoadFactor,
  );
  let scheduledMinutes = Math.round(
    Math.min(maxLoad, Math.max(input.dailyMinutes, rawDemand)),
  );
  // Prefer staying near daily budget; only bump for catch-up within cap
  if (input.missedDays === 0) {
    scheduledMinutes = Math.min(
      maxLoad,
      Math.max(input.dailyMinutes, Math.min(rawDemand, input.dailyMinutes)),
    );
  }

  const backlogCapped = rawDemand > maxLoad;
  if (backlogCapped) {
    scheduledMinutes = maxLoad;
    const room =
      scheduledMinutes -
      newTopics * plannerConfig.minutesPerNewTopic -
      consolidationBlocks * plannerConfig.minutesPerConsolidationBlock;
    reviewItems = Math.max(
      4,
      Math.min(
        reviewItems,
        Math.floor(Math.max(0, room) / plannerConfig.minutesPerReview),
      ),
    );
  }

  // After missed days: never dump full backlog — explicit note
  let noteCs: string;
  if (input.missedDays > 0 && backlogCapped) {
    noteCs = `Po ${input.missedDays} vynechaných dnech plán jsme přepočítali — dnešek drží reálný limit ${scheduledMinutes} min (ne celý backlog).`;
  } else if (input.missedDays > 0) {
    noteCs = `Plán přepočítán po ${input.missedDays} vynechaných dnech. Catch-up je omezený, ať to zůstane zvládnutelné.`;
  } else if (backlogCapped) {
    noteCs = `Dnešní zátěž zastropována na ${scheduledMinutes} min — backlog se nerozbije o strop.`;
  } else {
    noteCs = `Dnes cca ${scheduledMinutes} min v režimu ${plannerPhaseShortCs[input.phase]}.`;
  }

  void input.difficultyIndex;
  return {
    scheduledMinutes,
    rawDemandMinutes: Math.round(rawDemand),
    backlogCapped,
    newTopics,
    reviewItems,
    consolidationBlocks,
    noteCs,
  };
}

export function assessFeasibility(input: {
  availableMinutes: number;
  requiredMinutes: number;
  daysRemaining: number;
  bufferDays: number;
}): { feasibility: DeadlinePlan["feasibility"]; feasibilityCs: string } {
  if (input.daysRemaining <= 0) {
    return {
      feasibility: "at_risk",
      feasibilityCs: "Deadline je dnes nebo minul — jen final review.",
    };
  }
  const ratio =
    input.availableMinutes === 0
      ? 99
      : input.requiredMinutes / input.availableMinutes;
  if (ratio <= 0.85) {
    return {
      feasibility: "on_track",
      feasibilityCs: `Tempo sedí. Rezerva ${input.bufferDays} dní zůstává na buffer.`,
    };
  }
  if (ratio <= 1.15) {
    return {
      feasibility: "tight",
      feasibilityCs:
        "Plán je těsný — drž denní budget, backlog se smí jen mírně dohnat.",
    };
  }
  return {
    feasibility: "at_risk",
    feasibilityCs:
      "Obsah + opakování přesahují dostupný čas. Planner omezuje denní zátěž a posouvá prioritu na high-value slabiny.",
  };
}

/**
 * Main entry: build full deadline-aware plan snapshot.
 * `targetDate` must be the student's exam date — never invent one.
 */
export function buildDeadlinePlan(
  raw: PlannerInputs,
  now = new Date(),
): DeadlinePlan {
  const input = plannerInputsSchema.parse(raw);
  const todayKey = toDateKey(now);
  const target = new Date(`${input.targetDate}T12:00:00`);
  const daysRemaining = daysBetween(now, target);
  const availableDaysPerWeek =
    input.availableDaysPerWeek ?? plannerConfig.defaultAvailableDaysPerWeek;

  const materialsReadyCount = input.materialsReadyCount ?? 0;
  const materialsKnowledgePoints = input.materialsKnowledgePoints ?? 0;
  // Uploaded materials expand the effective content surface (realistic demand)
  const materialUnits = Math.min(
    40,
    Math.ceil(materialsKnowledgePoints / 12),
  );
  const effectiveContentUnits = Math.min(
    500,
    input.contentUnits + materialUnits,
  );

  const rawStudySlots = countAvailableStudyDays({
    todayKey,
    targetDate: input.targetDate,
    availableDaysPerWeek,
  });
  const bufferDays = Math.min(
    computeBufferDays(daysRemaining),
    Math.max(0, rawStudySlots > 0 ? rawStudySlots - 1 : 0),
  );
  const studyDays = Math.max(0, rawStudySlots - bufferDays);
  const availableMinutes = studyDays * input.dailyMinutes;

  const difficultyIndex =
    input.difficultyIndex ??
    estimateDifficultyIndex({
      readinessFeeling: input.readinessFeeling,
      masteryPct: input.masteryPct,
      contentUnits: effectiveContentUnits,
    });

  const reviewsNeeded = estimateReviewsNeeded({
    contentUnits: effectiveContentUnits,
    masteryPct: input.masteryPct,
    dueReviews: input.dueReviews,
  });

  const requiredMinutes = estimateRequiredMinutes({
    contentUnits: effectiveContentUnits,
    masteryPct: input.masteryPct,
    reviewsNeeded,
    difficultyIndex,
  });

  const phases = buildPhaseWindows({ todayKey, studyDays });
  const currentPhase = resolveCurrentPhase({
    phases,
    dayOffset: 0,
    masteryPct: input.masteryPct,
    daysRemaining,
    bufferDays,
  });

  const today = planTodayLoad({
    phase: currentPhase,
    dailyMinutes: input.dailyMinutes,
    missedDays: input.missedDays,
    dueReviews: input.dueReviews,
    contentUnits: effectiveContentUnits,
    masteryPct: input.masteryPct,
    difficultyIndex,
  });

  const { feasibility, feasibilityCs } = assessFeasibility({
    availableMinutes,
    requiredMinutes,
    daysRemaining,
    bufferDays,
  });

  const summaryLinesCs = [
    `Cíl: ${input.targetDate} (tvoje datum maturity — ne produktový default).`,
    `Obsah: ${effectiveContentUnits} jednotek (kurikulum${
      materialUnits > 0 ? ` + ${materialUnits} z materiálů` : ""
    }).`,
    `Odhadovaná obtížnost: ${difficultyIndex}/5.`,
    `Aktuální připravenost: ${Math.round(input.masteryPct)} %.`,
    `Dostupné dny: ${availableDaysPerWeek}/týden → ${studyDays} studijních (+ ${bufferDays} buffer).`,
    `Dostupný čas: ${availableMinutes} min (${studyDays} × ${input.dailyMinutes} min).`,
    `Potřebná opakování: ~${reviewsNeeded} (due ${input.dueReviews} + mezery).`,
  ];

  return {
    targetDate: input.targetDate,
    computedAt: now.toISOString(),
    daysRemaining,
    bufferDays,
    availableDaysPerWeek,
    studyDays,
    availableMinutes,
    requiredMinutes,
    contentUnits: effectiveContentUnits,
    difficultyIndex,
    masteryPct: input.masteryPct,
    dueReviews: input.dueReviews,
    reviewsNeeded,
    missedDays: input.missedDays,
    materialsReadyCount,
    materialsKnowledgePoints,
    currentPhase,
    currentPhaseLabelCs: plannerPhaseLabelsCs[currentPhase],
    phases,
    today,
    feasibility,
    feasibilityCs,
    recalculatedAfterMiss: input.missedDays > 0,
    summaryLinesCs,
  };
}

/** Missed calendar days since last completed study date (0 if today/yesterday ok). */
export function computeMissedDays(input: {
  lastCompletedDateKey: string | null;
  todayKey: string;
}): number {
  if (!input.lastCompletedDateKey) return 0;
  if (input.lastCompletedDateKey === input.todayKey) return 0;
  const last = new Date(`${input.lastCompletedDateKey}T12:00:00`);
  const today = new Date(`${input.todayKey}T12:00:00`);
  const diff = Math.round((today.getTime() - last.getTime()) / 86_400_000);
  if (diff <= 1) return 0;
  return diff - 1;
}
