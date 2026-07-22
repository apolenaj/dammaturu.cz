import { describe, expect, it } from "vitest";
import {
  applyMistakeSessionGrade,
  applyPracticeGrade,
  buildMistakesHubSummary,
  classifyMistake,
  emptyErrorBook,
  errorMemoryConfig,
  listActiveMemories,
  listMasteredMemories,
  migrateErrorBook,
  recordError,
  startMistakePracticeSession,
} from "@/domain/learning/error-memory";

const NOW = "2026-07-20T12:00:00.000Z";
const LATER = "2026-07-21T12:00:00.000Z";

function sampleInput(overrides: Partial<Parameters<typeof recordError>[1]> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    learnerId: "learner",
    question: "Kdo napsal Otec Goriot?",
    studentAnswer: "Dickens",
    correctConcept: "Honoré de Balzac",
    whyWrong: "Špatný autor realismu — Dickens ≠ Balzac.",
    knowledgeUnit: {
      slug: "goriot",
      title: "Otec Goriot — autor",
    },
    errorType: "wrong_author" as const,
    nowIso: NOW,
    source: "question_engine" as const,
    ...overrides,
  };
}

describe("error-memory / Moje chyby", () => {
  it("records mistake with tracking fields and New status", () => {
    const book0 = emptyErrorBook("learner", NOW);
    const { book, memory, created } = recordError(book0, sampleInput());
    expect(created).toBe(true);
    expect(memory.errorType).toBe("wrong_author");
    expect(memory.status).toBe("new");
    expect(memory.firstOccurredAt).toBe(NOW);
    expect(memory.lastOccurredAt).toBe(NOW);
    expect(memory.occurrenceCount).toBe(1);
    expect(memory.recoveryAttempts).toBe(0);
    expect(book.memories).toHaveLength(1);
  });

  it("dedupes same KU + type, bumps occurrence, marks Weak + repeated", () => {
    let book = emptyErrorBook("learner", NOW);
    ({ book } = recordError(book, sampleInput()));
    const second = recordError(
      book,
      sampleInput({
        id: "22222222-2222-4222-8222-222222222222",
        studentAnswer: "Tolstoj",
        nowIso: LATER,
      }),
    );
    expect(second.created).toBe(false);
    expect(second.book.memories).toHaveLength(1);
    expect(second.memory.studentAnswer).toBe("Tolstoj");
    expect(second.memory.occurrenceCount).toBe(2);
    expect(second.memory.status).toBe("weak");
    expect(second.memory.errorType).toBe("repeated_mistake");
    expect(second.memory.lastOccurredAt).toBe(LATER);
    expect(second.memory.firstOccurredAt).toBe(NOW);
  });

  it("marks Mastered after repeated successful recovery", () => {
    let book = emptyErrorBook("learner", NOW);
    let memory = recordError(book, sampleInput()).memory;
    book = recordError(book, sampleInput()).book;

    memory = applyPracticeGrade(memory, "good", LATER);
    expect(memory.status).toBe("improving");
    expect(memory.successStreak).toBe(1);
    expect(memory.recoveryAttempts).toBe(1);

    memory = applyPracticeGrade(memory, "good", "2026-07-22T12:00:00.000Z");
    expect(memory.status).toBe("improving");
    expect(memory.successStreak).toBe(2);

    memory = applyPracticeGrade(memory, "good", "2026-07-23T12:00:00.000Z");
    expect(memory.successStreak).toBe(errorMemoryConfig.masterSuccessStreak);
    expect(memory.status).toBe("mastered");
    expect(memory.masteredAt).toBeTruthy();

    const memories = book.memories.map((m) =>
      m.id === memory.id ? memory : m,
    );
    const withMastered = { ...book, memories };
    expect(listMasteredMemories(withMastered)).toHaveLength(1);
    expect(listActiveMemories(withMastered)).toHaveLength(0);
  });

  it("one correct recovery never deletes error history", () => {
    const base = recordError(emptyErrorBook("learner", NOW), sampleInput())
      .memory;
    const once = applyPracticeGrade(base, "good", LATER);
    expect(once.status).toBe("improving");
    expect(once.question).toBe(base.question);
    expect(once.studentAnswer).toBe(base.studentAnswer);
  });

  it("again resets streak to Weak", () => {
    const base = recordError(emptyErrorBook("learner", NOW), sampleInput())
      .memory;
    const mid = applyPracticeGrade(base, "good", LATER);
    const fail = applyPracticeGrade(mid, "again", "2026-07-22T12:00:00.000Z");
    expect(fail.successStreak).toBe(0);
    expect(fail.status).toBe("weak");
  });

  it("Procvičit moje chyby session resolves to Mastered", () => {
    let book = emptyErrorBook("learner", NOW);
    ({ book } = recordError(book, sampleInput()));

    const session0 = startMistakePracticeSession({
      sessionId: "44444444-4444-4444-8444-444444444444",
      learnerId: "learner",
      book,
      nowIso: NOW,
    });
    expect(session0).not.toBeNull();

    let session = session0!;
    ({ session, book } = applyMistakeSessionGrade({
      session,
      book,
      grade: "good",
      nowIso: LATER,
    }));
    expect(session.status).toBe("completed");
    expect(listActiveMemories(book)[0]?.status).toBe("improving");

    for (const [i, iso] of [
      ["55555555-5555-4555-8555-555555555555", "2026-07-22T12:00:00.000Z"],
      ["66666666-6666-4666-8666-666666666666", "2026-07-23T12:00:00.000Z"],
    ] as const) {
      const next = startMistakePracticeSession({
        sessionId: i,
        learnerId: "learner",
        book,
        nowIso: iso,
      });
      ({ book } = applyMistakeSessionGrade({
        session: next!,
        book,
        grade: "good",
        nowIso: iso,
      }));
    }
    expect(listMasteredMemories(book)).toHaveLength(1);
    expect(listActiveMemories(book)).toHaveLength(0);
  });

  it("classifies wrong author and partial answer", () => {
    expect(
      classifyMistake({
        question: "Autor Otce Goriota?",
        studentAnswer: "Dickens",
        correctConcept: "Balzac",
        knowledgeSlug: "goriot",
      }),
    ).toBe("wrong_author");

    expect(
      classifyMistake({
        question: "Co je romantismus?",
        studentAnswer: "něco o citech",
        correctConcept: "subjektivita a cit",
        result: "partial",
        coverage: 0.5,
      }),
    ).toBe("partial_answer");
  });

  it("hub headline mentions practice CTA when active", () => {
    let book = emptyErrorBook("learner", NOW);
    ({ book } = recordError(book, sampleInput()));
    const summary = buildMistakesHubSummary(book);
    expect(summary.headlineCs).toMatch(/Procvičit moje chyby/);
    expect(summary.activeCount).toBe(1);
    expect(summary.byStatus.new).toBe(1);
  });

  it("migrates legacy open/resolved books without inventing rows", () => {
    const legacy = {
      learnerId: "learner",
      updatedAt: NOW,
      memories: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          learnerId: "learner",
          question: "Kdo napsal Otec Goriot?",
          studentAnswer: "Dickens",
          correctConcept: "Balzac",
          whyWrong: "Záměna autora",
          knowledgeUnit: { slug: "goriot", title: "Goriot" },
          errorType: "author_work_swap",
          date: NOW,
          resolvedStatus: "open",
          successStreak: 0,
          practiceCount: 0,
          resolvedAt: null,
          updatedAt: NOW,
          source: "seed",
        },
      ],
    };
    const migrated = migrateErrorBook(legacy);
    expect(migrated).not.toBeNull();
    expect(migrated!.memories).toHaveLength(1);
    expect(migrated!.memories[0]!.errorType).toBe("wrong_author");
    expect(migrated!.memories[0]!.status).toBe("new");
    expect(migrated!.memories[0]!.firstOccurredAt).toBe(NOW);
    expect(migrated!.memories[0]!.source).toBe("manual");
  });
});
