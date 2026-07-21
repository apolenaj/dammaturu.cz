"use server";

import { pickOneMinuteStudy, type OneMinuteStudyPlan } from "@/domain/learning/one-minute-study";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getReviewHubAction } from "@/server/actions/flashcards";
import { getSpacedDueSummaryAction } from "@/server/actions/spaced-repetition";
import { getCermatPack } from "@/server/cermat-prep/store";
import { listSpeedRoundPacks } from "@/server/speed-round/store";

export async function getOneMinuteStudyAction(): Promise<{
  plan: OneMinuteStudyPlan;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const [reviewHub, due, pack, speedPacks] = await Promise.all([
    getReviewHubAction(),
    getSpacedDueSummaryAction(),
    getCermatPack().catch(() => null),
    listSpeedRoundPacks().catch(() => [] as Awaited<ReturnType<typeof listSpeedRoundPacks>>),
  ]);

  const flashcardDueCount = reviewHub.stats.reduce((n, s) => n + s.due, 0);
  const reviewDueCount = due.summary?.dueCount ?? 0;
  const firstSpeed = speedPacks[0];

  const plan = pickOneMinuteStudy({
    flashcardDueCount,
    reviewDueCount,
    hasCermat: Boolean(pack && pack.items.length > 0),
    hasSpeedRound: Boolean(firstSpeed),
    speedRoundHref: firstSpeed
      ? `/app/learn/speed-round/${firstSpeed.slug}`
      : null,
  });

  return { plan, learnerId };
}
