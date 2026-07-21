import { randomUUID } from "node:crypto";
import {
  classifyRetentionWindow,
  daysBetween,
  emptyDaily,
  emptyMethodStats,
  planAdherencePct,
  recomputeMethodStats,
  weekKeyFromDateKey,
  type BaselineSnapshot,
  type ExperimentAssessment,
  type ExperimentBook,
  type ExperimentMethod,
  type TopicMastery,
} from "@/domain/learning/beta-experiment";
import {
  getOrCreateExperimentBook,
  saveExperimentBook,
} from "@/server/beta-experiment/store";

export type ExperimentActivityInput = {
  learnerId: string;
  method: ExperimentMethod;
  topicSlug?: string;
  topicTitle?: string;
  itemId?: string;
  knowledgeUnits?: Array<{ id: string; title?: string }>;
  /** 0–1 continuous; defaults from correct. */
  score01?: number;
  correct?: boolean;
  partial?: boolean;
  minutes?: number;
  kind: "practice" | "review" | "lesson" | "assessment" | "diagnostic";
  plannedMinutes?: number;
  masteryEndPct?: number | null;
  /** Mark question as seen (practice) — excluded from future checkpoints. */
  markQuestionSeen?: boolean;
  assessmentId?: string;
  oralScore?: number;
  targetDate?: string;
  nowIso?: string;
};

function upsertMethod(
  book: ExperimentBook,
  method: ExperimentMethod,
  input: {
    score01: number;
    correct: boolean;
    partial: boolean;
    minutes: number;
  },
): ExperimentBook {
  const stats = [...book.methodStats];
  let idx = stats.findIndex((m) => m.method === method);
  if (idx < 0) {
    stats.push(emptyMethodStats(method));
    idx = stats.length - 1;
  }
  const cur = { ...stats[idx]! };
  cur.attempts += 1;
  cur.scoreSum += input.score01;
  cur.minutes += input.minutes;
  if (input.partial) cur.partial += 1;
  else if (input.correct) cur.correct += 1;
  else cur.incorrect += 1;
  stats[idx] = recomputeMethodStats(cur);
  return { ...book, methodStats: stats };
}

function upsertDaily(
  book: ExperimentBook,
  input: ExperimentActivityInput,
  nowIso: string,
): ExperimentBook {
  const dateKey = nowIso.slice(0, 10);
  const planned = input.plannedMinutes ?? 25;
  const prev = book.dailyByDate[dateKey] ?? emptyDaily(dateKey, planned, nowIso);
  const minutes = Math.max(0, input.minutes ?? 0);
  let lessonsCompleted = prev.lessonsCompleted;
  let reviewsCompleted = prev.reviewsCompleted;
  let questionsAnswered = prev.questionsAnswered;
  let questionsCorrect = prev.questionsCorrect;
  let masteryDelta = prev.masteryDelta;

  if (input.kind === "lesson") lessonsCompleted += 1;
  if (input.kind === "review") reviewsCompleted += 1;
  if (
    input.kind === "practice" ||
    input.kind === "assessment" ||
    input.kind === "diagnostic"
  ) {
    if (input.correct != null || input.score01 != null) {
      questionsAnswered += 1;
      if (input.correct) questionsCorrect += 1;
    }
  }

  const minutesStudied = prev.minutesStudied + minutes;
  const plannedMinutes = Math.max(prev.plannedMinutes, planned);
  const topics = new Set(prev.topicsStudied);
  if (input.topicSlug) topics.add(input.topicSlug);
  if (input.topicTitle) topics.add(input.topicTitle.slice(0, 120));
  const methods = new Set(prev.methodsUsed);
  methods.add(input.method);

  if (
    input.masteryEndPct != null &&
    prev.masteryEndPct != null &&
    Number.isFinite(input.masteryEndPct)
  ) {
    masteryDelta = Math.round(input.masteryEndPct - prev.masteryEndPct);
  } else if (input.masteryEndPct != null && prev.masteryEndPct == null) {
    masteryDelta = 0;
  }

  const accuracyPct =
    questionsAnswered > 0
      ? Math.round((100 * questionsCorrect) / questionsAnswered)
      : prev.accuracyPct;

  return {
    ...book,
    dailyByDate: {
      ...book.dailyByDate,
      [dateKey]: {
        dateKey,
        minutesStudied,
        plannedMinutes,
        planAdherencePct: planAdherencePct(minutesStudied, plannedMinutes),
        lessonsCompleted,
        reviewsCompleted,
        questionsAnswered,
        questionsCorrect,
        accuracyPct,
        masteryDelta,
        masteryEndPct: input.masteryEndPct ?? prev.masteryEndPct,
        topicsStudied: [...topics].slice(0, 40),
        methodsUsed: [...methods].slice(0, 12) as ExperimentMethod[],
        updatedAt: nowIso,
      },
    },
  };
}

function applyRetention(
  book: ExperimentBook,
  input: ExperimentActivityInput,
  nowIso: string,
  score01: number,
  correct: boolean,
): ExperimentBook {
  const units = input.knowledgeUnits ?? [];
  if (units.length === 0) return book;
  const retention = [...book.retention];

  for (const ku of units.slice(0, 8)) {
    const idx = retention.findIndex((r) => r.knowledgeUnitId === ku.id);
    if (correct && (input.kind === "practice" || input.kind === "lesson")) {
      if (idx < 0) {
        retention.push({
          id: randomUUID(),
          knowledgeUnitId: ku.id,
          title: (ku.title ?? ku.id).slice(0, 160),
          learnedAt: nowIso,
          learnedMethod: input.method,
          state: "learned",
          probes: [
            {
              window: "immediate" as const,
              at: nowIso,
              correct: true,
              score01,
              method: input.method,
              itemId: input.itemId,
            },
          ],
        });
        continue;
      }
    }

    if (idx < 0) continue;
    const row = { ...retention[idx]! };
    const days = daysBetween(row.learnedAt, nowIso);
    const window = classifyRetentionWindow(days);
    if (!window) {
      retention[idx] = row;
      continue;
    }
    if (window === "immediate") {
      if (days > 0.01) {
        row.probes = [
          ...row.probes,
          {
            window: "immediate" as const,
            at: nowIso,
            correct,
            score01,
            method: input.method,
            itemId: input.itemId,
          },
        ].slice(-20);
      }
      retention[idx] = row;
      continue;
    }
    // One probe per delayed window (keep first)
    if (row.probes.some((p) => p.window === window)) {
      retention[idx] = row;
      continue;
    }
    row.probes = [
      ...row.probes,
      {
        window,
        at: nowIso,
        correct,
        score01,
        method: input.method,
        itemId: input.itemId,
      },
    ].slice(-20);
    row.state = correct ? "retained" : "forgotten";
    retention[idx] = row;
  }

  return { ...book, retention: retention.slice(0, 200) };
}

function applyAssessmentAttempt(
  book: ExperimentBook,
  input: ExperimentActivityInput,
  nowIso: string,
  score01: number,
  correct: boolean,
): ExperimentBook {
  if (!input.assessmentId || !input.itemId) return book;
  const patchOne = (a: ExperimentAssessment): ExperimentAssessment => {
    if (a.id !== input.assessmentId) return a;
    if (a.attempts.some((x) => x.questionId === input.itemId)) return a;
    const attempts = [
      ...a.attempts,
      {
        questionId: input.itemId!,
        correct,
        score01,
        isTransfer: a.transferQuestionIds.includes(input.itemId!),
        at: nowIso,
      },
    ];
    const accuracyPct =
      attempts.length > 0
        ? Math.round(
            (100 * attempts.filter((x) => x.correct).length) / attempts.length,
          )
        : null;
    const completedAt =
      attempts.length >= a.questionIds.length ? nowIso : a.completedAt;
    return { ...a, attempts, accuracyPct, completedAt };
  };

  const assessments = book.assessments.map(patchOne);
  let final = book.final ? patchOne(book.final) : null;
  if (book.final && input.assessmentId === book.final.id) {
    final = patchOne(book.final);
  }
  return { ...book, assessments, final };
}

/**
 * Fire-and-forget safe: never throws to callers.
 */
export async function recordExperimentActivity(
  input: ExperimentActivityInput,
): Promise<ExperimentBook | null> {
  try {
    const nowIso = input.nowIso ?? new Date().toISOString();
    let book = await getOrCreateExperimentBook({
      learnerId: input.learnerId,
      targetDate: input.targetDate,
    });

    const score01 =
      input.score01 ??
      (input.correct ? 1 : input.partial ? 0.5 : input.correct === false ? 0 : 0);
    const correct = Boolean(input.correct);
    const partial = Boolean(input.partial);
    const minutes = Math.max(0, input.minutes ?? 0);

    if (input.kind === "diagnostic" && !book.diagnosticStartedAt) {
      book = { ...book, diagnosticStartedAt: nowIso };
    }

    book = upsertDaily(book, input, nowIso);
    if (input.correct != null || input.score01 != null) {
      book = upsertMethod(book, input.method, {
        score01,
        correct,
        partial,
        minutes,
      });
    } else if (minutes > 0) {
      book = upsertMethod(book, input.method, {
        score01: 0,
        correct: false,
        partial: false,
        minutes,
      });
    }

    if (input.markQuestionSeen && input.itemId) {
      const seen = new Set(book.seenQuestionIds);
      seen.add(input.itemId);
      book = { ...book, seenQuestionIds: [...seen].slice(-500) };
    }

    if (
      input.kind === "practice" ||
      input.kind === "review" ||
      input.kind === "lesson" ||
      input.kind === "assessment"
    ) {
      book = applyRetention(book, input, nowIso, score01, correct);
    }

    if (input.kind === "assessment") {
      book = applyAssessmentAttempt(book, input, nowIso, score01, correct);
    }

    if (input.oralScore != null) {
      const simCount = book.oral.simulationCount + 1;
      const last = Math.round(input.oralScore);
      const prevAvg = book.oral.avgScore;
      const avgScore =
        prevAvg == null
          ? last
          : Math.round((prevAvg * (simCount - 1) + last) / simCount);
      book = {
        ...book,
        oral: { simulationCount: simCount, lastScore: last, avgScore },
      };
    }

    await saveExperimentBook(book);
    return book;
  } catch (error) {
    console.error("[beta-experiment] record failed", error);
    return null;
  }
}

export async function writeExperimentBaseline(input: {
  learnerId: string;
  baseline: BaselineSnapshot;
  targetDate?: string;
}): Promise<ExperimentBook | null> {
  try {
    let book = await getOrCreateExperimentBook({
      learnerId: input.learnerId,
      targetDate: input.targetDate,
    });
    if (book.baseline) return book;
    book = {
      ...book,
      baseline: input.baseline,
      diagnosticStartedAt:
        book.diagnosticStartedAt ?? input.baseline.startedAt,
    };
    await saveExperimentBook(book);
    return book;
  } catch (error) {
    console.error("[beta-experiment] baseline failed", error);
    return null;
  }
}

export async function createExperimentAssessment(input: {
  learnerId: string;
  kind: "weekly" | "final";
  packSlug: string;
  questionIds: string[];
  transferQuestionIds: string[];
  topicsCovered: string[];
  objectiveKuIds: string[];
  noteCs?: string;
  targetDate?: string;
  nowIso?: string;
}): Promise<ExperimentAssessment | null> {
  try {
    const nowIso = input.nowIso ?? new Date().toISOString();
    let book = await getOrCreateExperimentBook({
      learnerId: input.learnerId,
      targetDate: input.targetDate,
    });
    const assessment: ExperimentAssessment = {
      id: randomUUID(),
      kind: input.kind,
      createdAt: nowIso,
      completedAt: null,
      weekKey:
        input.kind === "weekly"
          ? weekKeyFromDateKey(nowIso.slice(0, 10))
          : null,
      packSlug: input.packSlug,
      questionIds: input.questionIds,
      transferQuestionIds: input.transferQuestionIds,
      topicsCovered: input.topicsCovered.slice(0, 40),
      objectiveKuIds: input.objectiveKuIds.slice(0, 80),
      attempts: [],
      accuracyPct: null,
      noteCs: input.noteCs,
    };

    if (input.kind === "weekly") {
      // One weekly per weekKey
      if (
        book.assessments.some(
          (a) => a.kind === "weekly" && a.weekKey === assessment.weekKey,
        )
      ) {
        return (
          book.assessments.find(
            (a) => a.kind === "weekly" && a.weekKey === assessment.weekKey,
          ) ?? null
        );
      }
      book = {
        ...book,
        assessments: [...book.assessments, assessment].slice(-40),
      };
    } else {
      if (book.final) return book.final;
      book = { ...book, final: assessment };
    }
    await saveExperimentBook(book);
    return assessment;
  } catch (error) {
    console.error("[beta-experiment] assessment create failed", error);
    return null;
  }
}

export function topicMasteryFromReadinessAreas(
  areas: Array<{ id: string; labelCs: string; pct: number }>,
): TopicMastery[] {
  return areas.slice(0, 40).map((a) => ({
    topicId: a.id,
    title: a.labelCs,
    masteryPct: Math.round(a.pct),
  }));
}
