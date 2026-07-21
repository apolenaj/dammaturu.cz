/**
 * Legacy lesson-interaction mastery snapshots (D-018).
 * New surfaces should use mastery-engine.ts (D-031): score 0–100 + bands.
 * Page/navigation kinds never raise level above exposed — same spirit as
 * mastery-engine passive rule (score unchanged on page_view).
 */
import { masteryLevels } from "@/domain/content/schemas";
import type { LessonInteractionKind } from "@/domain/learning/interactions";

export type MasteryLevel = (typeof masteryLevels)[number];

export type MasterySnapshot = {
  knowledgeUnitId: string;
  level: MasteryLevel;
  evidenceCount: number;
  correctStreak: number;
  lapses: number;
  lastAttemptAt: string | null;
  dueAt: string | null;
  updatedAt: string;
};

const levelIndex = (level: MasteryLevel) => masteryLevels.indexOf(level);

/**
 * Pure mastery update from a lesson interaction.
 * Passive read/continue alone never goes above `exposed`.
 */
export function applyInteractionToMastery(
  state: MasterySnapshot | null,
  params: {
    knowledgeUnitId: string;
    kind: LessonInteractionKind;
    at: string;
    /** quiz/flashcard/recall outcome */
    success?: boolean | null;
  },
): MasterySnapshot {
  const now = params.at;
  const base: MasterySnapshot = state ?? {
    knowledgeUnitId: params.knowledgeUnitId,
    level: "unknown",
    evidenceCount: 0,
    correctStreak: 0,
    lapses: 0,
    lastAttemptAt: null,
    dueAt: null,
    updatedAt: now,
  };

  const next: MasterySnapshot = { ...base, updatedAt: now };

  switch (params.kind) {
    case "continue":
    case "back":
    case "save":
    case "open_explanation":
      // Navigation / help — no mastery change
      return next;

    case "understand":
      next.evidenceCount += 1;
      next.lastAttemptAt = now;
      if (next.level === "unknown") next.level = "exposed";
      return next;

    case "dont_know":
      next.evidenceCount += 1;
      next.lastAttemptAt = now;
      next.lapses += 1;
      next.correctStreak = 0;
      if (next.level === "unknown") next.level = "exposed";
      else if (levelIndex(next.level) > levelIndex("exposed")) {
        next.level = masteryLevels[levelIndex(next.level) - 1]!;
      }
      next.dueAt = now; // due immediately for error loop
      return next;

    case "quiz_answer":
    case "flashcard_grade":
    case "recall_submit":
    case "teach_back_submit":
    case "exit_submit": {
      next.evidenceCount += 1;
      next.lastAttemptAt = now;
      if (params.success === true) {
        next.correctStreak += 1;
        if (next.level === "unknown" || next.level === "exposed") {
          next.level = "recall_fragile";
        } else if (
          next.level === "recall_fragile" &&
          next.correctStreak >= 3
        ) {
          next.level = "recall_stable";
        }
        // schedule soft due in 1 day
        next.dueAt = new Date(
          new Date(now).getTime() + 24 * 60 * 60 * 1000,
        ).toISOString();
      } else if (params.success === false) {
        next.lapses += 1;
        next.correctStreak = 0;
        if (next.level === "unknown") next.level = "exposed";
        else if (levelIndex(next.level) > levelIndex("exposed")) {
          next.level = masteryLevels[levelIndex(next.level) - 1]!;
        }
        next.dueAt = now;
      } else {
        // submitted without grade → exposed at most
        if (next.level === "unknown") next.level = "exposed";
      }
      return next;
    }

    case "lesson_completed":
      next.evidenceCount += 1;
      if (next.level === "unknown") next.level = "exposed";
      return next;

    default:
      return next;
  }
}
