import { describe, expect, it } from "vitest";
import {
  applySm2,
  buildReviewQueue,
  createScheduleEntry,
  gradeToQuality,
  isDue,
} from "@/domain/learning/scheduler";
import {
  applyGradeToSchedule,
  emptySchedule,
  parseFlashcardDeck,
  startSession,
  summarizeSession,
  advanceSession,
} from "@/domain/learning/flashcards";
import { buildCjlLiterarniDeck } from "@/server/flashcards/packs/cjl-literarni";

describe("SM-2 scheduler", () => {
  const now = "2026-07-20T12:00:00.000Z";

  it("maps grades to quality", () => {
    expect(gradeToQuality.dont_know).toBe(1);
    expect(gradeToQuality.almost).toBe(3);
    expect(gradeToQuality.know).toBe(5);
  });

  it("resets on dont_know and schedules 1 day", () => {
    let entry = createScheduleEntry("card-1", now);
    entry = applySm2(entry, "know", now).entry;
    expect(entry.repetitions).toBe(1);
    expect(entry.intervalDays).toBe(1);
    entry = applySm2(entry, "dont_know", "2026-07-21T12:00:00.000Z").entry;
    expect(entry.repetitions).toBe(0);
    expect(entry.intervalDays).toBe(1);
    expect(entry.lapses).toBe(1);
  });

  it("grows interval after repeated know", () => {
    let entry = createScheduleEntry("card-1", now);
    entry = applySm2(entry, "know", now).entry;
    entry = applySm2(entry, "know", "2026-07-21T12:00:00.000Z").entry;
    expect(entry.intervalDays).toBe(6);
    entry = applySm2(entry, "know", "2026-07-27T12:00:00.000Z").entry;
    expect(entry.intervalDays).toBeGreaterThan(6);
    expect(entry.easiness).toBeGreaterThanOrEqual(2.5);
  });

  it("builds due + new queue", () => {
    const ids = ["a", "b", "c"];
    const schedule = {
      a: {
        ...createScheduleEntry("a", "2026-07-19T12:00:00.000Z"),
        lastReviewedAt: "2026-07-19T12:00:00.000Z",
        dueAt: "2026-07-19T12:00:00.000Z",
      },
      // b new
      // c not due
      c: {
        ...createScheduleEntry("c", now),
        lastReviewedAt: now,
        dueAt: "2026-08-01T12:00:00.000Z",
        repetitions: 2,
        intervalDays: 10,
      },
    };
    const queue = buildReviewQueue({
      cardIds: ids,
      scheduleByCardId: schedule,
      nowIso: now,
      limits: { maxDue: 10, maxNew: 10 },
    });
    expect(queue).toContain("a");
    expect(queue).toContain("b");
    expect(queue).not.toContain("c");
    expect(isDue(schedule.a, now)).toBe(true);
  });
});

describe("flashcard deck + session", () => {
  const deck = buildCjlLiterarniDeck("2026-07-20T12:00:00.000Z");
  const now = "2026-07-20T12:00:00.000Z";

  it("covers all card types", () => {
    parseFlashcardDeck(deck);
    const types = new Set(deck.cards.map((c) => c.type));
    expect(types.has("term_definition")).toBe(true);
    expect(types.has("author_work")).toBe(true);
    expect(types.has("work_author")).toBe(true);
    expect(types.has("event_meaning")).toBe(true);
    expect(types.has("character_work")).toBe(true);
    expect(types.has("description_identify")).toBe(true);
    expect(types.has("question_answer")).toBe(true);
    expect(types.has("context_concept")).toBe(true);
  });

  it("starts session and advances with schedule updates", () => {
    let schedule = emptySchedule("learner-1", deck, now);
    const session = startSession({
      sessionId: "00000000-0000-4000-8000-000000000001",
      learnerId: "learner-1",
      deck,
      schedule,
      nowIso: now,
      limits: { maxDue: 5, maxNew: 5 },
    });
    expect(session.queue.length).toBeGreaterThan(0);
    const cardId = session.queue[0]!;
    schedule = applyGradeToSchedule(schedule, cardId, "know", now);
    expect(schedule.byCardId[cardId]?.repetitions).toBe(1);
    const next = advanceSession(session, cardId, "know", now);
    expect(next.grades).toHaveLength(1);
    expect(next.cursor).toBe(1);
  });

  it("summarizes completed session", () => {
    const schedule = emptySchedule("learner-1", deck, now);
    const session = {
      id: "00000000-0000-4000-8000-000000000002",
      learnerId: "learner-1",
      deckId: deck.id,
      deckSlug: deck.slug,
      queue: [deck.cards[0]!.id, deck.cards[1]!.id],
      cursor: 2,
      grades: [
        {
          cardId: deck.cards[0]!.id,
          grade: "know" as const,
          at: now,
        },
        {
          cardId: deck.cards[1]!.id,
          grade: "dont_know" as const,
          at: now,
        },
      ],
      startedAt: now,
      finishedAt: now,
      status: "completed" as const,
    };
    const summary = summarizeSession(session, schedule);
    expect(summary.total).toBe(2);
    expect(summary.know).toBe(1);
    expect(summary.dont_know).toBe(1);
    expect(summary.accuracyPct).toBe(50);
  });
});
