import { randomUUID } from "node:crypto";
import type { LearningEvent } from "@/domain/learning/learning-analytics";
import {
  appendLearningEvent,
  clearLearningAnalyticsForTests,
} from "@/server/learning-analytics/store";

/** Seed learning analytics events for admin dashboard (privacy-safe). */
export async function seedLearningAnalytics(input?: {
  learnerKey?: string;
  reset?: boolean;
}): Promise<{ learnerKey: string; eventCount: number }> {
  if (input?.reset) {
    await clearLearningAnalyticsForTests();
  }

  const learnerKey = input?.learnerKey ?? "la-demo-learner";
  const learnerB = "la-demo-learner-b";

  const templates: Array<Omit<LearningEvent, "id">> = [
    {
      learnerKey,
      event: "lesson_started",
      method: "lesson",
      topicSlug: "romantismus",
      itemId: "lesson-homonyma",
      minutes: 1,
      dateKey: "2026-07-15",
      at: "2026-07-15T10:00:00.000Z",
    },
    {
      learnerKey,
      event: "lesson_completed",
      method: "lesson",
      topicSlug: "romantismus",
      itemId: "lesson-homonyma",
      minutes: 18,
      dateKey: "2026-07-15",
      at: "2026-07-15T10:20:00.000Z",
    },
    {
      learnerKey,
      event: "mastery_changed",
      method: "lesson",
      topicSlug: "romantismus",
      itemId: "ku-romantismus-1",
      masteryScore: 40,
      masteryDelta: 20,
      dateKey: "2026-07-15",
      at: "2026-07-15T10:21:00.000Z",
    },
    {
      learnerKey,
      event: "lesson_started",
      method: "lesson",
      topicSlug: "realismus",
      itemId: "lesson-realismus",
      dateKey: "2026-07-16",
      at: "2026-07-16T11:00:00.000Z",
    },
    {
      learnerKey,
      event: "session_drop_off",
      method: "lesson",
      topicSlug: "realismus",
      dropOffAt: "/app/learn/realismus#block-3",
      dateKey: "2026-07-16",
      at: "2026-07-16T11:08:00.000Z",
    },
    {
      learnerKey,
      event: "session_drop_off",
      method: "lesson",
      topicSlug: "realismus",
      dropOffAt: "/app/learn/realismus#block-3",
      dateKey: "2026-07-17",
      at: "2026-07-17T09:00:00.000Z",
    },
    {
      learnerKey,
      event: "session_drop_off",
      method: "simulation",
      dropOffAt: "/app/simulation#oral",
      dateKey: "2026-07-18",
      at: "2026-07-18T14:00:00.000Z",
    },
    // Question quality: too easy + too hard + weak topic
    ...buildQuestionSeries(learnerKey, "q-easy-1", "jazyk", true, 6),
    ...buildQuestionSeries(learnerKey, "q-hard-1", "rozbory", false, 6),
    ...buildQuestionSeries(learnerKey, "q-ok-1", "romantismus", true, 4, 1),
    {
      learnerKey,
      event: "hint_used",
      method: "lesson",
      topicSlug: "rozbory",
      itemId: "q-hard-1",
      hintsUsed: 1,
      dateKey: "2026-07-19",
      at: "2026-07-19T12:00:00.000Z",
    },
    {
      learnerKey,
      event: "flashcard_rating",
      method: "flashcards",
      topicSlug: "romantismus",
      itemId: "card-1",
      rating: 5,
      minutes: 1,
      dateKey: "2026-07-18",
      at: "2026-07-18T16:00:00.000Z",
    },
    {
      learnerKey,
      event: "flashcard_rating",
      method: "flashcards",
      topicSlug: "romantismus",
      itemId: "card-2",
      rating: 3,
      dateKey: "2026-07-18",
      at: "2026-07-18T16:01:00.000Z",
    },
    {
      learnerKey,
      event: "flashcard_rating",
      method: "flashcards",
      topicSlug: "romantismus",
      itemId: "card-3",
      rating: 1,
      dateKey: "2026-07-18",
      at: "2026-07-18T16:02:00.000Z",
    },
    {
      learnerKey,
      event: "review_completed",
      method: "flashcards",
      topicSlug: "romantismus",
      rating: 4,
      minutes: 12,
      dateKey: "2026-07-18",
      at: "2026-07-18T16:15:00.000Z",
    },
    {
      learnerKey,
      event: "flashcard_rating",
      method: "spaced_review",
      topicSlug: "realismus",
      rating: 1,
      dateKey: "2026-07-19",
      at: "2026-07-19T17:00:00.000Z",
    },
    {
      learnerKey,
      event: "review_completed",
      method: "spaced_review",
      topicSlug: "realismus",
      rating: 2,
      minutes: 15,
      dateKey: "2026-07-19",
      at: "2026-07-19T17:20:00.000Z",
    },
    {
      learnerKey,
      event: "mastery_changed",
      method: "spaced_review",
      topicSlug: "realismus",
      masteryScore: 60,
      masteryDelta: 10,
      dateKey: "2026-07-19",
      at: "2026-07-19T17:21:00.000Z",
    },
    {
      learnerKey,
      event: "study_plan_completed",
      method: "daily_mission",
      topicSlug: "realismus",
      minutes: 27,
      dateKey: "2026-07-19",
      at: "2026-07-19T18:00:00.000Z",
    },
    {
      learnerKey,
      event: "study_plan_completed",
      method: "daily_mission",
      topicSlug: "romantismus",
      minutes: 25,
      dateKey: "2026-07-20",
      at: "2026-07-20T18:00:00.000Z",
    },
    {
      learnerKey,
      event: "simulation_completed",
      method: "simulation",
      topicSlug: "maj",
      simulationScore: 72,
      minutes: 35,
      dateKey: "2026-07-20",
      at: "2026-07-20T19:00:00.000Z",
    },
    {
      learnerKey: learnerB,
      event: "lesson_started",
      method: "lesson",
      topicSlug: "romantismus",
      dateKey: "2026-07-20",
      at: "2026-07-20T08:00:00.000Z",
    },
    {
      learnerKey: learnerB,
      event: "lesson_completed",
      method: "lesson",
      topicSlug: "romantismus",
      minutes: 14,
      dateKey: "2026-07-20",
      at: "2026-07-20T08:15:00.000Z",
    },
    {
      learnerKey: learnerB,
      event: "question_answered",
      method: "question_engine",
      topicSlug: "jazyk",
      itemId: "q-easy-1",
      correct: true,
      dateKey: "2026-07-20",
      at: "2026-07-20T08:20:00.000Z",
    },
    {
      learnerKey: learnerB,
      event: "answer_correct",
      method: "question_engine",
      topicSlug: "jazyk",
      itemId: "q-easy-1",
      correct: true,
      dateKey: "2026-07-20",
      at: "2026-07-20T08:20:01.000Z",
    },
  ];

  let count = 0;
  for (const t of templates) {
    await appendLearningEvent({ ...t, id: randomUUID() });
    count += 1;
  }

  return { learnerKey, eventCount: count };
}

function buildQuestionSeries(
  learnerKey: string,
  itemId: string,
  topicSlug: string,
  mostlyCorrect: boolean,
  n: number,
  flipEvery = 0,
): Array<Omit<LearningEvent, "id">> {
  const out: Array<Omit<LearningEvent, "id">> = [];
  for (let i = 0; i < n; i++) {
    const correct =
      flipEvery > 0 && i % (flipEvery + 1) === flipEvery
        ? !mostlyCorrect
        : mostlyCorrect;
    const day = 15 + (i % 5);
    const dateKey = `2026-07-${String(day).padStart(2, "0")}`;
    const at = `${dateKey}T13:${String(10 + i).padStart(2, "0")}:00.000Z`;
    out.push({
      learnerKey,
      event: "question_answered",
      method: "question_engine",
      topicSlug,
      itemId,
      correct,
      dateKey,
      at,
    });
    out.push({
      learnerKey,
      event: correct ? "answer_correct" : "answer_incorrect",
      method: "question_engine",
      topicSlug,
      itemId,
      correct,
      dateKey,
      at: at.replace(":00.000Z", ":01.000Z"),
    });
  }
  return out;
}
