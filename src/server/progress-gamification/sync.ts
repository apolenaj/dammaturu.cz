import {
  allStepsDone,
  dateKeyFromDate,
  emptyStreak,
} from "@/domain/learning/daily-dashboard";
import {
  applyTopicCompletionsFromAreas,
  buildProgressMotivationView,
  dateKeysInWeek,
  evaluateUnlockedMilestones,
  mergeMilestoneUnlocks,
  recordMissionDayXp,
  recordMockExamInState,
  syncStreakBest,
  weekStartDateKey,
  type ProgressMotivationView,
} from "@/domain/learning/progress-gamification";
import {
  getDailyMissionDay,
  getDailyStreak,
} from "@/server/daily-dashboard/store";
import { getReadinessSnapshotForLearner } from "@/server/readiness/store";
import {
  getOrCreateProgressState,
  saveProgressState,
} from "@/server/progress-gamification/store";
import {
  getSpeedBest,
  listSpeedRoundPacks,
} from "@/server/speed-round/store";

export async function countWeeklyMissionDays(
  learnerId: string,
  now = new Date(),
): Promise<number> {
  const keys = dateKeysInWeek(weekStartDateKey(now));
  let n = 0;
  for (const key of keys) {
    const day = await getDailyMissionDay(learnerId, key);
    if (day?.completedAt) n += 1;
  }
  return n;
}

export async function syncProgressMotivation(input: {
  learnerId: string;
  daysRemaining: number;
  now?: Date;
  awardMissionDayXp?: boolean;
}): Promise<ProgressMotivationView> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  let state = await getOrCreateProgressState(input.learnerId, nowIso);

  const readiness = await getReadinessSnapshotForLearner({
    learnerId: input.learnerId,
  });
  const streak =
    (await getDailyStreak(input.learnerId)) ??
    emptyStreak(input.learnerId, nowIso);

  const masteredKuCount =
    readiness?.book.units.filter((u) => u.state.band === "mastered").length ?? 0;
  const areaPcts =
    readiness?.snapshot.areas.map((a) => ({
      id: a.id,
      labelCs: a.labelCs,
      pct: a.pct,
    })) ?? [];

  state = applyTopicCompletionsFromAreas(state, areaPcts, nowIso);
  state = syncStreakBest(state, streak.longestStreak, nowIso);

  if (input.awardMissionDayXp) {
    state = recordMissionDayXp(
      state,
      dateKeyFromDate(now),
      nowIso,
    );
  }

  const packs = await listSpeedRoundPacks();
  if (packs[0]) {
    const best = await getSpeedBest(input.learnerId, packs[0].id);
    if (
      best &&
      (state.personalBests.speedRoundScore == null ||
        best.bestScore > state.personalBests.speedRoundScore)
    ) {
      state = {
        ...state,
        personalBests: {
          ...state.personalBests,
          speedRoundScore: best.bestScore,
        },
        updatedAt: nowIso,
      };
    }
  }

  const eligible = evaluateUnlockedMilestones({
    masteredKuCount,
    readinessOverallPct: readiness?.snapshot.overallPct ?? 0,
    areaPcts,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    mockExamCompletions: state.mockExamCompletions,
  });
  state = mergeMilestoneUnlocks(state, eligible, nowIso).state;
  await saveProgressState(state);

  const day = await getDailyMissionDay(
    input.learnerId,
    dateKeyFromDate(now),
  );
  const stepsDone = day?.steps.filter((s) => s.done).length ?? 0;
  const stepsTotal = day?.steps.length ?? 3;
  const dailyCompleted =
    Boolean(day?.completedAt) || (day ? allStepsDone(day.steps) : false);

  return buildProgressMotivationView({
    daysRemaining: input.daysRemaining,
    readinessPct: readiness?.snapshot.overallPct ?? null,
    masteredKuCount,
    dailyCompleted,
    dailyStepsDone: stepsDone,
    dailyStepsTotal: stepsTotal,
    weeklyMissionDays: await countWeeklyMissionDays(input.learnerId, now),
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    state,
  });
}

export async function recordMockExamCompletion(input: {
  learnerId: string;
  score: number;
  topicSlug: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  let state = await getOrCreateProgressState(input.learnerId, nowIso);
  state = recordMockExamInState(state, {
    score: input.score,
    topicSlug: input.topicSlug,
    nowIso,
  }).state;

  const readiness = await getReadinessSnapshotForLearner({
    learnerId: input.learnerId,
  });
  const streak =
    (await getDailyStreak(input.learnerId)) ??
    emptyStreak(input.learnerId, nowIso);
  const masteredKuCount =
    readiness?.book.units.filter((u) => u.state.band === "mastered").length ?? 0;
  const eligible = evaluateUnlockedMilestones({
    masteredKuCount,
    readinessOverallPct: readiness?.snapshot.overallPct ?? 0,
    areaPcts:
      readiness?.snapshot.areas.map((a) => ({
        id: a.id,
        labelCs: a.labelCs,
        pct: a.pct,
      })) ?? [],
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    mockExamCompletions: state.mockExamCompletions,
  });
  state = mergeMilestoneUnlocks(state, eligible, nowIso).state;
  await saveProgressState(state);
}
