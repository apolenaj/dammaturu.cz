import {
  allStepsDone,
  applyStreakOnComplete,
  buildDailyMissionPlan,
  dailyMissionDaySchema,
  dailyStreakSchema,
  dateKeyFromDate,
  emptyStreak,
  estimateKnowledgeStrengthened,
  type DailyMissionDay,
  type DailyStreak,
  type MissionSignals,
} from "@/domain/learning/daily-dashboard";
import { promises as fs } from "node:fs";
import path from "node:path";

export const DAILY_DASHBOARD_DIR = path.join(
  process.cwd(),
  "data",
  "daily-dashboard",
);
const DAYS_DIR = path.join(DAILY_DASHBOARD_DIR, "days");
const STREAKS_DIR = path.join(DAILY_DASHBOARD_DIR, "streaks");

async function ensureDirs() {
  await fs.mkdir(DAYS_DIR, { recursive: true });
  await fs.mkdir(STREAKS_DIR, { recursive: true });
}

function dayPath(learnerId: string, dateKey: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) throw new Error("Neplatné learner id");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error("Neplatné dateKey");
  return path.join(DAYS_DIR, `${learnerId}__${dateKey}.json`);
}

function streakPath(learnerId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) throw new Error("Neplatné learner id");
  return path.join(STREAKS_DIR, `${learnerId}.json`);
}

export async function getDailyMissionDay(
  learnerId: string,
  dateKey: string,
): Promise<DailyMissionDay | null> {
  try {
    const raw = JSON.parse(await fs.readFile(dayPath(learnerId, dateKey), "utf8"));
    if (raw && typeof raw === "object" && Array.isArray(raw.steps)) {
      raw.budgetMinutes = raw.budgetMinutes ?? 30;
      raw.plannerMode = raw.plannerMode ?? "min_30";
      raw.steps = raw.steps.map((s: Record<string, unknown>) => ({
        ...s,
        priority: s.priority ?? 3,
        kind:
          s.kind === "learn" ||
          s.kind === "review" ||
          s.kind === "test" ||
          s.kind === "mistakes" ||
          s.kind === "exam"
            ? s.kind
            : "learn",
      }));
    }
    return dailyMissionDaySchema.parse(raw);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveDailyMissionDay(day: DailyMissionDay): Promise<void> {
  const validated = dailyMissionDaySchema.parse(day);
  await ensureDirs();
  const file = dayPath(validated.learnerId, validated.dateKey);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function getDailyStreak(
  learnerId: string,
): Promise<DailyStreak | null> {
  try {
    return dailyStreakSchema.parse(
      JSON.parse(await fs.readFile(streakPath(learnerId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveDailyStreak(streak: DailyStreak): Promise<void> {
  const validated = dailyStreakSchema.parse(streak);
  await ensureDirs();
  const file = streakPath(validated.learnerId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

function buildMissionDayRecord(input: {
  learnerId: string;
  dateKey: string;
  signals: MissionSignals;
  dailyMinutes: number;
  nowIso: string;
}): DailyMissionDay {
  const plan = buildDailyMissionPlan({
    signals: input.signals,
    dailyMinutes: input.dailyMinutes,
  });

  return {
    learnerId: input.learnerId,
    dateKey: input.dateKey,
    steps: plan.steps.map((s) => ({ ...s, done: false })),
    budgetMinutes: plan.budgetMinutes,
    plannerMode: input.signals.plannerMode ?? "min_30",
    estimatedItems: input.signals.estimatedItems,
    estimateCs: input.signals.estimateCs,
    compositionCs: input.signals.compositionCs,
    replanNoteCs: input.signals.replanNoteCs ?? null,
    completedAt: null,
    knowledgeStrengthened: 0,
    updatedAt: input.nowIso,
  };
}

export async function getOrCreateTodayMission(input: {
  learnerId: string;
  signals: MissionSignals;
  dailyMinutes: number;
  now?: Date;
  /** Force rebuild (mode change / gentle auto-replan). Never guilt. */
  forceRebuild?: boolean;
}): Promise<DailyMissionDay> {
  const now = input.now ?? new Date();
  const dateKey = dateKeyFromDate(now);
  const existing = await getDailyMissionDay(input.learnerId, dateKey);
  const mode = input.signals.plannerMode ?? "min_30";

  if (existing?.completedAt) {
    return existing;
  }

  if (existing && !input.forceRebuild) {
    if ((existing.plannerMode ?? "min_30") === mode) {
      return existing;
    }
  }

  const day = buildMissionDayRecord({
    learnerId: input.learnerId,
    dateKey,
    signals: input.signals,
    dailyMinutes: input.dailyMinutes,
    nowIso: now.toISOString(),
  });

  // If rebuilding unfinished day, keep done flags for matching step ids
  if (existing) {
    const doneIds = new Set(existing.steps.filter((s) => s.done).map((s) => s.id));
    day.steps = day.steps.map((s) =>
      doneIds.has(s.id) ? { ...s, done: true } : s,
    );
    day.knowledgeStrengthened = estimateKnowledgeStrengthened(day.steps);
  }

  await saveDailyMissionDay(day);
  return day;
}

export async function markDailyStepDone(input: {
  learnerId: string;
  dateKey: string;
  stepId: string;
}): Promise<DailyMissionDay> {
  const day = await getDailyMissionDay(input.learnerId, input.dateKey);
  if (!day) throw new Error("Mise nenalezena.");
  const nowIso = new Date().toISOString();
  const steps = day.steps.map((s) =>
    s.id === input.stepId ? { ...s, done: true } : s,
  );
  const strengthened = estimateKnowledgeStrengthened(steps);
  const completed = allStepsDone(steps);
  const next: DailyMissionDay = {
    ...day,
    steps,
    knowledgeStrengthened: strengthened,
    completedAt: completed ? (day.completedAt ?? nowIso) : day.completedAt,
    updatedAt: nowIso,
  };
  await saveDailyMissionDay(next);

  if (completed && !day.completedAt) {
    const streak =
      (await getDailyStreak(input.learnerId)) ??
      emptyStreak(input.learnerId, nowIso);
    await saveDailyStreak(
      applyStreakOnComplete(streak, input.dateKey, nowIso),
    );
  }
  return next;
}

export async function completeDailyMission(input: {
  learnerId: string;
  dateKey: string;
}): Promise<DailyMissionDay> {
  const day = await getDailyMissionDay(input.learnerId, input.dateKey);
  if (!day) throw new Error("Mise nenalezena.");
  if (!allStepsDone(day.steps)) {
    throw new Error("Nejdřív dokonči všechny kroky mise.");
  }
  const nowIso = new Date().toISOString();
  const next: DailyMissionDay = {
    ...day,
    completedAt: day.completedAt ?? nowIso,
    knowledgeStrengthened: estimateKnowledgeStrengthened(day.steps),
    updatedAt: nowIso,
  };
  await saveDailyMissionDay(next);
  const streak =
    (await getDailyStreak(input.learnerId)) ??
    emptyStreak(input.learnerId, nowIso);
  await saveDailyStreak(applyStreakOnComplete(streak, input.dateKey, nowIso));
  return next;
}
