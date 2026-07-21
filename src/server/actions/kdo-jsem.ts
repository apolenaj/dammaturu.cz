"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import type {
  KdoJsemPack,
  KdoJsemProgress,
} from "@/domain/learning/kdo-jsem";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  getKdoJsemPackBySlug,
  getKdoJsemProgress,
  listKdoJsemPacks,
  resetKdoJsemProgress,
  submitKdoJsemGuess,
} from "@/server/kdo-jsem/store";

export async function listKdoJsemPacksAction(): Promise<KdoJsemPack[]> {
  return listKdoJsemPacks();
}

export async function getKdoJsemSessionAction(slug: string): Promise<{
  pack: KdoJsemPack | null;
  progress: KdoJsemProgress | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const pack = await getKdoJsemPackBySlug(slug);
  const progress =
    learnerId && pack ? await getKdoJsemProgress(learnerId, pack.id) : null;
  return { pack, progress, learnerId };
}

type Fail = { ok: false; error: string };

export async function submitKdoJsemGuessAction(input: {
  packSlug: string;
  mysteryId: string;
  guess: string;
  hintsRevealed: number;
}): Promise<
  | {
      ok: true;
      progress: KdoJsemProgress;
      correct: boolean;
      points: number;
      answerName: string | null;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getKdoJsemPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    const result = await submitKdoJsemGuess({
      learnerId,
      pack,
      mysteryId: input.mysteryId,
      guess: input.guess,
      hintsRevealed: input.hintsRevealed,
    });
    track("kdo_jsem_guess", {
      packSlug: input.packSlug,
      correct: result.correct,
      points: result.points,
      hintsRevealed: input.hintsRevealed,
    });
    revalidatePath(`/app/learn/kdo-jsem/${input.packSlug}`);
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function resetKdoJsemProgressAction(input: {
  packSlug: string;
}): Promise<{ ok: true; progress: KdoJsemProgress } | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getKdoJsemPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    const progress = await resetKdoJsemProgress({ learnerId, pack });
    revalidatePath(`/app/learn/kdo-jsem/${input.packSlug}`);
    return { ok: true, progress };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
