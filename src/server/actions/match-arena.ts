"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import type {
  MatchArenaPack,
  MatchArenaSession,
  MatchGradeResult,
  MatchReviewQueue,
  MatchSessionSummary,
} from "@/domain/learning/match-arena";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  createMatchSession,
  getMatchArenaPackBySlug,
  getReviewQueue,
  listMatchArenaPacks,
  submitMatch,
} from "@/server/match-arena/store";

export async function listMatchArenaPacksAction(): Promise<MatchArenaPack[]> {
  return listMatchArenaPacks();
}

export async function getMatchArenaSessionAction(slug: string): Promise<{
  pack: MatchArenaPack | null;
  reviewQueue: MatchReviewQueue | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const pack = await getMatchArenaPackBySlug(slug);
  const reviewQueue =
    learnerId && pack ? await getReviewQueue(learnerId, pack.id) : null;
  return { pack, reviewQueue, learnerId };
}

type Fail = { ok: false; error: string };

export async function startMatchArenaAction(input: {
  packSlug: string;
  reviewMode?: boolean;
}): Promise<
  | {
      ok: true;
      session: MatchArenaSession;
      reviewQueue: MatchReviewQueue;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getMatchArenaPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    if (
      input.reviewMode &&
      (!(await getReviewQueue(learnerId, pack.id))?.pairIds.length)
    ) {
      return { ok: false, error: "Review queue je prázdná." };
    }
    const result = await createMatchSession({
      learnerId,
      pack,
      reviewMode: input.reviewMode,
    });
    track("match_arena_session_started", {
      packSlug: input.packSlug,
      mode: result.session.mode,
      openPairs: result.session.openPairIds.length,
    });
    revalidatePath(`/app/learn/match-arena/${input.packSlug}`);
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function submitMatchAction(input: {
  packSlug: string;
  sessionId: string;
  leftId: string;
  rightId: string;
  elapsedMs: number;
}): Promise<
  | {
      ok: true;
      session: MatchArenaSession;
      grade: MatchGradeResult;
      reviewQueue: MatchReviewQueue;
      advancedRound: boolean;
      completed: boolean;
      summary: MatchSessionSummary | null;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getMatchArenaPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    const result = await submitMatch({
      learnerId,
      pack,
      sessionId: input.sessionId,
      leftId: input.leftId,
      rightId: input.rightId,
      elapsedMs: Math.max(0, Math.min(600_000, Math.round(input.elapsedMs))),
    });
    track("match_arena_match", {
      packSlug: input.packSlug,
      correct: result.grade.correct,
      kind: result.grade.pair.kind,
      elapsedMs: input.elapsedMs,
      completed: result.completed,
    });
    const { mapToExperimentMethod } = await import(
      "@/server/beta-experiment/map-method"
    );
    const { recordExperimentActivity } = await import(
      "@/server/beta-experiment/record"
    );
    await recordExperimentActivity({
      learnerId,
      method: mapToExperimentMethod("match_arena"),
      topicSlug: input.packSlug,
      itemId: result.grade.pair.id,
      correct: result.grade.correct,
      score01: result.grade.correct ? 1 : 0,
      minutes: 1,
      kind: "practice",
    });
    if (result.completed && result.summary) {
      track("match_arena_session_completed", {
        packSlug: input.packSlug,
        accuracyPct: result.summary.accuracyPct,
        avgMs: result.summary.avgMs,
        weakPairs: result.summary.weakPairs.length,
      });
    }
    revalidatePath(`/app/learn/match-arena/${input.packSlug}`);
    revalidatePath("/app/progress/experiment");
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
