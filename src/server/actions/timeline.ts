"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import type {
  TimelineMode,
  TimelinePack,
  TimelineProgress,
} from "@/domain/learning/timeline";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  getTimelinePackBySlug,
  getTimelineProgress,
  listTimelinePacks,
  recordTimelineQuizAnswer,
  recordTimelineReorder,
  recordTimelineView,
  setTimelineMode,
} from "@/server/timeline/store";

export async function listTimelinePacksAction(): Promise<TimelinePack[]> {
  return listTimelinePacks();
}

export async function getTimelineSessionAction(slug: string): Promise<{
  pack: TimelinePack | null;
  progress: TimelineProgress | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const pack = await getTimelinePackBySlug(slug);
  const progress =
    learnerId && pack ? await getTimelineProgress(learnerId, pack.id) : null;
  return { pack, progress, learnerId };
}

type Ok = { ok: true; progress: TimelineProgress };
type Fail = { ok: false; error: string };

export async function timelineSetModeAction(input: {
  packSlug: string;
  mode: TimelineMode;
}): Promise<Ok | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getTimelinePackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Timeline nenalezena." };
    const progress = await setTimelineMode({
      learnerId,
      pack,
      mode: input.mode,
    });
    track("timeline_mode", { packSlug: input.packSlug, mode: input.mode });
    revalidatePath(`/app/learn/casova-osa/${input.packSlug}`);
    return { ok: true, progress };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function timelineViewEventAction(input: {
  packSlug: string;
  eventId: string;
}): Promise<Ok | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getTimelinePackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Timeline nenalezena." };
    const progress = await recordTimelineView({
      learnerId,
      pack,
      eventId: input.eventId,
    });
    return { ok: true, progress };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function timelineQuizAnswerAction(input: {
  packSlug: string;
  correct: boolean;
}): Promise<Ok | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getTimelinePackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Timeline nenalezena." };
    const progress = await recordTimelineQuizAnswer({
      learnerId,
      pack,
      correct: input.correct,
    });
    track("timeline_quiz", {
      packSlug: input.packSlug,
      correct: input.correct,
    });
    const { mapToExperimentMethod } = await import(
      "@/server/beta-experiment/map-method"
    );
    const { recordExperimentActivity } = await import(
      "@/server/beta-experiment/record"
    );
    await recordExperimentActivity({
      learnerId,
      method: mapToExperimentMethod("timeline"),
      topicSlug: input.packSlug,
      correct: input.correct,
      score01: input.correct ? 1 : 0,
      minutes: 1,
      kind: "practice",
    });
    revalidatePath(`/app/learn/casova-osa/${input.packSlug}`);
    revalidatePath("/app/progress/experiment");
    return { ok: true, progress };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function timelineReorderAction(input: {
  packSlug: string;
  success: boolean;
}): Promise<Ok | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getTimelinePackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Timeline nenalezena." };
    const progress = await recordTimelineReorder({
      learnerId,
      pack,
      success: input.success,
    });
    track("timeline_reorder", {
      packSlug: input.packSlug,
      success: input.success,
    });
    revalidatePath(`/app/learn/casova-osa/${input.packSlug}`);
    return { ok: true, progress };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
