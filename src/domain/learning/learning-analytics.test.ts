import { describe, expect, it } from "vitest";
import {
  anonymizeLearnerKey,
  buildAnonymizedLearningExport,
  buildLearningAnalyticsDashboard,
  learningEventNames,
  parseLearningEvent,
  type LearningEvent,
} from "@/domain/learning/learning-analytics";

function ev(
  partial: Partial<LearningEvent> &
    Pick<LearningEvent, "event" | "method" | "learnerKey" | "dateKey" | "at">,
): LearningEvent {
  return parseLearningEvent({
    id: "11111111-1111-4111-8111-111111111111",
    ...partial,
  });
}

describe("learning-analytics (D-049)", () => {
  it("exposes product learning event vocabulary", () => {
    expect(learningEventNames).toContain("lesson_started");
    expect(learningEventNames).toContain("simulation_completed");
    expect(learningEventNames).toContain("mastery_changed");
  });

  it("anonymizes learner keys for export", () => {
    const a = anonymizeLearnerKey("learner-a");
    const b = anonymizeLearnerKey("learner-b");
    expect(a).not.toBe("learner-a");
    expect(a).toHaveLength(16);
    expect(a).not.toBe(b);
    expect(anonymizeLearnerKey("learner-a")).toBe(a);
  });

  it("answers learning questions without vanity-only stats", () => {
    const events: LearningEvent[] = [
      ev({
        learnerKey: "u1",
        event: "lesson_started",
        method: "lesson",
        topicSlug: "romantismus",
        dateKey: "2026-07-15",
        at: "2026-07-15T10:00:00.000Z",
      }),
      ev({
        id: "22222222-2222-4222-8222-222222222222",
        learnerKey: "u1",
        event: "lesson_completed",
        method: "lesson",
        topicSlug: "romantismus",
        minutes: 20,
        dateKey: "2026-07-15",
        at: "2026-07-15T10:20:00.000Z",
      }),
      ...Array.from({ length: 5 }, (_, i) =>
        ev({
          id: `33333333-3333-4333-8333-33333333333${i}`,
          learnerKey: "u1",
          event: "answer_incorrect",
          method: "question_engine",
          topicSlug: "rozbory",
          itemId: "q-hard",
          correct: false,
          dateKey: "2026-07-16",
          at: `2026-07-16T12:0${i}:00.000Z`,
        }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        ev({
          id: `44444444-4444-4444-8444-44444444444${i}`,
          learnerKey: "u1",
          event: "answer_correct",
          method: "question_engine",
          topicSlug: "jazyk",
          itemId: "q-easy",
          correct: true,
          dateKey: "2026-07-16",
          at: `2026-07-16T13:0${i}:00.000Z`,
        }),
      ),
      ev({
        id: "55555555-5555-4555-8555-555555555555",
        learnerKey: "u1",
        event: "flashcard_rating",
        method: "flashcards",
        rating: 1,
        dateKey: "2026-07-17",
        at: "2026-07-17T10:00:00.000Z",
      }),
      ev({
        id: "66666666-6666-4666-8666-666666666666",
        learnerKey: "u1",
        event: "review_completed",
        method: "flashcards",
        rating: 4,
        dateKey: "2026-07-17",
        at: "2026-07-17T10:15:00.000Z",
      }),
      ev({
        id: "77777777-7777-4777-8777-777777777777",
        learnerKey: "u1",
        event: "session_drop_off",
        method: "lesson",
        dropOffAt: "/app/learn/x#3",
        dateKey: "2026-07-18",
        at: "2026-07-18T09:00:00.000Z",
      }),
      ev({
        id: "88888888-8888-4888-8888-888888888888",
        learnerKey: "u1",
        event: "mastery_changed",
        method: "lesson",
        masteryScore: 60,
        dateKey: "2026-07-15",
        at: "2026-07-15T10:21:00.000Z",
      }),
      ev({
        id: "99999999-9999-4999-8999-999999999999",
        learnerKey: "u1",
        event: "simulation_completed",
        method: "simulation",
        simulationScore: 70,
        dateKey: "2026-07-20",
        at: "2026-07-20T19:00:00.000Z",
      }),
    ];

    const dash = buildLearningAnalyticsDashboard(
      events,
      "2026-07-21T12:00:00.000Z",
    );

    expect(dash.questionsAnswered.activeLearners).toBe(1);
    expect(dash.questionsAnswered.lessonsCompleted).toBe(1);
    expect(dash.completion.lessonStartToCompletePct).toBe(100);
    expect(dash.learningTimeMinutes).toBe(20);
    expect(dash.weakTopics[0]?.topicSlug).toBe("rozbory");
    expect(dash.questionQuality.some((q) => q.flag === "too_hard")).toBe(true);
    expect(dash.questionQuality.some((q) => q.flag === "too_easy")).toBe(true);
    expect(dash.contentErrorSignals.length).toBeGreaterThan(0);
    expect(dash.forgettingSignals.lowReviewRatings).toBe(1);
    expect(dash.masteryTrend[0]?.avgScore).toBe(60);
    expect(dash.questionsAnswered.actuallyLearningCs).toMatch(/Ano|lekcí/i);
  });

  it("exports only hashed learner keys", () => {
    const events = [
      ev({
        learnerKey: "secret-learner",
        event: "lesson_started",
        method: "lesson",
        dateKey: "2026-07-15",
        at: "2026-07-15T10:00:00.000Z",
      }),
    ];
    const exp = buildAnonymizedLearningExport(events);
    expect(exp.events[0]).not.toHaveProperty("learnerKey");
    expect(exp.events[0]?.learnerKeyHash).toBe(
      anonymizeLearnerKey("secret-learner"),
    );
    expect(JSON.stringify(exp)).not.toContain("secret-learner");
    expect(exp.privacy.denied).toContain("free-text answers");
  });
});
