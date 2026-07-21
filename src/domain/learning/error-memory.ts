import { z } from "zod";

/**
 * Moje chyby — data-driven ErrorMemory (D-034 rebuild).
 * Only real graded mistakes are stored. Never invent / seed fake rows in product.
 */

export const mistakeClasses = [
  "forgot_fact",
  "confused_concepts",
  "partial_answer",
  "wrong_author",
  "wrong_literary_period",
  "weak_explanation",
  "repeated_mistake",
] as const;

export type MistakeClass = (typeof mistakeClasses)[number];

/** @deprecated Use MistakeClass — kept for call-site aliases during migrate. */
export type ErrorType = MistakeClass;
export const errorTypes = mistakeClasses;
export const errorTypeSchema = z.enum(mistakeClasses);
export const mistakeClassSchema = errorTypeSchema;

export const mistakeClassLabelsCs: Record<MistakeClass, string> = {
  forgot_fact: "Zapomenutý fakt",
  confused_concepts: "Záměna pojmů",
  partial_answer: "Částečná odpověď",
  wrong_author: "Špatný autor",
  wrong_literary_period: "Špatné literární období",
  weak_explanation: "Slabé vysvětlení",
  repeated_mistake: "Opakovaná chyba",
};

/** Alias for existing UI imports. */
export const errorTypeLabelsCs = mistakeClassLabelsCs;

export const mistakeStatuses = [
  "new",
  "weak",
  "improving",
  "mastered",
] as const;

export type MistakeStatus = (typeof mistakeStatuses)[number];

export const mistakeStatusSchema = z.enum(mistakeStatuses);

export const mistakeStatusLabelsCs: Record<MistakeStatus, string> = {
  new: "Nová",
  weak: "Slabá",
  improving: "Zlepšuje se",
  mastered: "Zvládnutá",
};

/** Legacy aliases used by older UI / tests. */
export const resolvedStatuses = ["open", "practicing", "resolved"] as const;
export type ResolvedStatus = (typeof resolvedStatuses)[number];

export const errorMemoryConfig = {
  /** Consecutive successful recoveries → Mastered. */
  masterSuccessStreak: 2,
  /** @deprecated alias */
  resolveSuccessStreak: 2,
  practiceQueueMax: 12,
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
  /** Classification of the mistake. */
  errorType: mistakeClassSchema,
  /** First time this mistake was recorded. */
  firstOccurredAt: z.string().datetime(),
  /** Most recent recurrence (or first if never repeated). */
  lastOccurredAt: z.string().datetime(),
  /** How many times the same weakness showed up (incl. first). */
  occurrenceCount: z.number().int().min(1).max(10_000),
  /** Practice / recovery attempts against this memory. */
  recoveryAttempts: z.number().int().min(0).max(10_000),
  status: mistakeStatusSchema,
  /** Consecutive successful recoveries (resets on fail). */
  successStreak: z.number().int().min(0).max(100),
  masteredAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
  source: z
    .enum([
      "mixed_review",
      "question_engine",
      "materials_study",
      "grounded_study",
      "manual",
    ])
    .default("manual"),
  // --- legacy fields kept optional for migrate / soft read ---
  date: z.string().datetime().optional(),
  resolvedStatus: z.enum(resolvedStatuses).optional(),
  practiceCount: z.number().int().min(0).max(10_000).optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
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

const LEGACY_TYPE_MAP: Record<string, MistakeClass> = {
  author_work_swap: "wrong_author",
  unknown_fact: "forgot_fact",
  chronology: "wrong_literary_period",
  concept_misunderstanding: "confused_concepts",
  plot_detail: "forgot_fact",
  literary_term: "confused_concepts",
  uncertainty: "weak_explanation",
  other: "forgot_fact",
  forgot_fact: "forgot_fact",
  confused_concepts: "confused_concepts",
  partial_answer: "partial_answer",
  wrong_author: "wrong_author",
  wrong_literary_period: "wrong_literary_period",
  weak_explanation: "weak_explanation",
  repeated_mistake: "repeated_mistake",
};

function mapLegacyStatus(raw: unknown, practiceCount: number): MistakeStatus {
  if (raw === "new" || raw === "weak" || raw === "improving" || raw === "mastered") {
    return raw;
  }
  if (raw === "resolved") return "mastered";
  if (raw === "practicing") return "improving";
  if (raw === "open") return practiceCount > 0 ? "weak" : "new";
  return "new";
}

/** Normalize one memory from legacy or current shape. */
export function normalizeErrorMemory(raw: unknown): ErrorMemory | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const errorType = LEGACY_TYPE_MAP[String(m.errorType)] ?? "forgot_fact";
  const practiceCount =
    typeof m.recoveryAttempts === "number"
      ? m.recoveryAttempts
      : typeof m.practiceCount === "number"
        ? m.practiceCount
        : 0;
  const firstOccurredAt = String(
    m.firstOccurredAt ?? m.date ?? m.updatedAt ?? new Date().toISOString(),
  );
  const lastOccurredAt = String(
    m.lastOccurredAt ?? m.updatedAt ?? firstOccurredAt,
  );
  const occurrenceCount =
    typeof m.occurrenceCount === "number" && m.occurrenceCount >= 1
      ? m.occurrenceCount
      : 1;
  const status = mapLegacyStatus(m.status ?? m.resolvedStatus, practiceCount);
  const masteredAt =
    status === "mastered"
      ? (typeof m.masteredAt === "string"
          ? m.masteredAt
          : typeof m.resolvedAt === "string"
            ? m.resolvedAt
            : lastOccurredAt)
      : null;

  const candidate = {
    id: m.id,
    learnerId: m.learnerId,
    question: m.question,
    studentAnswer: m.studentAnswer,
    correctConcept: m.correctConcept,
    whyWrong: m.whyWrong,
    knowledgeUnit: m.knowledgeUnit,
    errorType,
    firstOccurredAt,
    lastOccurredAt,
    occurrenceCount,
    recoveryAttempts: practiceCount,
    status,
    successStreak: typeof m.successStreak === "number" ? m.successStreak : 0,
    masteredAt,
    updatedAt: String(m.updatedAt ?? lastOccurredAt),
    source:
      m.source === "seed"
        ? "manual"
        : m.source === "mixed_review" ||
            m.source === "question_engine" ||
            m.source === "materials_study" ||
            m.source === "grounded_study" ||
            m.source === "manual"
          ? m.source
          : "manual",
  };

  const parsed = errorMemorySchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function migrateErrorBook(raw: unknown): ErrorMemoryBook | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  if (typeof b.learnerId !== "string") return null;
  const memoriesRaw = Array.isArray(b.memories) ? b.memories : [];
  const memories: ErrorMemory[] = [];
  for (const row of memoriesRaw) {
    const n = normalizeErrorMemory(row);
    if (n) memories.push(n);
  }
  const updatedAt =
    typeof b.updatedAt === "string" ? b.updatedAt : new Date().toISOString();
  return errorMemoryBookSchema.parse({
    learnerId: b.learnerId,
    memories,
    updatedAt,
  });
}

export type RecordErrorInput = {
  id: string;
  learnerId: string;
  question: string;
  studentAnswer: string;
  correctConcept: string;
  whyWrong: string;
  knowledgeUnit: ErrorKnowledgeUnit;
  errorType: MistakeClass;
  nowIso: string;
  source?: ErrorMemory["source"];
};

/**
 * Record a meaningful mistake. Dedupes same KU + class → bumps occurrence.
 * Reopens mastered memories when the same weakness reappears.
 */
export function recordError(
  book: ErrorMemoryBook,
  input: RecordErrorInput,
): { book: ErrorMemoryBook; memory: ErrorMemory; created: boolean } {
  const windowStart =
    new Date(input.nowIso).getTime() - errorMemoryConfig.dedupeWindowMs;

  const existingIdx = book.memories.findIndex((m) => {
    if (m.knowledgeUnit.slug !== input.knowledgeUnit.slug) return false;
    if (m.errorType !== input.errorType && m.errorType !== "repeated_mistake") {
      return false;
    }
    if (m.status !== "mastered") return true;
    return new Date(m.lastOccurredAt).getTime() >= windowStart;
  });

  if (existingIdx >= 0) {
    const prev = book.memories[existingIdx]!;
    const occurrenceCount = prev.occurrenceCount + 1;
    const memory: ErrorMemory = {
      ...prev,
      question: input.question,
      studentAnswer: input.studentAnswer,
      correctConcept: input.correctConcept,
      whyWrong: input.whyWrong,
      knowledgeUnit: input.knowledgeUnit,
      // 2+ occurrences → classify as repeated (keep evidence fields updated)
      errorType: occurrenceCount >= 2 ? "repeated_mistake" : input.errorType,
      lastOccurredAt: input.nowIso,
      occurrenceCount,
      status: "weak",
      successStreak: 0,
      masteredAt: null,
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
    firstOccurredAt: input.nowIso,
    lastOccurredAt: input.nowIso,
    occurrenceCount: 1,
    recoveryAttempts: 0,
    status: "new",
    successStreak: 0,
    masteredAt: null,
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
 * Apply recovery practice grade. Updates recoveryAttempts + status.
 */
export function applyPracticeGrade(
  memory: ErrorMemory,
  grade: PracticeGrade,
  nowIso: string,
): ErrorMemory {
  const recoveryAttempts = memory.recoveryAttempts + 1;

  if (grade === "again") {
    return {
      ...memory,
      recoveryAttempts,
      successStreak: 0,
      status: "weak",
      masteredAt: null,
      updatedAt: nowIso,
    };
  }

  const successStreak = memory.successStreak + 1;
  const mastered =
    successStreak >= errorMemoryConfig.masterSuccessStreak;

  return {
    ...memory,
    recoveryAttempts,
    successStreak,
    status: mastered ? "mastered" : "improving",
    masteredAt: mastered ? nowIso : null,
    updatedAt: nowIso,
  };
}

export function listActiveMemories(book: ErrorMemoryBook): ErrorMemory[] {
  return book.memories
    .filter((m) => m.status !== "mastered")
    .sort(
      (a, b) =>
        new Date(b.lastOccurredAt).getTime() -
        new Date(a.lastOccurredAt).getTime(),
    );
}

/** @deprecated use listActiveMemories */
export function listOpenMemories(book: ErrorMemoryBook): ErrorMemory[] {
  return listActiveMemories(book);
}

export function listMasteredMemories(book: ErrorMemoryBook): ErrorMemory[] {
  return book.memories
    .filter((m) => m.status === "mastered")
    .sort(
      (a, b) =>
        new Date(b.masteredAt ?? b.updatedAt).getTime() -
        new Date(a.masteredAt ?? a.updatedAt).getTime(),
    );
}

/** @deprecated use listMasteredMemories */
export function listResolvedMemories(book: ErrorMemoryBook): ErrorMemory[] {
  return listMasteredMemories(book);
}

export function countByMistakeClass(
  memories: ErrorMemory[],
): Record<MistakeClass, number> {
  const out = Object.fromEntries(mistakeClasses.map((t) => [t, 0])) as Record<
    MistakeClass,
    number
  >;
  for (const m of memories) {
    out[m.errorType] += 1;
  }
  return out;
}

/** @deprecated */
export const countByErrorType = countByMistakeClass;

export type MistakesHubSummary = {
  activeCount: number;
  masteredCount: number;
  /** Alias for activeCount — older UI. */
  openCount: number;
  resolvedCount: number;
  byType: Record<MistakeClass, number>;
  byStatus: Record<MistakeStatus, number>;
  headlineCs: string;
};

export function buildMistakesHubSummary(
  book: ErrorMemoryBook,
): MistakesHubSummary {
  const active = listActiveMemories(book);
  const mastered = listMasteredMemories(book);
  const byType = countByMistakeClass(active);
  const byStatus = Object.fromEntries(
    mistakeStatuses.map((s) => [s, 0]),
  ) as Record<MistakeStatus, number>;
  for (const m of book.memories) {
    byStatus[m.status] += 1;
  }
  const headlineCs =
    active.length === 0
      ? mastered.length === 0
        ? "Zatím žádné zaznamenané chyby — objeví se po reálných odpovědích v testech a studiu."
        : `Všechny chyby zvládnuté (${mastered.length} v historii).`
      : `Aktivní chyby: ${active.length} — spusť „Procvičit moje chyby“.`;
  return {
    activeCount: active.length,
    masteredCount: mastered.length,
    openCount: active.length,
    resolvedCount: mastered.length,
    byType,
    byStatus,
    headlineCs,
  };
}

export function buildMistakePracticeQueue(
  book: ErrorMemoryBook,
): ErrorMemory[] {
  // Prefer weak / repeated, then new, then improving
  const rank = (s: MistakeStatus) =>
    s === "weak" ? 0 : s === "new" ? 1 : s === "improving" ? 2 : 3;
  return listActiveMemories(book)
    .sort((a, b) => {
      const rd = rank(a.status) - rank(b.status);
      if (rd !== 0) return rd;
      return b.occurrenceCount - a.occurrenceCount;
    })
    .slice(0, errorMemoryConfig.practiceQueueMax);
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
 * Classify a meaningful mistake from answer evidence (deterministic heuristics).
 */
export function classifyMistake(input: {
  question: string;
  studentAnswer: string;
  correctConcept: string;
  knowledgeSlug?: string;
  result?: "incorrect" | "partial" | "partially_correct";
  coverage?: number;
  whatWasWrong?: string[];
}): MistakeClass {
  if (
    input.result === "partial" ||
    input.result === "partially_correct" ||
    (typeof input.coverage === "number" &&
      input.coverage >= 0.35 &&
      input.coverage < 0.85)
  ) {
    return "partial_answer";
  }

  const blob =
    `${input.question} ${input.correctConcept} ${input.studentAnswer} ${input.knowledgeSlug ?? ""}`.toLowerCase();

  if (
    /autor|napsal|dílo|goriot|dickens|dostojev|mácha|erben|neruda|balzac|tolstoj|shakespeare/.test(
      blob,
    )
  ) {
    return "wrong_author";
  }
  if (
    /rok|století|období|chronolog|kdy|obrozen|romantismus|realismus|symbolismus|směr/.test(
      blob,
    ) &&
    /romant|realis|symbol|obrozen|stolet|obdob/.test(blob)
  ) {
    // Period / movement mix-ups
    if (
      /romantismus|realismus|symbolismus|obrozen|stolet/.test(blob)
    ) {
      return "wrong_literary_period";
    }
  }
  if (/romantismus|realismus|symbolismus|směr|znak|pojmem|pojem/.test(blob)) {
    return "confused_concepts";
  }
  if (
    /vysvětl|proč|význam|definuj|definice/.test(blob) ||
    (typeof input.coverage === "number" && input.coverage < 0.35)
  ) {
    return "weak_explanation";
  }
  if ((input.whatWasWrong?.length ?? 0) > 0 && /záměn|zaměň|confus/.test(
    (input.whatWasWrong ?? []).join(" ").toLowerCase(),
  )) {
    return "confused_concepts";
  }
  return "forgot_fact";
}

/** @deprecated use classifyMistake */
export function inferErrorType(input: {
  question: string;
  correctConcept: string;
  knowledgeSlug?: string;
  studentAnswer?: string;
  result?: "incorrect" | "partial" | "partially_correct";
  coverage?: number;
}): MistakeClass {
  return classifyMistake({
    question: input.question,
    studentAnswer: input.studentAnswer ?? "",
    correctConcept: input.correctConcept,
    knowledgeSlug: input.knowledgeSlug,
    result: input.result,
    coverage: input.coverage,
  });
}

export function defaultWhyWrong(input: {
  errorType: MistakeClass;
  studentAnswer: string;
  correctConcept: string;
}): string {
  const typeHint = mistakeClassLabelsCs[input.errorType];
  return `Typ: ${typeHint}. Odpověď „${input.studentAnswer}“ neodpovídá správnému konceptu „${input.correctConcept}“.`;
}

/** Legacy label map for old resolvedStatus UI. */
export const resolvedStatusLabelsCs: Record<ResolvedStatus, string> = {
  open: "Otevřená",
  practicing: "Procvičuje se",
  resolved: "Vyřešená",
};
