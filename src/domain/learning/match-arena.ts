import { z } from "zod";

/**
 * Match Arena — pair connecting drills (D-027).
 * Desktop drag/drop + mobile tap-to-match. Wrong pairs → review queue.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const matchPairKinds = [
  "author_work",
  "work_character",
  "author_country",
  "movement_trait",
  "term_definition",
  "event_period",
] as const;

export type MatchPairKind = (typeof matchPairKinds)[number];

export const matchPairKindSchema = z.enum(matchPairKinds);

export const matchSideSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(200),
});

export type MatchSide = z.infer<typeof matchSideSchema>;

export const matchPairSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  kind: matchPairKindSchema,
  left: matchSideSchema,
  right: matchSideSchema,
  /** Why this pair is correct — shown after a wrong attempt. */
  explanation: z.string().min(1).max(800),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
});

export type MatchPair = z.infer<typeof matchPairSchema>;

export const matchRoundSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  kind: matchPairKindSchema,
  title: z.string().min(1).max(120),
  /** Exactly the pairs that belong in this round (same kind). */
  pairIds: z.array(z.string().uuid()).min(3).max(8),
});

export type MatchRound = z.infer<typeof matchRoundSchema>;

export const matchArenaPackSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  pairs: z.array(matchPairSchema).min(12).max(200),
  rounds: z.array(matchRoundSchema).min(3).max(40),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type MatchArenaPack = z.infer<typeof matchArenaPackSchema>;

export const matchAttemptSchema = z.object({
  pairId: z.string().uuid(),
  leftId: z.string().uuid(),
  rightId: z.string().uuid(),
  correct: z.boolean(),
  elapsedMs: z.number().int().min(0).max(600_000),
  at: z.string().datetime(),
});

export type MatchAttempt = z.infer<typeof matchAttemptSchema>;

export const matchArenaSessionSchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  mode: z.enum(["arena", "review"]).default("arena"),
  roundIds: z.array(z.string().uuid()).min(1),
  cursor: z.number().int().min(0),
  attempts: z.array(matchAttemptSchema),
  /** Pair ids still unmatched in the current round. */
  openPairIds: z.array(z.string().uuid()),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  status: z.enum(["active", "completed", "abandoned"]),
});

export type MatchArenaSession = z.infer<typeof matchArenaSessionSchema>;

export const reviewQueueEntrySchema = z.object({
  pairId: z.string().uuid(),
  wrongCount: z.number().int().min(1).max(500),
  lastWrongAt: z.string().datetime(),
  lastElapsedMs: z.number().int().min(0).max(600_000),
});

export type ReviewQueueEntry = z.infer<typeof reviewQueueEntrySchema>;

export const matchReviewQueueSchema = z.object({
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  /** Ordered: most recently wrong first. */
  pairIds: z.array(z.string().uuid()),
  byPairId: z.record(z.string(), reviewQueueEntrySchema),
  updatedAt: z.string().datetime(),
});

export type MatchReviewQueue = z.infer<typeof matchReviewQueueSchema>;

export const matchPairKindLabelsCs: Record<MatchPairKind, string> = {
  author_work: "Autor ↔ dílo",
  work_character: "Dílo ↔ postava",
  author_country: "Autor ↔ země",
  movement_trait: "Směr ↔ znak",
  term_definition: "Pojem ↔ definice",
  event_period: "Událost ↔ období",
};

export const matchPairKindLeftLabelCs: Record<MatchPairKind, string> = {
  author_work: "Autor",
  work_character: "Dílo",
  author_country: "Autor",
  movement_trait: "Směr",
  term_definition: "Pojem",
  event_period: "Událost",
};

export const matchPairKindRightLabelCs: Record<MatchPairKind, string> = {
  author_work: "Dílo",
  work_character: "Postava",
  author_country: "Země",
  movement_trait: "Znak",
  term_definition: "Definice",
  event_period: "Období",
};

export function parseMatchArenaPack(raw: unknown): MatchArenaPack {
  const pack = matchArenaPackSchema.parse(raw);
  const pairById = new Map(pack.pairs.map((p) => [p.id, p]));
  const pairSlugs = new Set<string>();
  for (const pair of pack.pairs) {
    if (pairSlugs.has(pair.slug)) {
      throw new Error(`Duplicitní pair slug: ${pair.slug}`);
    }
    pairSlugs.add(pair.slug);
  }
  const roundSlugs = new Set<string>();
  for (const round of pack.rounds) {
    if (roundSlugs.has(round.slug)) {
      throw new Error(`Duplicitní round slug: ${round.slug}`);
    }
    roundSlugs.add(round.slug);
    for (const pairId of round.pairIds) {
      const pair = pairById.get(pairId);
      if (!pair) throw new Error(`Round ${round.slug}: chybí pair ${pairId}`);
      if (pair.kind !== round.kind) {
        throw new Error(
          `Round ${round.slug}: pair ${pair.slug} má kind ${pair.kind}, očekáváno ${round.kind}`,
        );
      }
    }
  }
  return pack;
}

export type MatchGradeResult = {
  correct: boolean;
  pair: MatchPair;
  /** Student-facing explanation after wrong match. */
  explanation: string | null;
  /** Correct right label for the left item. */
  expectedRightLabel: string;
  /** If they picked a wrong right that belongs to another pair. */
  mistakenRightBelongsTo: string | null;
};

export function gradeMatch(input: {
  pack: MatchArenaPack;
  leftId: string;
  rightId: string;
}): MatchGradeResult | null {
  const pair = input.pack.pairs.find((p) => p.left.id === input.leftId);
  if (!pair) return null;

  const correct = pair.right.id === input.rightId;
  if (correct) {
    return {
      correct: true,
      pair,
      explanation: null,
      expectedRightLabel: pair.right.label,
      mistakenRightBelongsTo: null,
    };
  }

  const mistakenPair = input.pack.pairs.find(
    (p) => p.right.id === input.rightId && p.kind === pair.kind,
  );
  const mistakenBelongs = mistakenPair
    ? `"${mistakenPair.right.label}" patří k „${mistakenPair.left.label}".`
    : null;

  const explanation = [
    `Špatně. „${pair.left.label}" patří k „${pair.right.label}".`,
    pair.explanation,
    mistakenBelongs,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    correct: false,
    pair,
    explanation,
    expectedRightLabel: pair.right.label,
    mistakenRightBelongsTo: mistakenPair?.left.label ?? null,
  };
}

export function emptyReviewQueue(
  learnerId: string,
  pack: MatchArenaPack,
  nowIso: string,
): MatchReviewQueue {
  return {
    learnerId,
    packId: pack.id,
    packSlug: pack.slug,
    pairIds: [],
    byPairId: {},
    updatedAt: nowIso,
  };
}

/** Push wrong pair to front of review queue (deduped). */
export function enqueueWrongPair(
  queue: MatchReviewQueue,
  pairId: string,
  elapsedMs: number,
  nowIso: string,
): MatchReviewQueue {
  const prev = queue.byPairId[pairId];
  const entry: ReviewQueueEntry = {
    pairId,
    wrongCount: (prev?.wrongCount ?? 0) + 1,
    lastWrongAt: nowIso,
    lastElapsedMs: elapsedMs,
  };
  const without = queue.pairIds.filter((id) => id !== pairId);
  return {
    ...queue,
    pairIds: [pairId, ...without],
    byPairId: { ...queue.byPairId, [pairId]: entry },
    updatedAt: nowIso,
  };
}

/** Remove pair after a successful review match. */
export function dequeueReviewedPair(
  queue: MatchReviewQueue,
  pairId: string,
  nowIso: string,
): MatchReviewQueue {
  if (!queue.byPairId[pairId]) return queue;
  const nextByPairId = { ...queue.byPairId };
  delete nextByPairId[pairId];
  return {
    ...queue,
    pairIds: queue.pairIds.filter((id) => id !== pairId),
    byPairId: nextByPairId,
    updatedAt: nowIso,
  };
}

export function startMatchSession(input: {
  sessionId: string;
  learnerId: string;
  pack: MatchArenaPack;
  nowIso: string;
  /** Prefer review-only mode when queue has items. */
  reviewQueue?: MatchReviewQueue | null;
  reviewMode?: boolean;
}): MatchArenaSession {
  const reviewMode =
    input.reviewMode === true &&
    (input.reviewQueue?.pairIds.length ?? 0) > 0;

  if (reviewMode && input.reviewQueue) {
    const ordered = input.reviewQueue.pairIds
      .map((id) => input.pack.pairs.find((p) => p.id === id))
      .filter((p): p is MatchPair => Boolean(p));
    const firstKind = ordered[0]?.kind;
    const sameKind = firstKind
      ? ordered.filter((p) => p.kind === firstKind).slice(0, 6)
      : [];
    const open = sameKind.map((p) => p.id);
    const firstRound = input.pack.rounds[0]!;
    return {
      id: input.sessionId,
      learnerId: input.learnerId,
      packId: input.pack.id,
      packSlug: input.pack.slug,
      mode: "review",
      roundIds: [firstRound.id],
      cursor: 0,
      attempts: [],
      openPairIds: open,
      startedAt: input.nowIso,
      finishedAt: null,
      status: open.length === 0 ? "completed" : "active",
    };
  }

  const roundIds = input.pack.rounds.map((r) => r.id);
  const first = input.pack.rounds[0]!;
  return {
    id: input.sessionId,
    learnerId: input.learnerId,
    packId: input.pack.id,
    packSlug: input.pack.slug,
    mode: "arena",
    roundIds,
    cursor: 0,
    attempts: [],
    openPairIds: [...first.pairIds],
    startedAt: input.nowIso,
    finishedAt: null,
    status: "active",
  };
}

export function applyMatchAttempt(
  session: MatchArenaSession,
  pack: MatchArenaPack,
  input: {
    leftId: string;
    rightId: string;
    elapsedMs: number;
    nowIso: string;
  },
): {
  session: MatchArenaSession;
  grade: MatchGradeResult;
  advancedRound: boolean;
  completed: boolean;
} | null {
  if (session.status !== "active") return null;
  const grade = gradeMatch({
    pack,
    leftId: input.leftId,
    rightId: input.rightId,
  });
  if (!grade) return null;
  if (!session.openPairIds.includes(grade.pair.id)) return null;

  const attempt: MatchAttempt = {
    pairId: grade.pair.id,
    leftId: input.leftId,
    rightId: input.rightId,
    correct: grade.correct,
    elapsedMs: input.elapsedMs,
    at: input.nowIso,
  };

  let openPairIds = session.openPairIds;
  let cursor = session.cursor;
  let advancedRound = false;
  let status: MatchArenaSession["status"] = session.status;
  let finishedAt = session.finishedAt;

  if (grade.correct) {
    openPairIds = openPairIds.filter((id) => id !== grade.pair.id);
    if (openPairIds.length === 0) {
      if (session.mode === "review") {
        status = "completed";
        finishedAt = input.nowIso;
        advancedRound = true;
      } else {
        const nextCursor = cursor + 1;
        if (nextCursor >= session.roundIds.length) {
          status = "completed";
          finishedAt = input.nowIso;
          cursor = nextCursor;
          advancedRound = true;
        } else {
          const nextRound = pack.rounds.find(
            (r) => r.id === session.roundIds[nextCursor],
          );
          if (!nextRound) {
            status = "completed";
            finishedAt = input.nowIso;
            cursor = nextCursor;
          } else {
            cursor = nextCursor;
            openPairIds = [...nextRound.pairIds];
            advancedRound = true;
          }
        }
      }
    }
  }

  return {
    session: {
      ...session,
      cursor,
      openPairIds,
      attempts: [...session.attempts, attempt],
      status,
      finishedAt,
    },
    grade,
    advancedRound,
    completed: status === "completed",
  };
}

export type WeakPairStat = {
  pairId: string;
  kind: MatchPairKind;
  leftLabel: string;
  rightLabel: string;
  wrongCount: number;
  avgWrongMs: number;
};

export type MatchSessionSummary = {
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  accuracyPct: number;
  avgMs: number;
  medianMs: number;
  durationMs: number;
  weakPairs: WeakPairStat[];
};

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

export function summarizeMatchSession(
  session: MatchArenaSession,
  pack: MatchArenaPack,
): MatchSessionSummary {
  const attempts = session.attempts;
  const correctCount = attempts.filter((a) => a.correct).length;
  const wrongCount = attempts.length - correctCount;
  const accuracyPct =
    attempts.length === 0
      ? 0
      : Math.round((correctCount / attempts.length) * 1000) / 10;

  const times = attempts.map((a) => a.elapsedMs);
  const avgMs =
    times.length === 0
      ? 0
      : Math.round(times.reduce((s, t) => s + t, 0) / times.length);

  const end = session.finishedAt
    ? new Date(session.finishedAt).getTime()
    : Date.now();
  const durationMs = Math.max(0, end - new Date(session.startedAt).getTime());

  const wrongByPair = new Map<
    string,
    { count: number; totalMs: number }
  >();
  for (const a of attempts) {
    if (a.correct) continue;
    const prev = wrongByPair.get(a.pairId) ?? { count: 0, totalMs: 0 };
    wrongByPair.set(a.pairId, {
      count: prev.count + 1,
      totalMs: prev.totalMs + a.elapsedMs,
    });
  }

  const pairById = new Map(pack.pairs.map((p) => [p.id, p]));
  const weakPairs: WeakPairStat[] = [...wrongByPair.entries()]
    .map(([pairId, stat]) => {
      const pair = pairById.get(pairId);
      if (!pair) return null;
      return {
        pairId,
        kind: pair.kind,
        leftLabel: pair.left.label,
        rightLabel: pair.right.label,
        wrongCount: stat.count,
        avgWrongMs: Math.round(stat.totalMs / stat.count),
      };
    })
    .filter((x): x is WeakPairStat => Boolean(x))
    .sort((a, b) => b.wrongCount - a.wrongCount || b.avgWrongMs - a.avgWrongMs);

  return {
    totalAttempts: attempts.length,
    correctCount,
    wrongCount,
    accuracyPct,
    avgMs,
    medianMs: median(times),
    durationMs,
    weakPairs,
  };
}

/** Fisher–Yates with seeded-ish shuffle from string for SSR stability optional. */
export function shuffleLabels<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function getRoundPairs(
  pack: MatchArenaPack,
  roundId: string,
): MatchPair[] {
  const round = pack.rounds.find((r) => r.id === roundId);
  if (!round) return [];
  const byId = new Map(pack.pairs.map((p) => [p.id, p]));
  return round.pairIds
    .map((id) => byId.get(id))
    .filter((p): p is MatchPair => Boolean(p));
}

export function resolveOpenPairs(
  pack: MatchArenaPack,
  openPairIds: string[],
): MatchPair[] {
  const byId = new Map(pack.pairs.map((p) => [p.id, p]));
  return openPairIds
    .map((id) => byId.get(id))
    .filter((p): p is MatchPair => Boolean(p));
}
