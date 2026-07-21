"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import type {
  SpeedRoundBest,
  SpeedRoundPack,
  SpeedRoundSession,
  SpeedRoundSummary,
} from "@/domain/learning/speed-round";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  createSpeedSession,
  endSpeedSession,
  getSpeedBest,
  getSpeedRoundPackBySlug,
  listSpeedRoundPacks,
  submitSpeedAnswer,
} from "@/server/speed-round/store";

export async function listSpeedRoundPacksAction(): Promise<SpeedRoundPack[]> {
  return listSpeedRoundPacks();
}

export async function getSpeedRoundSessionAction(slug: string): Promise<{
  pack: SpeedRoundPack | null;
  best: SpeedRoundBest | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const pack = await getSpeedRoundPackBySlug(slug);
  const best =
    learnerId && pack ? await getSpeedBest(learnerId, pack.id) : null;
  return { pack, best, learnerId };
}

type Fail = { ok: false; error: string };

export async function startSpeedRoundAction(input: {
  packSlug: string;
}): Promise<{ ok: true; session: SpeedRoundSession } | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getSpeedRoundPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    const session = await createSpeedSession({ learnerId, pack });
    track("speed_round_started", {
      packSlug: input.packSlug,
      questions: pack.questions.length,
    });
    revalidatePath(`/app/learn/speed-round/${input.packSlug}`);
    return { ok: true, session };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function submitSpeedAnswerAction(input: {
  packSlug: string;
  sessionId: string;
  questionId: string;
  optionId: string;
  responseMs: number;
}): Promise<
  | {
      ok: true;
      session: SpeedRoundSession;
      correct: boolean;
      completed: boolean;
      summary: SpeedRoundSummary | null;
      best: SpeedRoundBest | null;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getSpeedRoundPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    const result = await submitSpeedAnswer({
      learnerId,
      pack,
      sessionId: input.sessionId,
      questionId: input.questionId,
      optionId: input.optionId,
      responseMs: input.responseMs,
    });
    track("speed_round_answer", {
      packSlug: input.packSlug,
      correct: result.correct,
      responseMs: input.responseMs,
      completed: result.completed,
    });
    if (result.completed && result.summary) {
      track("speed_round_completed", {
        packSlug: input.packSlug,
        score: result.summary.score,
        accuracyPct: result.summary.accuracyPct,
        bestStreak: result.summary.bestStreak,
        avgResponseMs: result.summary.avgResponseMs,
      });
    }
    revalidatePath(`/app/learn/speed-round/${input.packSlug}`);
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function endSpeedRoundAction(input: {
  packSlug: string;
  sessionId: string;
}): Promise<
  | {
      ok: true;
      session: SpeedRoundSession;
      summary: SpeedRoundSummary;
      best: SpeedRoundBest;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getSpeedRoundPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    const result = await endSpeedSession({
      learnerId,
      pack,
      sessionId: input.sessionId,
    });
    track("speed_round_completed", {
      packSlug: input.packSlug,
      score: result.summary.score,
      accuracyPct: result.summary.accuracyPct,
      bestStreak: result.summary.bestStreak,
      avgResponseMs: result.summary.avgResponseMs,
      timedOut: true,
    });
    revalidatePath(`/app/learn/speed-round/${input.packSlug}`);
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
