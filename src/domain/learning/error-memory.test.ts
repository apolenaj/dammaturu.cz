import { describe, expect, it } from "vitest";
import {
  applyMistakeSessionGrade,
  applyPracticeGrade,
  buildMistakesHubSummary,
  emptyErrorBook,
  errorMemoryConfig,
  inferErrorType,
  listOpenMemories,
  listResolvedMemories,
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
    whyWrong: "Zaměnil autora realismu — Dickens ≠ Balzac.",
    knowledgeUnit: {
      slug: "goriot",
      title: "Otec Goriot — autor",
    },
    errorType: "author_work_swap" as const,
    nowIso: NOW,
    source: "seed" as const,
    ...overrides,
  };
}

describe("error-memory (D-034)", () => {
  it("records ErrorMemory with required fields", () => {
    const book0 = emptyErrorBook("learner", NOW);
    const { book, memory, created } = recordError(book0, sampleInput());
    expect(created).toBe(true);
    expect(memory.question).toContain("Goriot");
    expect(memory.studentAnswer).toBe("Dickens");
    expect(memory.correctConcept).toContain("Balzac");
    expect(memory.whyWrong.length).toBeGreaterThan(5);
    expect(memory.knowledgeUnit.slug).toBe("goriot");
    expect(memory.errorType).toBe("author_work_swap");
    expect(memory.date).toBe(NOW);
    expect(memory.resolvedStatus).toBe("open");
    expect(book.memories).toHaveLength(1);
  });

  it("dedupes same KU + type instead of cloning", () => {
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
    expect(second.memory.resolvedStatus).toBe("open");
  });

  it("marks resolved after repeated success but keeps history", () => {
    let book = emptyErrorBook("learner", NOW);
    let memory = recordError(book, sampleInput()).memory;
    book = recordError(book, sampleInput()).book;

    memory = applyPracticeGrade(memory, "good", LATER);
    expect(memory.resolvedStatus).toBe("practicing");
    expect(memory.successStreak).toBe(1);

    memory = applyPracticeGrade(memory, "good", "2026-07-22T12:00:00.000Z");
    expect(memory.successStreak).toBe(
      errorMemoryConfig.resolveSuccessStreak,
    );
    expect(memory.resolvedStatus).toBe("resolved");
    expect(memory.resolvedAt).toBeTruthy();

    // History stays in book after replace
    const memories = book.memories.map((m) =>
      m.id === memory.id ? memory : m,
    );
    const withResolved = { ...book, memories };
    expect(listResolvedMemories(withResolved)).toHaveLength(1);
    expect(listOpenMemories(withResolved)).toHaveLength(0);
    expect(withResolved.memories).toHaveLength(1);
  });

  it("again resets streak", () => {
    const base = recordError(emptyErrorBook("learner", NOW), sampleInput())
      .memory;
    const mid = applyPracticeGrade(base, "good", LATER);
    const fail = applyPracticeGrade(mid, "again", "2026-07-22T12:00:00.000Z");
    expect(fail.successStreak).toBe(0);
    expect(fail.resolvedStatus).toBe("open");
  });

  it("practice session grades open items; resolve needs repeated success", () => {
    let book = emptyErrorBook("learner", NOW);
    ({ book } = recordError(book, sampleInput()));

    const session0 = startMistakePracticeSession({
      sessionId: "44444444-4444-4444-8444-444444444444",
      learnerId: "learner",
      book,
      nowIso: NOW,
    });
    expect(session0).not.toBeNull();
    expect(session0!.queue.length).toBe(1);

    let session = session0!;
    ({ session, book } = applyMistakeSessionGrade({
      session,
      book,
      grade: "good",
      nowIso: LATER,
    }));
    expect(session.status).toBe("completed");
    expect(listOpenMemories(book)[0]?.resolvedStatus).toBe("practicing");

    // Second practice run → resolved
    const session1 = startMistakePracticeSession({
      sessionId: "55555555-5555-4555-8555-555555555555",
      learnerId: "learner",
      book,
      nowIso: "2026-07-22T12:00:00.000Z",
    });
    expect(session1).not.toBeNull();
    ({ book } = applyMistakeSessionGrade({
      session: session1!,
      book,
      grade: "good",
      nowIso: "2026-07-22T12:00:00.000Z",
    }));
    expect(listResolvedMemories(book)).toHaveLength(1);
    expect(listOpenMemories(book)).toHaveLength(0);
    // History kept
    expect(book.memories).toHaveLength(1);
  });

  it("infers author/work swap from content", () => {
    expect(
      inferErrorType({
        question: "Autor Otce Goriota?",
        correctConcept: "Balzac",
        knowledgeSlug: "goriot",
      }),
    ).toBe("author_work_swap");
  });

  it("hub headline mentions practice CTA when open", () => {
    let book = emptyErrorBook("learner", NOW);
    ({ book } = recordError(book, sampleInput()));
    const summary = buildMistakesHubSummary(book);
    expect(summary.headlineCs).toMatch(/Procvičit moje chyby/);
    expect(summary.openCount).toBe(1);
  });
});
