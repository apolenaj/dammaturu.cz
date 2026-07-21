"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import type { StoryPack, StoryProgress } from "@/domain/learning/story-mode";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  answerStoryChoice,
  continueStoryBeat,
  getStoryPackBySlug,
  getStoryProgress,
  listStoryPacks,
} from "@/server/story-mode/store";

export async function listStoryPacksAction(): Promise<StoryPack[]> {
  return listStoryPacks();
}

export async function getStorySessionAction(slug: string): Promise<{
  pack: StoryPack | null;
  progress: StoryProgress | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const pack = await getStoryPackBySlug(slug);
  const progress =
    learnerId && pack ? await getStoryProgress(learnerId, pack.id) : null;
  return { pack, progress, learnerId };
}

export type StoryActionResult =
  | { ok: true; progress: StoryProgress }
  | { ok: false; error: string };

export async function storyContinueAction(input: {
  packSlug: string;
  beatId: string;
}): Promise<StoryActionResult> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getStoryPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Příběh nenalezen." };
    const progress = await continueStoryBeat({
      learnerId,
      pack,
      beatId: input.beatId,
    });
    track("story_mode_continue", { packSlug: input.packSlug });
    revalidatePath(`/app/learn/pribeh/${input.packSlug}`);
    return { ok: true, progress };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function storyAnswerAction(input: {
  packSlug: string;
  beatId: string;
  choiceIndex: number;
  /** For multi-item checkpoint */
  answeredItemCount?: number;
  totalItems?: number;
}): Promise<StoryActionResult> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getStoryPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Příběh nenalezen." };
    const beat = pack.beats.find((b) => b.id === input.beatId);
    if (!beat) return { ok: false, error: "Beat nenalezen." };

    let correct = false;
    if (beat.type === "what_next") {
      const opt = beat.options[input.choiceIndex];
      if (!opt) return { ok: false, error: "Neplatná volba." };
      correct = opt.isCorrect;
    } else if (beat.type === "checkpoint") {
      const itemIndex = (input.answeredItemCount ?? 1) - 1;
      const item = beat.items[itemIndex];
      if (!item) return { ok: false, error: "Položka nenalezena." };
      correct = input.choiceIndex === item.correctIndex;
    } else {
      return { ok: false, error: "Tento beat se nehodnotí volbou." };
    }

    const completeBeat =
      beat.type !== "checkpoint" ||
      (input.answeredItemCount ?? 1) >= (input.totalItems ?? 1);

    const progress = await answerStoryChoice({
      learnerId,
      pack,
      beatId: input.beatId,
      correct,
      completeBeat,
    });

    track("story_mode_answer", {
      packSlug: input.packSlug,
      correct,
      successRate:
        progress.checksAnswered > 0
          ? progress.checksCorrect / progress.checksAnswered
          : null,
    });
    const { mapToExperimentMethod } = await import(
      "@/server/beta-experiment/map-method"
    );
    const { recordExperimentActivity } = await import(
      "@/server/beta-experiment/record"
    );
    await recordExperimentActivity({
      learnerId,
      method: mapToExperimentMethod("story_mode"),
      topicSlug: input.packSlug,
      itemId: input.beatId,
      correct,
      score01: correct ? 1 : 0,
      minutes: 2,
      kind: "practice",
    });
    revalidatePath(`/app/learn/pribeh/${input.packSlug}`);
    revalidatePath("/app/progress/experiment");
    return { ok: true, progress };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
