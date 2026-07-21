import { z } from "zod";

/**
 * Error Memory — „Moje chyby“ (D-034).
 * Significant mistakes become durable ErrorMemory rows.
 * Practice → repeated success → resolved (history kept).
 */

export const errorTypes = [
  "author_work_swap",
  "unknown_fact",
  "chronology",
  "concept_misunderstanding",
  "plot_detail",
  "literary_term",
  "uncertainty",
] as const;

export type ErrorType = (typeof errorTypes)[number];

export const errorTypeSchema = z.enum(errorTypes);

export const errorTypeLabelsCs: Record<ErrorType, string> = {
  author_work_swap: "Zaměnil autor/dílo",
  unknown_fact: "Neznal fakt",
  chronology: "Chronologie",
  concept_misunderstanding: "Nepochopení pojmu",
  plot_detail: "Detail děje",
  literary_term: "Literární termín",
  uncertainty: "Nejistota",
};

export const resolvedStatuses = ["open", "practicing", "resolved"] as const;
export type ResolvedStatus = (typeof resolvedStatuses)[number];

export const resolvedStatusSchema = z.enum(resolvedStatuses);

export const resolvedStatusLabelsCs: Record<ResolvedStatus, string> = {
  open: "Otevřená",
  practicing: "Procvičuje se",
  resolved: "Vyřešená",
};

export const errorMemoryConfig = {
  /** Consecutive successful practices to mark resolved. */
  resolveSuccessStreak: 2,
  /** Max items in „Procvičit moje chyby“ queue. */
  practiceQueueMax: 12,
  /** Dedup window: same KU + type within this many ms → update, don’t duplicate. */
  dedupeWindowMs: 7 * 24 * 60 * 60 * 1000,
} as const;

export const errorKnowledgeUnitSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(160),
});

export type ErrorKnowledgeUnit = z.infer<typeof errorKnowledgeUnitSchema>;

export const errorMemorySchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().min(1).max(64),
  question: z.string().min(1).max(500),
  studentAnswer: z.string().min(1).max(500),
  correctConcept: z.string().min(1).max(500),
  whyWrong: z.string().min(1).max(600),
  knowledgeUnit: errorKnowledgeUnitSchema,
  errorType: errorTypeSchema,
  date: z.string().datetime(),
  resolvedStatus: resolvedStatusSchema,
  /** Consecutive successful practices (resets on fail). */
  successStreak: z.number().int().min(0).max(100),
  practiceCount: z.number().int().min(0).max(10_000),
  /** When resolved — history stays. */
  resolvedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
  source: z
    .enum(["mixed_review", "question_engine", "manual", "seed"])
    .default("manual"),
});

export type ErrorMemory = z.infer<typeof errorMemorySchema>;

export const errorMemoryBookSchema = z.object({
  learnerId: z.string().min(1).max(64),
  memories: z.array(errorMemorySchema).max(2000),
  updatedAt: z.string().datetime(),
});

export type ErrorMemoryBook = z.infer<typeof errorMemoryBookSchema>;

export const practiceGrades = ["again", "good"] as const;
export type PracticeGrade = (typeof practiceGrades)[number];

export const practiceGradeSchema = z.enum(practiceGrades);

export const mistakePracticeSessionSchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().min(1).max(64),
  /** ErrorMemory ids in practice order. */
  queue: z.array(z.string().uuid()).min(1).max(40),
  cursor: z.number().int().min(0),
  grades: z.array(
    z.object({
      errorMemoryId: z.string().uuid(),
      grade: practiceGradeSchema,
      at: z.string().datetime(),
    }),
  ),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  status: z.enum(["active", "completed", "abandoned"]),
});

export type MistakePracticeSession = z.infer<
  typeof mistakePracticeSessionSchema
>;

export function emptyErrorBook(
  learnerId: string,
  nowIso: string,
): ErrorMemoryBook {
  return { learnerId, memories: [], updatedAt: nowIso };
}

export type RecordErrorInput = {
  id: string;
  learnerId: string;
  question: string;
  studentAnswer: string;
  correctConcept: string;
  whyWrong: string;
  knowledgeUnit: ErrorKnowledgeUnit;
  errorType: ErrorType;
  nowIso: string;
  source?: ErrorMemory["source"];
};

/**
 * Record a significant mistake. Dedupes recent same KU + type (updates answer).
 * Reopens resolved memories if the same weakness reappears.
 */
export function recordError(
  book: ErrorMemoryBook,
  input: RecordErrorInput,
): { book: ErrorMemoryBook; memory: ErrorMemory; created: boolean } {
  const windowStart =
    new Date(input.nowIso).getTime() - errorMemoryConfig.dedupeWindowMs;

  const existingIdx = book.memories.findIndex((m) => {
    if (m.knowledgeUnit.slug !== input.knowledgeUnit.slug) return false;
    if (m.errorType !== input.errorType) return false;
    const t = new Date(m.date).getTime();
    // Always match unresolved; match resolved only inside window
    if (m.resolvedStatus !== "resolved") return true;
    return t >= windowStart;
  });

  if (existingIdx >= 0) {
    const prev = book.memories[existingIdx]!;
    const memory: ErrorMemory = {
      ...prev,
      question: input.question,
      studentAnswer: input.studentAnswer,
      correctConcept: input.correctConcept,
      whyWrong: input.whyWrong,
      knowledgeUnit: input.knowledgeUnit,
      date: prev.resolvedStatus === "resolved" ? input.nowIso : prev.date,
      resolvedStatus: "open",
      successStreak: 0,
      resolvedAt: null,
      updatedAt: input.nowIso,
      source: input.source ?? prev.source,
    };
    const memories = [...book.memories];
    memories[existingIdx] = memory;
    return {
      book: { ...book, memories, updatedAt: input.nowIso },
      memory,
      created: false,
    };
  }

  const memory: ErrorMemory = {
    id: input.id,
    learnerId: input.learnerId,
    question: input.question,
    studentAnswer: input.studentAnswer,
    correctConcept: input.correctConcept,
    whyWrong: input.whyWrong,
    knowledgeUnit: input.knowledgeUnit,
    errorType: input.errorType,
    date: input.nowIso,
    resolvedStatus: "open",
    successStreak: 0,
    practiceCount: 0,
    resolvedAt: null,
    updatedAt: input.nowIso,
    source: input.source ?? "manual",
  };

  return {
    book: {
      ...book,
      memories: [memory, ...book.memories],
      updatedAt: input.nowIso,
    },
    memory,
    created: true,
  };
}

/**
 * Apply practice grade. Repeated success → resolved; history stays in book.
 */
export function applyPracticeGrade(
  memory: ErrorMemory,
  grade: PracticeGrade,
  nowIso: string,
): ErrorMemory {
  const practiceCount = memory.practiceCount + 1;

  if (grade === "again") {
    return {
      ...memory,
      practiceCount,
      successStreak: 0,
      resolvedStatus: "open",
      resolvedAt: null,
      updatedAt: nowIso,
    };
  }

  const successStreak = memory.successStreak + 1;
  const resolved =
    successStreak >= errorMemoryConfig.resolveSuccessStreak;

  return {
    ...memory,
    practiceCount,
    successStreak,
    resolvedStatus: resolved ? "resolved" : "practicing",
    resolvedAt: resolved ? nowIso : null,
    updatedAt: nowIso,
  };
}

export function listOpenMemories(book: ErrorMemoryBook): ErrorMemory[] {
  return book.memories
    .filter((m) => m.resolvedStatus !== "resolved")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function listResolvedMemories(book: ErrorMemoryBook): ErrorMemory[] {
  return book.memories
    .filter((m) => m.resolvedStatus === "resolved")
    .sort(
      (a, b) =>
        new Date(b.resolvedAt ?? b.updatedAt).getTime() -
        new Date(a.resolvedAt ?? a.updatedAt).getTime(),
    );
}

export function countByErrorType(
  memories: ErrorMemory[],
): Record<ErrorType, number> {
  const out = Object.fromEntries(errorTypes.map((t) => [t, 0])) as Record<
    ErrorType,
    number
  >;
  for (const m of memories) {
    out[m.errorType] += 1;
  }
  return out;
}

export type MistakesHubSummary = {
  openCount: number;
  resolvedCount: number;
  byType: Record<ErrorType, number>;
  headlineCs: string;
};

export function buildMistakesHubSummary(
  book: ErrorMemoryBook,
): MistakesHubSummary {
  const open = listOpenMemories(book);
  const resolved = listResolvedMemories(book);
  const byType = countByErrorType(open);
  const headlineCs =
    open.length === 0
      ? resolved.length === 0
        ? "Zatím žádné zaznamenané chyby."
        : `Všechny chyby vyřešené (${resolved.length} v historii).`
      : `Otevřené chyby: ${open.length} — spusť „Procvičit moje chyby“.`;
  return {
    openCount: open.length,
    resolvedCount: resolved.length,
    byType,
    headlineCs,
  };
}

/** Build practice queue from open errors (newest first, capped). */
export function buildMistakePracticeQueue(
  book: ErrorMemoryBook,
): ErrorMemory[] {
  return listOpenMemories(book).slice(0, errorMemoryConfig.practiceQueueMax);
}

export function startMistakePracticeSession(input: {
  sessionId: string;
  learnerId: string;
  book: ErrorMemoryBook;
  nowIso: string;
}): MistakePracticeSession | null {
  const queue = buildMistakePracticeQueue(input.book).map((m) => m.id);
  if (queue.length === 0) return null;
  return {
    id: input.sessionId,
    learnerId: input.learnerId,
    queue,
    cursor: 0,
    grades: [],
    startedAt: input.nowIso,
    finishedAt: null,
    status: "active",
  };
}

export function applyMistakeSessionGrade(input: {
  session: MistakePracticeSession;
  book: ErrorMemoryBook;
  grade: PracticeGrade;
  nowIso: string;
}): {
  session: MistakePracticeSession;
  book: ErrorMemoryBook;
  completed: boolean;
  memory: ErrorMemory | null;
} {
  const { session } = input;
  if (session.status !== "active") {
    return { session, book: input.book, completed: true, memory: null };
  }

  const errorId = session.queue[session.cursor];
  if (!errorId) {
    const done: MistakePracticeSession = {
      ...session,
      status: "completed",
      finishedAt: input.nowIso,
    };
    return { session: done, book: input.book, completed: true, memory: null };
  }

  const idx = input.book.memories.findIndex((m) => m.id === errorId);
  if (idx < 0) {
    const nextCursor = session.cursor + 1;
    const completed = nextCursor >= session.queue.length;
    return {
      session: {
        ...session,
        cursor: nextCursor,
        grades: [
          ...session.grades,
          { errorMemoryId: errorId, grade: input.grade, at: input.nowIso },
        ],
        status: completed ? "completed" : "active",
        finishedAt: completed ? input.nowIso : null,
      },
      book: input.book,
      completed,
      memory: null,
    };
  }

  const memory = applyPracticeGrade(
    input.book.memories[idx]!,
    input.grade,
    input.nowIso,
  );
  const memories = [...input.book.memories];
  memories[idx] = memory;
  const book: ErrorMemoryBook = {
    ...input.book,
    memories,
    updatedAt: input.nowIso,
  };

  const nextCursor = session.cursor + 1;
  const completed = nextCursor >= session.queue.length;
  const nextSession: MistakePracticeSession = {
    ...session,
    cursor: nextCursor,
    grades: [
      ...session.grades,
      { errorMemoryId: errorId, grade: input.grade, at: input.nowIso },
    ],
    status: completed ? "completed" : "active",
    finishedAt: completed ? input.nowIso : null,
  };

  return { session: nextSession, book, completed, memory };
}

/**
 * Infer error type from mixed-review style content (heuristic for auto-ingest).
 */
export function inferErrorType(input: {
  question: string;
  correctConcept: string;
  knowledgeSlug?: string;
}): ErrorType {
  const blob = `${input.question} ${input.correctConcept} ${input.knowledgeSlug ?? ""}`.toLowerCase();
  if (
    /autor|napsal|dílo|goriot|dickens|dostojev|mácha|erben|neruda|balzac/.test(
      blob,
    )
  ) {
    return "author_work_swap";
  }
  if (/rok|století|období|chronolog|kdy|obrozen/.test(blob)) {
    return "chronology";
  }
  if (
    /metafora|epiteton|synekdoch|balada|termín|pojmenování|přívlastek/.test(
      blob,
    )
  ) {
    return "literary_term";
  }
  if (/romantismus|realismus|symbolismus|směr|znak/.test(blob)) {
    return "concept_misunderstanding";
  }
  if (/děj|postava|raskolnikov|oliver|zápletka|scéna/.test(blob)) {
    return "plot_detail";
  }
  return "unknown_fact";
}

/** Build whyWrong copy for auto-ingest when UI doesn’t supply one. */
export function defaultWhyWrong(input: {
  errorType: ErrorType;
  studentAnswer: string;
  correctConcept: string;
}): string {
  const typeHint = errorTypeLabelsCs[input.errorType];
  return `Typ: ${typeHint}. Odpověď „${input.studentAnswer}“ neodpovídá správnému konceptu „${input.correctConcept}“.`;
}
