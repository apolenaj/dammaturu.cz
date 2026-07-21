"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import { masteryLevelToScore } from "@/domain/learning/learning-analytics";
import type { LessonInteractionKind } from "@/domain/learning/interactions";
import type { LessonDocument } from "@/domain/learning/lesson";
import type { LessonProgress } from "@/domain/learning/interactions";
import type { MasterySnapshot } from "@/domain/learning/mastery";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { recordLearningEvent } from "@/server/learning-analytics/store";
import { markTodayMissionStepFromActivity } from "@/server/daily-dashboard/mission-progress";
import {
  getMasteryMap,
  getProgress,
  recordLessonAction,
} from "@/server/lesson-engine/progress-store";
import { getLessonBySlug, listLessons } from "@/server/lesson-engine/store";

export type LessonActionResult =
  | {
      ok: true;
      progress: LessonProgress;
      mastery: Record<string, MasterySnapshot>;
    }
  | { ok: false; error: string };

export async function listLessonsAction(): Promise<LessonDocument[]> {
  return listLessons();
}

export async function getLessonAction(
  slug: string,
): Promise<{
  lesson: LessonDocument | null;
  progress: LessonProgress | null;
  learnerId: string | null;
}> {
  const learnerId = await getLearnerIdFromCookies();
  const lesson = await getLessonBySlug(slug);
  const progress =
    learnerId && lesson
      ? await getProgress(learnerId, lesson.id)
      : null;
  return { lesson, progress, learnerId: learnerId ?? null };
}

export async function lessonPlayerAction(input: {
  lessonSlug: string;
  blockId: string | null;
  kind: LessonInteractionKind;
  payload?: Record<string, string | number | boolean | null>;
  success?: boolean | null;
  nextBlockIndex?: number;
}): Promise<LessonActionResult> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) {
      return {
        ok: false,
        error: "Nejdřív dokonči onboarding — potřebujeme learner profil.",
      };
    }
    const lesson = await getLessonBySlug(input.lessonSlug);
    if (!lesson) return { ok: false, error: "Lekce nenalezena." };

    const priorProgress = await getProgress(learnerId, lesson.id);
    const priorMastery = await getMasteryMap(learnerId);

    const result = await recordLessonAction({
      learnerId,
      lesson,
      blockId: input.blockId,
      kind: input.kind,
      payload: input.payload,
      success: input.success,
      nextBlockIndex: input.nextBlockIndex,
    });

    track("lesson_interaction", {
      kind: input.kind,
      lessonSlug: input.lessonSlug,
      blockType: result.interaction.blockType,
    });

    if (!priorProgress) {
      await recordLearningEvent({
        learnerKey: learnerId,
        event: "lesson_started",
        method: "lesson",
        topicSlug: lesson.slug,
        itemId: lesson.id,
      });
    }
    if (input.kind === "lesson_completed") {
      await recordLearningEvent({
        learnerKey: learnerId,
        event: "lesson_completed",
        method: "lesson",
        topicSlug: lesson.slug,
        itemId: lesson.id,
        minutes: Math.max(
          1,
          Math.round(
            (Date.now() -
              new Date(priorProgress?.savedAt ?? Date.now()).getTime()) /
              60_000,
          ),
        ),
      });
      await markTodayMissionStepFromActivity({
        learnerId,
        stepKind: "learn",
      });
    }
    if (input.kind === "open_explanation") {
      await recordLearningEvent({
        learnerKey: learnerId,
        event: "hint_used",
        method: "lesson",
        topicSlug: lesson.slug,
        itemId: input.blockId ?? lesson.id,
        hintsUsed: 1,
      });
    }
    for (const [kuId, snap] of Object.entries(result.mastery)) {
      const before = priorMastery[kuId];
      const afterScore = masteryLevelToScore(snap.level);
      const beforeScore = before ? masteryLevelToScore(before.level) : 0;
      if (!before || before.level !== snap.level) {
        await recordLearningEvent({
          learnerKey: learnerId,
          event: "mastery_changed",
          method: "lesson",
          topicSlug: lesson.slug,
          itemId: kuId,
          masteryScore: afterScore,
          masteryDelta: afterScore - beforeScore,
        });
        const { recordProductEvent } = await import(
          "@/server/product-analytics/store"
        );
        const delta = afterScore - beforeScore;
        if (delta !== 0) {
          await recordProductEvent({
            learnerKey: learnerId,
            event: "mastery_improved",
            topicSlug: lesson.slug,
            masteryDelta: delta,
            featureId: "lesson",
          });
        }
      }
    }

    revalidatePath("/app/learn");
    revalidatePath(`/app/learn/${input.lessonSlug}`);
    return {
      ok: true,
      progress: result.progress,
      mastery: result.mastery,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
