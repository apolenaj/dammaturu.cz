import { z } from "zod";

/**
 * 60s Speed Round — automatic recall of basic facts (D-030).
 * Kinds: author→work, term→definition, true/false, movement→trait.
 * No deep-interpretation items.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const SPEED_ROUND_DURATION_MS = 60_000;

export const speedQuestionKinds = [
  "author_work",
  "term_definition",
  "true_false",
  "movement_trait",
] as const;

export type SpeedQuestionKind = (typeof speedQuestionKinds)[number];

export const speedQuestionKindSchema = z.enum(speedQuestionKinds);

export const speedOptionSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(160),
});

export type SpeedOption = z.infer<typeof speedOptionSchema>;

export const speedQuestionSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  kind: speedQuestionKindSchema,
  /** Ultra-short prompt. */
  prompt: z.string().min(1).max(160),
  options: z.array(speedOptionSchema).min(2).max(4),
  correctOptionId: z.string().uuid(),
  /** Optional one-liner shown only on summary miss list — not mid-round. */
  factHint: z.string().min(1).max(200).optional(),
});

export type SpeedQuestion = z.infer<typeof speedQuestionSchema>;

export const speedRoundPackSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  durationMs: z.literal(SPEED_ROUND_DURATION_MS),
  questions: z.array(speedQuestionSchema).min(20).max(200),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SpeedRoundPack = z.infer<typeof speedRoundPackSchema>;

export const speedAnswerSchema = z.object({
  questionId: z.string().uuid(),
  optionId: z.string().uuid(),
  correct: z.boolean(),
  responseMs: z.number().int().min(0).max(60_000),
  at: z.string().datetime(),
});

export type SpeedAnswer = z.infer<typeof speedAnswerSchema>;

export const speedRoundSessionSchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  /** Shuffled question queue for this run. */
  queue: z.array(z.string().uuid()),
  cursor: z.number().int().min(0),
  answers: z.array(speedAnswerSchema),
  startedAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  status: z.enum(["active", "completed", "abandoned"]),
});

export type SpeedRoundSession = z.infer<typeof speedRoundSessionSchema>;

export const speedRoundBestSchema = z.object({
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  bestScore: z.number().int().min(0),
  bestAccuracyPct: z.number().min(0).max(100),
  bestStreak: z.number().int().min(0),
  bestAvgResponseMs: z.number().int().min(0).nullable(),
  runs: z.number().int().min(0),
  updatedAt: z.string().datetime(),
});

export type SpeedRoundBest = z.infer<typeof speedRoundBestSchema>;

export type SpeedRoundSummary = {
  score: number;
  answered: number;
  correct: number;
  accuracyPct: number;
  bestStreak: number;
  avgResponseMs: number;
  medianResponseMs: number;
  durationMs: number;
  misses: Array<{ prompt: string; factHint: string | null }>;
};

export const speedQuestionKindLabelsCs: Record<SpeedQuestionKind, string> = {
  author_work: "Autor → dílo",
  term_definition: "Pojem → definice",
  true_false: "True / False",
  movement_trait: "Směr → vlastnost",
};

export function parseSpeedRoundPack(raw: unknown): SpeedRoundPack {
  const pack = speedRoundPackSchema.parse(raw);
  const slugs = new Set<string>();
  const kinds = new Set<SpeedQuestionKind>();
  for (const q of pack.questions) {
    if (slugs.has(q.slug)) throw new Error(`Duplicitní question slug: ${q.slug}`);
    slugs.add(q.slug);
    kinds.add(q.kind);
    if (!q.options.some((o) => o.id === q.correctOptionId)) {
      throw new Error(`Question ${q.slug}: correctOptionId není v options`);
    }
    if (q.prompt.length > 160) {
      throw new Error(`Question ${q.slug}: prompt too long for speed mode`);
    }
    // Guard: true/false must have exactly 2 options
    if (q.kind === "true_false" && q.options.length !== 2) {
      throw new Error(`Question ${q.slug}: true_false musí mít 2 options`);
    }
  }
  for (const kind of speedQuestionKinds) {
    if (!kinds.has(kind)) {
      throw new Error(`Pack musí obsahovat kind ${kind}`);
    }
  }
  return pack;
}

function shuffleIds(ids: string[]): string[] {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function startSpeedSession(input: {
  sessionId: string;
  learnerId: string;
  pack: SpeedRoundPack;
  nowIso: string;
}): SpeedRoundSession {
  const started = new Date(input.nowIso).getTime();
  const endsAt = new Date(started + input.pack.durationMs).toISOString();
  return {
    id: input.sessionId,
    learnerId: input.learnerId,
    packId: input.pack.id,
    packSlug: input.pack.slug,
    queue: shuffleIds(input.pack.questions.map((q) => q.id)),
    cursor: 0,
    answers: [],
    startedAt: input.nowIso,
    endsAt,
    finishedAt: null,
    status: "active",
  };
}

export function isSessionTimedOut(
  session: SpeedRoundSession,
  nowIso: string,
): boolean {
  return new Date(nowIso).getTime() >= new Date(session.endsAt).getTime();
}

export function remainingMs(
  session: SpeedRoundSession,
  nowIso: string,
): number {
  return Math.max(
    0,
    new Date(session.endsAt).getTime() - new Date(nowIso).getTime(),
  );
}

export function applySpeedAnswer(
  session: SpeedRoundSession,
  pack: SpeedRoundPack,
  input: {
    questionId: string;
    optionId: string;
    responseMs: number;
    nowIso: string;
  },
): {
  session: SpeedRoundSession;
  correct: boolean;
  completed: boolean;
} | null {
  if (session.status !== "active") return null;
  const timedOut = isSessionTimedOut(session, input.nowIso);
  if (timedOut && session.answers.length >= 0) {
    // Allow finishing if time already up — mark completed without new answer
    // unless they're answering the current question that started before timeout.
  }

  const expectedId = session.queue[session.cursor];
  if (expectedId !== input.questionId) return null;

  const question = pack.questions.find((q) => q.id === input.questionId);
  if (!question) return null;
  if (!question.options.some((o) => o.id === input.optionId)) return null;

  // Reject answers after hard timeout
  if (isSessionTimedOut(session, input.nowIso)) {
    return {
      session: {
        ...session,
        finishedAt: session.endsAt,
        status: "completed",
      },
      correct: false,
      completed: true,
    };
  }

  const correct = question.correctOptionId === input.optionId;
  const answer: SpeedAnswer = {
    questionId: input.questionId,
    optionId: input.optionId,
    correct,
    responseMs: Math.min(60_000, Math.max(0, input.responseMs)),
    at: input.nowIso,
  };

  const nextCursor = session.cursor + 1;
  const exhausted = nextCursor >= session.queue.length;
  const completed = exhausted;

  return {
    session: {
      ...session,
      cursor: nextCursor,
      answers: [...session.answers, answer],
      status: completed ? "completed" : "active",
      finishedAt: completed ? input.nowIso : null,
    },
    correct,
    completed,
  };
}

export function finishSpeedSession(
  session: SpeedRoundSession,
  nowIso: string,
): SpeedRoundSession {
  if (session.status !== "active") return session;
  return {
    ...session,
    status: "completed",
    finishedAt: nowIso,
  };
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

export function computeBestStreak(answers: SpeedAnswer[]): number {
  let best = 0;
  let cur = 0;
  for (const a of answers) {
    if (a.correct) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

/** +1 point per correct answer (simple — speed is reflected in volume). */
export function summarizeSpeedSession(
  session: SpeedRoundSession,
  pack: SpeedRoundPack,
): SpeedRoundSummary {
  const answers = session.answers;
  const correct = answers.filter((a) => a.correct).length;
  const answered = answers.length;
  const accuracyPct =
    answered === 0 ? 0 : Math.round((correct / answered) * 1000) / 10;
  const times = answers.map((a) => a.responseMs);
  const avgResponseMs =
    times.length === 0
      ? 0
      : Math.round(times.reduce((s, t) => s + t, 0) / times.length);

  const byId = new Map(pack.questions.map((q) => [q.id, q]));
  const misses = answers
    .filter((a) => !a.correct)
    .map((a) => {
      const q = byId.get(a.questionId);
      return {
        prompt: q?.prompt ?? "?",
        factHint: q?.factHint ?? null,
      };
    })
    .slice(0, 8);

  const end = session.finishedAt
    ? new Date(session.finishedAt).getTime()
    : Date.now();
  const durationMs = Math.min(
    pack.durationMs,
    Math.max(0, end - new Date(session.startedAt).getTime()),
  );

  return {
    score: correct,
    answered,
    correct,
    accuracyPct,
    bestStreak: computeBestStreak(answers),
    avgResponseMs,
    medianResponseMs: median(times),
    durationMs,
    misses,
  };
}

export function emptySpeedBest(
  learnerId: string,
  pack: SpeedRoundPack,
  nowIso: string,
): SpeedRoundBest {
  return {
    learnerId,
    packId: pack.id,
    packSlug: pack.slug,
    bestScore: 0,
    bestAccuracyPct: 0,
    bestStreak: 0,
    bestAvgResponseMs: null,
    runs: 0,
    updatedAt: nowIso,
  };
}

export function mergeSpeedBest(
  prev: SpeedRoundBest,
  summary: SpeedRoundSummary,
  nowIso: string,
): SpeedRoundBest {
  const betterScore = summary.score > prev.bestScore;
  const sameScoreFaster =
    summary.score === prev.bestScore &&
    summary.avgResponseMs > 0 &&
    (prev.bestAvgResponseMs === null ||
      summary.avgResponseMs < prev.bestAvgResponseMs);

  return {
    ...prev,
    bestScore: Math.max(prev.bestScore, summary.score),
    bestAccuracyPct: Math.max(prev.bestAccuracyPct, summary.accuracyPct),
    bestStreak: Math.max(prev.bestStreak, summary.bestStreak),
    bestAvgResponseMs:
      betterScore || sameScoreFaster || prev.bestAvgResponseMs === null
        ? summary.avgResponseMs || prev.bestAvgResponseMs
        : prev.bestAvgResponseMs,
    runs: prev.runs + 1,
    updatedAt: nowIso,
  };
}

export function currentQuestion(
  session: SpeedRoundSession,
  pack: SpeedRoundPack,
): SpeedQuestion | null {
  if (session.status !== "active") return null;
  const id = session.queue[session.cursor];
  if (!id) return null;
  return pack.questions.find((q) => q.id === id) ?? null;
}
