"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import type {
  AxisPoint,
  ReconstructionDifficulty,
  ReconstructionProgress,
  StoryReconstructionPack,
} from "@/domain/learning/story-reconstruction";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  getReconstructionProgress,
  getStoryReconstructionPackBySlug,
  listStoryReconstructionPacks,
  submitReconstruction,
} from "@/server/story-reconstruction/store";

export async function listStoryReconstructionPacksAction(): Promise<
  StoryReconstructionPack[]
> {
  return listStoryReconstructionPacks();
}

export async function getStoryReconstructionSessionAction(
  slug: string,
): Promise<{
  pack: StoryReconstructionPack | null;
  progress: ReconstructionProgress | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const pack = await getStoryReconstructionPackBySlug(slug);
  const progress =
    learnerId && pack
      ? await getReconstructionProgress(learnerId, pack.id)
      : null;
  return { pack, progress, learnerId };
}

type Fail = { ok: false; error: string };

export async function submitReconstructionAction(input: {
  packSlug: string;
  storyId: string;
  difficulty: ReconstructionDifficulty;
  submittedOrder: string[];
  elapsedMs: number;
}): Promise<
  | {
      ok: true;
      progress: ReconstructionProgress;
      correct: boolean;
      expectedOrder: string[];
      axis: AxisPoint[] | null;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getStoryReconstructionPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    const result = await submitReconstruction({
      learnerId,
      pack,
      storyId: input.storyId,
      difficulty: input.difficulty,
      submittedOrder: input.submittedOrder,
      elapsedMs: Math.max(0, Math.min(600_000, Math.round(input.elapsedMs))),
    });
    track("story_reconstruction_attempt", {
      packSlug: input.packSlug,
      difficulty: input.difficulty,
      correct: result.correct,
      elapsedMs: input.elapsedMs,
    });
    if (result.correct) {
      track("story_reconstruction_completed", {
        packSlug: input.packSlug,
        difficulty: input.difficulty,
        steps: result.expectedOrder.length,
      });
    }
    revalidatePath(`/app/learn/rekonstrukce-pribehu/${input.packSlug}`);
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
