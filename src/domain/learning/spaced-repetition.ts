import { z } from "zod";
import {
  describeInterleave,
  interleaveKnowledgeOrder,
  preferDistinguishFormat,
  prioritizeForSelection,
} from "@/domain/learning/interleaving";

/**
 * Spaced repetition scheduler (D-032) + interleaving (D-033).
 * Per-knowledge: lastReviewed, nextReview, stability, difficulty, reviewCount, lapseCount.
 * Mixed review formats with anti-monotony rotation.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const reviewFormats = [
  "flashcard",
  "free_recall",
  "matching",
  "question",
] as const;

export type ReviewFormat = (typeof reviewFormats)[number];

export const reviewFormatSchema = z.enum(reviewFormats);

export const reviewFormatLabelsCs: Record<ReviewFormat, string> = {
  flashcard: "Flashcard",
  free_recall: "Free recall",
  matching: "Matching",
  question: "Otázka",
};

/** Approx seconds per item by format (for “cca X minut”). */
export const reviewFormatSeconds: Record<ReviewFormat, number> = {
  flashcard: 25,
  free_recall: 40,
  matching: 45,
  question: 35,
};

export const performanceGrades = ["again", "hard", "good", "easy"] as const;
export type PerformanceGrade = (typeof performanceGrades)[number];

export const performanceGradeSchema = z.enum(performanceGrades);

export const performanceGradeLabelsCs: Record<PerformanceGrade, string> = {
  again: "Znovu (chyba)",
  hard: "Těžké",
  good: "Dobře",
  easy: "Snadno / jistě",
};

/** Schedule row for one knowledge unit / atom. */
export const spacedScheduleSchema = z.object({
  knowledgeId: z.string().uuid(),
  lastReviewed: z.string().datetime().nullable(),
  nextReview: z.string().datetime(),
  /** Mean interval length in days (grows with success). */
  stability: z.number().min(0.05).max(365),
  /** 1 = easy … 10 = hard; slows growth. */
  difficulty: z.number().min(1).max(10),
  reviewCount: z.number().int().min(0).max(10_000),
  lapseCount: z.number().int().min(0).max(10_000),
  /** Last format used — for rotation. */
  lastFormat: reviewFormatSchema.nullable(),
  updatedAt: z.string().datetime(),
});

export type SpacedSchedule = z.infer<typeof spacedScheduleSchema>;

export const DEFAULT_STABILITY_DAYS = 0.5;
export const DEFAULT_DIFFICULTY = 5;

export function createSpacedSchedule(
  knowledgeId: string,
  nowIso: string,
): SpacedSchedule {
  return {
    knowledgeId,
    lastReviewed: null,
    nextReview: nowIso,
    stability: DEFAULT_STABILITY_DAYS,
    difficulty: DEFAULT_DIFFICULTY,
    reviewCount: 0,
    lapseCount: 0,
    lastFormat: null,
    updatedAt: nowIso,
  };
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setTime(d.getTime() + Math.max(0.05, days) * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Performance → schedule update.
 * Chyba → kratší interval. Opakovaná jistá odpověď → delší.
 */
export function applyPerformance(
  prev: SpacedSchedule,
  grade: PerformanceGrade,
  nowIso: string,
  format?: ReviewFormat,
): SpacedSchedule {
  let { stability, difficulty, reviewCount, lapseCount } = prev;

  switch (grade) {
    case "again": {
      lapseCount += 1;
      reviewCount += 1;
      difficulty = clamp(difficulty + 0.85, 1, 10);
      // Short interval after error
      stability = clamp(Math.min(stability * 0.35, 0.6), 0.1, 365);
      break;
    }
    case "hard": {
      reviewCount += 1;
      difficulty = clamp(difficulty + 0.2, 1, 10);
      stability = clamp(stability * 1.15, 0.2, 365);
      break;
    }
    case "good": {
      reviewCount += 1;
      difficulty = clamp(difficulty - 0.12, 1, 10);
      const grow = 1.45 + ((10 - difficulty) / 10) * 0.55;
      stability = clamp(stability * grow, 0.35, 365);
      break;
    }
    case "easy": {
      // Confident / fluent success — lengthen more
      reviewCount += 1;
      difficulty = clamp(difficulty - 0.28, 1, 10);
      const grow = 1.9 + ((10 - difficulty) / 10) * 0.9;
      // Extra bump when already reviewing successfully
      const streakBoost = prev.reviewCount >= 2 && prev.lapseCount === 0 ? 1.15 : 1;
      stability = clamp(stability * grow * streakBoost, 0.5, 365);
      break;
    }
  }

  const intervalDays =
    grade === "again"
      ? stability
      : grade === "hard"
        ? stability * 0.85
        : stability;

  return {
    knowledgeId: prev.knowledgeId,
    lastReviewed: nowIso,
    nextReview: addDays(nowIso, intervalDays),
    stability: Math.round(stability * 1000) / 1000,
    difficulty: Math.round(difficulty * 100) / 100,
    reviewCount,
    lapseCount,
    lastFormat: format ?? prev.lastFormat,
    updatedAt: nowIso,
  };
}

export function isScheduleDue(schedule: SpacedSchedule, nowIso: string): boolean {
  return new Date(schedule.nextReview).getTime() <= new Date(nowIso).getTime();
}

export function isScheduleNew(schedule: SpacedSchedule | undefined): boolean {
  return !schedule || schedule.lastReviewed === null;
}

// ——— Content pack (mixed formats per knowledge) ———

export const flashcardPayloadSchema = z.object({
  format: z.literal("flashcard"),
  front: z.string().min(1).max(280),
  back: z.string().min(1).max(400),
});

export const freeRecallPayloadSchema = z.object({
  format: z.literal("free_recall"),
  prompt: z.string().min(1).max(280),
  modelAnswer: z.string().min(1).max(500),
  keywords: z.array(z.string().min(1).max(40)).min(1).max(8),
});

export const matchingPayloadSchema = z.object({
  format: z.literal("matching"),
  left: z.string().min(1).max(120),
  right: z.string().min(1).max(160),
  distractors: z.array(z.string().min(1).max(160)).min(2).max(4),
});

export const questionPayloadSchema = z.object({
  format: z.literal("question"),
  stem: z.string().min(1).max(320),
  options: z.array(z.string().min(1).max(160)).length(4),
  correctIndex: z.number().int().min(0).max(3),
});

export const formatPayloadSchema = z.discriminatedUnion("format", [
  flashcardPayloadSchema,
  freeRecallPayloadSchema,
  matchingPayloadSchema,
  questionPayloadSchema,
]);

export type FormatPayload = z.infer<typeof formatPayloadSchema>;

export const reviewKnowledgeSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(160),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
  /** Topic cluster for interleaving (D-033). */
  clusterId: z.string().min(1).max(60).optional(),
  /** Entity key (balzac, dickens, maj, …) — caps same-author runs. */
  entityKey: z.string().min(1).max(60).optional(),
  /** At least 2 formats — enables rotation. */
  formats: z.array(formatPayloadSchema).min(2).max(4),
});

export type ReviewKnowledge = z.infer<typeof reviewKnowledgeSchema>;

export const spacedReviewPackSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  knowledge: z.array(reviewKnowledgeSchema).min(12).max(200),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SpacedReviewPack = z.infer<typeof spacedReviewPackSchema>;

export const learnerScheduleBookSchema = z.object({
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  byKnowledgeId: z.record(z.string(), spacedScheduleSchema),
  updatedAt: z.string().datetime(),
});

export type LearnerScheduleBook = z.infer<typeof learnerScheduleBookSchema>;

export const queuedReviewItemSchema = z.object({
  knowledgeId: z.string().uuid(),
  format: reviewFormatSchema,
  payload: formatPayloadSchema,
});

export type QueuedReviewItem = z.infer<typeof queuedReviewItemSchema>;

export const mixedReviewSessionSchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  queue: z.array(queuedReviewItemSchema),
  cursor: z.number().int().min(0),
  grades: z.array(
    z.object({
      knowledgeId: z.string().uuid(),
      format: reviewFormatSchema,
      grade: performanceGradeSchema,
      at: z.string().datetime(),
    }),
  ),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  status: z.enum(["active", "completed", "abandoned"]),
});

export type MixedReviewSession = z.infer<typeof mixedReviewSessionSchema>;

export function parseSpacedReviewPack(raw: unknown): SpacedReviewPack {
  const pack = spacedReviewPackSchema.parse(raw);
  const slugs = new Set<string>();
  for (const k of pack.knowledge) {
    if (slugs.has(k.slug)) throw new Error(`Duplicitní knowledge slug: ${k.slug}`);
    slugs.add(k.slug);
    const formats = new Set(k.formats.map((f) => f.format));
    if (formats.size < 2) {
      throw new Error(
        `Knowledge ${k.slug}: potřeba ≥2 různé formáty (anti-monotony)`,
      );
    }
  }
  return pack;
}

export type DueSummary = {
  dueCount: number;
  newCount: number;
  estimatedMinutes: number;
  /** Exact dashboard copy. */
  headlineCs: string;
  /** D-033 interleaving phase explanation. */
  interleaveRationaleCs?: string;
};

export function estimateMinutes(items: QueuedReviewItem[]): number {
  const seconds = items.reduce(
    (s, it) => s + reviewFormatSeconds[it.format],
    0,
  );
  return Math.max(1, Math.round(seconds / 60));
}

export function buildDueSummary(input: {
  pack: SpacedReviewPack;
  book: LearnerScheduleBook | null;
  nowIso: string;
  /** Cap for headline estimate (same as daily queue). */
  maxItems?: number;
}): DueSummary {
  const maxItems = input.maxItems ?? 24;
  const queue = buildMixedReviewQueue({
    pack: input.pack,
    book: input.book,
    nowIso: input.nowIso,
    limits: { maxDue: maxItems, maxNew: 6 },
  });
  const dueCount = queue.filter((q) => {
    const sch = input.book?.byKnowledgeId[q.knowledgeId];
    return sch ? isScheduleDue(sch, input.nowIso) && !isScheduleNew(sch) : false;
  }).length;
  const newCount = queue.length - dueCount;
  const estimatedMinutes = estimateMinutes(queue);
  const total = queue.length;
  const headlineCs =
    total === 0
      ? "Dnes k zopakování: 0 položek – nic ve frontě."
      : `Dnes k zopakování: ${total} položek – cca ${estimatedMinutes} minut.`;
  const interleaveRationaleCs = describeInterleave(
    input.pack,
    input.book,
  ).rationaleCs;
  return {
    dueCount,
    newCount,
    estimatedMinutes,
    headlineCs,
    interleaveRationaleCs,
  };
}

/**
 * Pick format for knowledge: prefer unused recently, never same as lastFormat
 * when alternatives exist. Session-level: avoid consecutive identical formats.
 */
export function pickFormat(input: {
  knowledge: ReviewKnowledge;
  lastFormat: ReviewFormat | null;
  previousInSession: ReviewFormat | null;
  /** Prefer question when testing confusable entities (D-033). */
  preferQuestion?: boolean;
}): { format: ReviewFormat; payload: FormatPayload } {
  const available = input.knowledge.formats;
  const byFormat = new Map(available.map((p) => [p.format, p]));

  const candidates = available.map((p) => p.format);

  // Prefer not matching previous session item format
  let pool = candidates.filter((f) => f !== input.previousInSession);
  if (pool.length === 0) pool = [...candidates];

  // Prefer not repeating lastFormat for this knowledge
  const rotated = pool.filter((f) => f !== input.lastFormat);
  const choicePool = rotated.length > 0 ? rotated : pool;

  // Stable preference — question first (esp. distinguish / interleaving)
  const preference: ReviewFormat[] = [
    "question",
    "matching",
    "free_recall",
    "flashcard",
  ];
  let ordered = [...choicePool].sort(
    (a, b) => preference.indexOf(a) - preference.indexOf(b),
  );
  if (input.preferQuestion && choicePool.includes("question")) {
    ordered = ["question", ...ordered.filter((f) => f !== "question")];
  }
  const format = ordered[0]!;
  const payload = byFormat.get(format)!;
  return { format, payload };
}

export function buildMixedReviewQueue(input: {
  pack: SpacedReviewPack;
  book: LearnerScheduleBook | null;
  nowIso: string;
  limits?: { maxDue?: number; maxNew?: number };
}): QueuedReviewItem[] {
  const maxDue = input.limits?.maxDue ?? 18;
  const maxNew = input.limits?.maxNew ?? 4;
  const book = input.book;

  const due: ReviewKnowledge[] = [];
  const fresh: ReviewKnowledge[] = [];

  for (const k of input.pack.knowledge) {
    const sch = book?.byKnowledgeId[k.id];
    if (!sch || isScheduleNew(sch)) {
      fresh.push(k);
    } else if (isScheduleDue(sch, input.nowIso)) {
      due.push(k);
    }
  }

  due.sort((a, b) => {
    const sa = book!.byKnowledgeId[a.id]!;
    const sb = book!.byKnowledgeId[b.id]!;
    return (
      new Date(sa.nextReview).getTime() - new Date(sb.nextReview).getTime()
    );
  });

  // D-033: interleave — beginner stays in one cluster; advanced mixes entities
  const interleaveMeta = describeInterleave(input.pack, book);
  const duePrior = prioritizeForSelection(due, interleaveMeta);
  const freshPrior = prioritizeForSelection(fresh, interleaveMeta);

  const selectedRaw = [
    ...duePrior.slice(0, maxDue),
    ...freshPrior.slice(0, maxNew),
  ];
  const { ordered: selected } = interleaveKnowledgeOrder({
    candidates: selectedRaw,
    pack: input.pack,
    book,
  });

  const queue: QueuedReviewItem[] = [];
  let previousFormat: ReviewFormat | null = null;

  for (const k of selected) {
    const sch = book?.byKnowledgeId[k.id];
    const { format, payload } = pickFormat({
      knowledge: k,
      lastFormat: sch?.lastFormat ?? null,
      previousInSession: previousFormat,
      preferQuestion: preferDistinguishFormat(k, interleaveMeta.phase),
    });
    queue.push({ knowledgeId: k.id, format, payload });
    previousFormat = format;
  }

  // Enforce: no run of 3+ same format (swap with later different if possible)
  return enforceFormatDiversity(queue, input.pack);
}

function enforceFormatDiversity(
  queue: QueuedReviewItem[],
  pack: SpacedReviewPack,
): QueuedReviewItem[] {
  const byId = new Map(pack.knowledge.map((k) => [k.id, k]));
  const out = [...queue];

  for (let i = 2; i < out.length; i += 1) {
    const a = out[i - 2]!.format;
    const b = out[i - 1]!.format;
    const c = out[i]!.format;
    if (a === b && b === c) {
      // find later item with different format to swap
      for (let j = i + 1; j < out.length; j += 1) {
        if (out[j]!.format !== c) {
          [out[i], out[j]] = [out[j]!, out[i]!];
          break;
        }
      }
      // if still stuck, re-pick format for i
      if (
        out[i - 2]!.format === out[i - 1]!.format &&
        out[i - 1]!.format === out[i]!.format
      ) {
        const k = byId.get(out[i]!.knowledgeId);
        if (k) {
          const picked = pickFormat({
            knowledge: k,
            lastFormat: out[i]!.format,
            previousInSession: out[i - 1]!.format,
          });
          out[i] = {
            knowledgeId: out[i]!.knowledgeId,
            format: picked.format,
            payload: picked.payload,
          };
        }
      }
    }
  }
  return out;
}

export function emptyScheduleBook(
  learnerId: string,
  pack: SpacedReviewPack,
  nowIso: string,
): LearnerScheduleBook {
  return {
    learnerId,
    packId: pack.id,
    packSlug: pack.slug,
    byKnowledgeId: {},
    updatedAt: nowIso,
  };
}

export function startMixedSession(input: {
  sessionId: string;
  learnerId: string;
  pack: SpacedReviewPack;
  book: LearnerScheduleBook | null;
  nowIso: string;
}): MixedReviewSession {
  const queue = buildMixedReviewQueue({
    pack: input.pack,
    book: input.book,
    nowIso: input.nowIso,
    limits: { maxDue: 18, maxNew: 4 },
  });
  return {
    id: input.sessionId,
    learnerId: input.learnerId,
    packId: input.pack.id,
    packSlug: input.pack.slug,
    queue,
    cursor: 0,
    grades: [],
    startedAt: input.nowIso,
    finishedAt: null,
    status: queue.length === 0 ? "completed" : "active",
  };
}

export function applySessionGrade(input: {
  session: MixedReviewSession;
  book: LearnerScheduleBook;
  grade: PerformanceGrade;
  nowIso: string;
}): {
  session: MixedReviewSession;
  book: LearnerScheduleBook;
  completed: boolean;
} {
  const session = input.session;
  if (session.status !== "active") {
    return { session, book: input.book, completed: true };
  }
  const item = session.queue[session.cursor];
  if (!item) {
    return {
      session: {
        ...session,
        status: "completed",
        finishedAt: input.nowIso,
      },
      book: input.book,
      completed: true,
    };
  }

  const prev =
    input.book.byKnowledgeId[item.knowledgeId] ??
    createSpacedSchedule(item.knowledgeId, input.nowIso);

  const nextSch = applyPerformance(
    prev,
    input.grade,
    input.nowIso,
    item.format,
  );

  const book: LearnerScheduleBook = {
    ...input.book,
    byKnowledgeId: {
      ...input.book.byKnowledgeId,
      [item.knowledgeId]: nextSch,
    },
    updatedAt: input.nowIso,
  };

  const nextCursor = session.cursor + 1;
  const completed = nextCursor >= session.queue.length;

  return {
    book,
    completed,
    session: {
      ...session,
      cursor: nextCursor,
      grades: [
        ...session.grades,
        {
          knowledgeId: item.knowledgeId,
          format: item.format,
          grade: input.grade,
          at: input.nowIso,
        },
      ],
      status: completed ? "completed" : "active",
      finishedAt: completed ? input.nowIso : null,
    },
  };
}

/** Normalize free-recall self-check: keyword hits → suggested grade (student still confirms). */
export function suggestGradeFromRecall(
  answer: string,
  keywords: string[],
): PerformanceGrade {
  const norm = answer
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const hits = keywords.filter((kw) =>
    norm.includes(
      kw
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    ),
  ).length;
  const ratio = keywords.length === 0 ? 0 : hits / keywords.length;
  if (ratio >= 0.75) return "easy";
  if (ratio >= 0.45) return "good";
  if (ratio >= 0.2) return "hard";
  return "again";
}
