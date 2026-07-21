import {
  allStepsDone,
  dateKeyFromDate,
  emptyStreak,
} from "@/domain/learning/daily-dashboard";
import {
  applyReadinessBaselines,
  applyTopicCompletionsFromAreas,
  buildProgressMotivationView,
  celebrateMilestoneUnlocks,
  celebrateMissionDay,
  celebrateMockExam,
  celebrateStreakMarks,
  celebrateTopicCompletions,
  celebrateWeeklyGoalIfMet,
  dateKeysInWeek,
  evaluateUnlockedMilestones,
  mergeMilestoneUnlocks,
  recordMissionDayXp,
  recordMockExamInState,
  syncStreakBest,
  weekStartDateKey,
  type LearningCelebration,
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

export type ProgressSyncResult = {
  view: ProgressMotivationView;
  celebrations: LearningCelebration[];
};

/**
 * Sync motivation state from real signals.
 * Awards secondary XP only for real events — never writes readiness scores.
 */
export async function syncProgressMotivation(input: {
  learnerId: string;
  daysRemaining: number;
  now?: Date;
  awardMissionDayXp?: boolean;
}): Promise<ProgressSyncResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const celebrations: LearningCelebration[] = [];
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
  const overallPct = readiness?.snapshot.overallPct ?? null;

  const topics = applyTopicCompletionsFromAreas(state, areaPcts, nowIso);
  state = topics.state;
  celebrations.push(...celebrateTopicCompletions(topics.justCompleted));

  const readinessDiff = applyReadinessBaselines(state, {
    overallPct,
    areas: areaPcts,
    nowIso,
  });
  state = readinessDiff.state;
  celebrations.push(...readinessDiff.celebrations);

  state = syncStreakBest(state, streak.longestStreak, nowIso);

  const awardedMission =
    Boolean(input.awardMissionDayXp) &&
    state.lastMissionXpDateKey !== dateKeyFromDate(now);
  if (input.awardMissionDayXp) {
    state = recordMissionDayXp(state, dateKeyFromDate(now), nowIso);
    if (awardedMission) {
      celebrations.push(celebrateMissionDay(dateKeyFromDate(now)));
    }
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
    readinessOverallPct: overallPct ?? 0,
    areaPcts,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    mockExamCompletions: state.mockExamCompletions,
  });
  const unlocked = mergeMilestoneUnlocks(state, eligible, nowIso);
  state = unlocked.state;
  celebrations.push(...celebrateMilestoneUnlocks(unlocked.justUnlocked));

  const streakMarks = celebrateStreakMarks(
    state,
    streak.currentStreak,
    nowIso,
  );
  state = streakMarks.state;
  celebrations.push(...streakMarks.celebrations);

  const weeklyDays = await countWeeklyMissionDays(input.learnerId, now);
  const weekly = celebrateWeeklyGoalIfMet(
    state,
    weeklyDays,
    weekStartDateKey(now),
    nowIso,
  );
  state = weekly.state;
  celebrations.push(...weekly.celebrations);

  await saveProgressState(state);

  const day = await getDailyMissionDay(
    input.learnerId,
    dateKeyFromDate(now),
  );
  const stepsDone = day?.steps.filter((s) => s.done).length ?? 0;
  const stepsTotal = day?.steps.length ?? 3;
  const dailyCompleted =
    Boolean(day?.completedAt) || (day ? allStepsDone(day.steps) : false);

  const view = buildProgressMotivationView({
    daysRemaining: input.daysRemaining,
    readinessPct: overallPct,
    masteredKuCount,
    dailyCompleted,
    dailyStepsDone: stepsDone,
    dailyStepsTotal: stepsTotal,
    weeklyMissionDays: weeklyDays,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    state,
    celebrations,
  });

  return { view, celebrations };
}

export async function recordMockExamCompletion(input: {
  learnerId: string;
  score: number;
  topicSlug: string;
}): Promise<{ celebrations: LearningCelebration[] }> {
  const nowIso = new Date().toISOString();
  const celebrations: LearningCelebration[] = [];
  let state = await getOrCreateProgressState(input.learnerId, nowIso);
  const wasFirst = state.mockExamCompletions === 0;
  const recorded = recordMockExamInState(state, {
    score: input.score,
    topicSlug: input.topicSlug,
    nowIso,
  });
  state = recorded.state;
  celebrations.push(
    ...celebrateMockExam({
      isFirst: wasFirst,
      isPersonalBest: recorded.isPersonalBest,
      score: input.score,
      topicSlug: input.topicSlug,
      nowIso,
    }),
  );

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
  const unlocked = mergeMilestoneUnlocks(state, eligible, nowIso);
  state = unlocked.state;
  celebrations.push(...celebrateMilestoneUnlocks(unlocked.justUnlocked));
  await saveProgressState(state);
  return { celebrations };
}
