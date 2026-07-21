import { z } from "zod";
import { examRelevanceSchema } from "@/domain/content/schemas";
import type { OpenAnswerEvaluation } from "@/domain/learning/open-answer-eval";
import {
  evaluateOpenAnswer,
  ideaPresentInAnswer,
  normalizeOpenText,
  openAnswerResultLabelsCs,
  openResultToAttemptResult,
} from "@/domain/learning/open-answer-eval";

/**
 * Unified Question Engine — one schema surface for all assessment item kinds.
 * After every attempt the student gets explanation + breakdown (never only green/red).
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const questionEngineKinds = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "short_answer",
  "long_answer",
  "fill_blank",
  "matching",
  "ordering",
  "timeline_ordering",
  "categorization",
  "author_work_pairing",
  "character_work_pairing",
  "identify_from_clues",
  "error_spotting",
] as const;

export type QuestionEngineKind = (typeof questionEngineKinds)[number];

export const attemptResults = ["correct", "partial", "incorrect"] as const;
export type AttemptResult = (typeof attemptResults)[number];

export const knowledgeUnitRefSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(160),
});

export type KnowledgeUnitRef = z.infer<typeof knowledgeUnitRefSchema>;

export const choiceOptionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(400),
});

const questionBase = {
  id: z.string().uuid(),
  slug: slugSchema,
  stem: z.string().min(1).max(1200),
  difficulty: z.number().int().min(1).max(5),
  knowledgeUnits: z.array(knowledgeUnitRefSchema).min(1).max(8),
  /** Always shown after submit — must be substantive. */
  explanation: z.string().min(40).max(1200),
  source: z.string().min(1).max(240),
  examRelevance: examRelevanceSchema,
};

export const singleChoiceQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal("single_choice"),
  options: z.array(choiceOptionSchema).min(2).max(6),
  correctAnswer: z.string().min(1).max(64),
  distractors: z.array(z.string().min(1).max(64)).min(1).max(5),
});

export const multipleChoiceQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal("multiple_choice"),
  options: z.array(choiceOptionSchema).min(3).max(8),
  correctAnswer: z.array(z.string().min(1).max(64)).min(2).max(6),
  distractors: z.array(z.string().min(1).max(64)).min(1).max(6),
});

export const trueFalseQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal("true_false"),
  correctAnswer: z.boolean(),
  distractors: z.array(z.boolean()).max(1).default([]),
});

export const shortAnswerQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal("short_answer"),
  correctAnswer: z.object({
    accepted: z.array(z.string().min(1).max(120)).min(1).max(12),
    keyTerms: z.array(z.string().min(1).max(80)).min(1).max(10),
  }),
  distractors: z.array(z.string().min(1).max(160)).max(8).default([]),
});

export const longAnswerQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal("long_answer"),
  correctAnswer: z.object({
    keyPoints: z.array(z.string().min(1).max(160)).min(2).max(8),
  }),
  distractors: z.array(z.string().min(1).max(200)).max(6).default([]),
});

export const fillBlankQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal("fill_blank"),
  /** Use ___ for each blank in order. */
  template: z.string().min(1).max(600),
  correctAnswer: z.array(z.string().min(1).max(80)).min(1).max(6),
  distractors: z.array(z.string().min(1).max(80)).max(12).default([]),
});

export const matchingQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal("matching"),
  left: z.array(choiceOptionSchema).min(2).max(6),
  right: z.array(choiceOptionSchema).min(2).max(8),
  correctAnswer: z.record(z.string(), z.string()),
  distractors: z.array(z.string().min(1).max(64)).max(4).default([]),
});

export const orderingQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal("ordering"),
  items: z.array(choiceOptionSchema).min(3).max(8),
  correctAnswer: z.array(z.string().min(1).max(64)).min(3).max(8),
  distractors: z.array(z.string().min(1).max(64)).max(2).default([]),
});

export const timelineOrderingQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal("timeline_ordering"),
  items: z
    .array(
      choiceOptionSchema.extend({
        yearHint: z.number().int().optional(),
      }),
    )
    .min(3)
    .max(8),
  correctAnswer: z.array(z.string().min(1).max(64)).min(3).max(8),
  distractors: z.array(z.string().min(1).max(64)).max(2).default([]),
});

export const categorizationQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal("categorization"),
  categories: z.array(choiceOptionSchema).min(2).max(5),
  items: z.array(choiceOptionSchema).min(3).max(10),
  correctAnswer: z.record(z.string(), z.string()),
  distractors: z.array(z.string().min(1).max(64)).max(3).default([]),
});

export const authorWorkPairingQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal("author_work_pairing"),
  authors: z.array(choiceOptionSchema).min(2).max(6),
  works: z.array(choiceOptionSchema).min(2).max(8),
  correctAnswer: z.record(z.string(), z.string()),
  distractors: z.array(z.string().min(1).max(64)).max(4).default([]),
});

export const characterWorkPairingQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal("character_work_pairing"),
  characters: z.array(choiceOptionSchema).min(2).max(6),
  works: z.array(choiceOptionSchema).min(2).max(8),
  correctAnswer: z.record(z.string(), z.string()),
  distractors: z.array(z.string().min(1).max(64)).max(4).default([]),
});

export const identifyFromCluesQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal("identify_from_clues"),
  clues: z.array(z.string().min(1).max(240)).min(2).max(6),
  options: z.array(choiceOptionSchema).min(3).max(6),
  correctAnswer: z.string().min(1).max(64),
  distractors: z.array(z.string().min(1).max(64)).min(1).max(5),
});

export const errorSpottingQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal("error_spotting"),
  passage: z.string().min(1).max(800),
  options: z.array(choiceOptionSchema).min(3).max(6),
  correctAnswer: z.string().min(1).max(64),
  distractors: z.array(z.string().min(1).max(64)).min(1).max(5),
});

export const engineQuestionSchema = z.discriminatedUnion("kind", [
  singleChoiceQuestionSchema,
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
  shortAnswerQuestionSchema,
  longAnswerQuestionSchema,
  fillBlankQuestionSchema,
  matchingQuestionSchema,
  orderingQuestionSchema,
  timelineOrderingQuestionSchema,
  categorizationQuestionSchema,
  authorWorkPairingQuestionSchema,
  characterWorkPairingQuestionSchema,
  identifyFromCluesQuestionSchema,
  errorSpottingQuestionSchema,
]);

export type EngineQuestion = z.infer<typeof engineQuestionSchema>;

export const questionPackSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  questions: z.array(engineQuestionSchema).min(8).max(80),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type QuestionPack = z.infer<typeof questionPackSchema>;

export const questionProgressSchema = z.object({
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  currentIndex: z.number().int().min(0),
  completedQuestionIds: z.array(z.string().uuid()),
  attemptCount: z.number().int().min(0),
  correctCount: z.number().int().min(0),
  partialCount: z.number().int().min(0),
  incorrectCount: z.number().int().min(0),
  scoreSum: z.number().min(0),
  updatedAt: z.string().datetime(),
});

export type QuestionProgress = z.infer<typeof questionProgressSchema>;

/** Student response — shape depends on question kind. */
export type StudentAnswer =
  | { kind: "single_choice"; optionId: string }
  | { kind: "multiple_choice"; optionIds: string[] }
  | { kind: "true_false"; value: boolean }
  | { kind: "short_answer"; text: string }
  | { kind: "long_answer"; text: string }
  | { kind: "fill_blank"; blanks: string[] }
  | { kind: "matching"; pairs: Record<string, string> }
  | { kind: "ordering"; order: string[] }
  | { kind: "timeline_ordering"; order: string[] }
  | { kind: "categorization"; assignments: Record<string, string> }
  | { kind: "author_work_pairing"; pairs: Record<string, string> }
  | { kind: "character_work_pairing"; pairs: Record<string, string> }
  | { kind: "identify_from_clues"; optionId: string }
  | { kind: "error_spotting"; optionId: string };

export type GradeFeedback = {
  result: AttemptResult;
  /** 0–1 continuous score (partial knowledge). */
  score: number;
  explanation: string;
  headline: string;
  details: string[];
  expectedSummary: string;
  knowledgeUnits: Array<{
    id: string;
    title: string;
    credited: boolean;
  }>;
  /** Present for short_answer / long_answer — robust open evaluation. */
  openEvaluation?: OpenAnswerEvaluation;
};

export function parseQuestionPack(raw: unknown): QuestionPack {
  const pack = questionPackSchema.parse(raw);
  const kinds = new Set(pack.questions.map((q) => q.kind));
  for (const q of pack.questions) {
    if (q.explanation.trim().length < 40) {
      throw new Error(`Question ${q.slug}: explanation too thin`);
    }
    validateQuestionConsistency(q);
  }
  if (kinds.size < 8) {
    throw new Error("Pack musí pokrývat aspoň 8 různých question kinds");
  }
  return pack;
}

function validateQuestionConsistency(q: EngineQuestion) {
  if (q.kind === "single_choice") {
    if (!q.options.some((o) => o.id === q.correctAnswer)) {
      throw new Error(`${q.slug}: correctAnswer not in options`);
    }
  }
  if (q.kind === "multiple_choice") {
    for (const id of q.correctAnswer) {
      if (!q.options.some((o) => o.id === id)) {
        throw new Error(`${q.slug}: correct id missing from options`);
      }
    }
  }
  if (q.kind === "ordering" || q.kind === "timeline_ordering") {
    if (q.correctAnswer.length !== q.items.length) {
      throw new Error(`${q.slug}: ordering length mismatch`);
    }
  }
  if (q.kind === "fill_blank") {
    const blanks = (q.template.match(/___/g) ?? []).length;
    if (blanks !== q.correctAnswer.length) {
      throw new Error(`${q.slug}: blank count ≠ correctAnswer length`);
    }
  }
}

export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resultFromScore(score: number): AttemptResult {
  if (score >= 0.85) return "correct";
  if (score > 0) return "partial";
  return "incorrect";
}

function kuCredits(
  q: EngineQuestion,
  credited: boolean,
): GradeFeedback["knowledgeUnits"] {
  return q.knowledgeUnits.map((ku) => ({
    id: ku.id,
    title: ku.title,
    credited,
  }));
}

function baseFeedback(
  q: EngineQuestion,
  score: number,
  headline: string,
  details: string[],
  expectedSummary: string,
  credited: boolean,
  openEvaluation?: OpenAnswerEvaluation,
): GradeFeedback {
  const result = openEvaluation
    ? openResultToAttemptResult(openEvaluation.result)
    : resultFromScore(score);
  return {
    result,
    score: Math.round(score * 100) / 100,
    explanation: q.explanation,
    headline,
    details,
    expectedSummary,
    knowledgeUnits: kuCredits(q, credited || score >= 0.5),
    openEvaluation,
  };
}

function pairScore(
  expected: Record<string, string>,
  given: Record<string, string>,
): { score: number; details: string[] } {
  const keys = Object.keys(expected);
  if (keys.length === 0) return { score: 0, details: ["Chybí očekávané páry."] };
  let hits = 0;
  const details: string[] = [];
  for (const k of keys) {
    if (given[k] === expected[k]) {
      hits += 1;
      details.push(`✓ Pár ${k} sedí.`);
    } else {
      details.push(`✗ Pár ${k} nesedí.`);
    }
  }
  return { score: hits / keys.length, details };
}

function orderScore(expected: string[], given: string[]): {
  score: number;
  details: string[];
} {
  if (expected.length === 0) return { score: 0, details: [] };
  let hits = 0;
  const details: string[] = [];
  for (let i = 0; i < expected.length; i += 1) {
    if (given[i] === expected[i]) {
      hits += 1;
      details.push(`✓ Pozice ${i + 1} správně.`);
    } else {
      details.push(`✗ Pozice ${i + 1} jinak.`);
    }
  }
  return { score: hits / expected.length, details };
}

export function gradeQuestion(
  question: EngineQuestion,
  answer: StudentAnswer,
): GradeFeedback {
  if (answer.kind !== question.kind) {
    return baseFeedback(
      question,
      0,
      "Neplatný typ odpovědi",
      ["Odpověď neodpovídá typu otázky."],
      "Zkus znovu v správném formátu.",
      false,
    );
  }

  switch (question.kind) {
    case "single_choice": {
      const ok = answer.kind === "single_choice" && answer.optionId === question.correctAnswer;
      const chosen = question.options.find(
        (o) => answer.kind === "single_choice" && o.id === answer.optionId,
      );
      const correct = question.options.find((o) => o.id === question.correctAnswer);
      return baseFeedback(
        question,
        ok ? 1 : 0,
        ok ? "Správná volba" : "Jiná volba",
        [
          ok
            ? `Vybral/a jsi: ${chosen?.label ?? "—"}`
            : `Vybral/a jsi: ${chosen?.label ?? "—"}. Správně: ${correct?.label ?? "—"}.`,
        ],
        correct?.label ?? "",
        ok,
      );
    }
    case "multiple_choice": {
      if (answer.kind !== "multiple_choice") break;
      const expected = new Set(question.correctAnswer);
      const given = new Set(answer.optionIds);
      let tp = 0;
      let fp = 0;
      for (const id of given) {
        if (expected.has(id)) tp += 1;
        else fp += 1;
      }
      const fn = [...expected].filter((id) => !given.has(id)).length;
      const denom = expected.size + fp;
      const score = denom === 0 ? 0 : tp / (expected.size + fp);
      const details = [
        `Zásahy: ${tp}/${expected.size}`,
        fp > 0 ? `Navíc (distractors): ${fp}` : "Bez navíc voleb",
        fn > 0 ? `Chybělo: ${fn}` : "Nic nechybělo",
      ];
      return baseFeedback(
        question,
        Math.max(0, Math.min(1, score)),
        score >= 0.85 ? "Kompletní výběr" : score > 0 ? "Částečný výběr" : "Bez zásahu",
        details,
        question.options
          .filter((o) => expected.has(o.id))
          .map((o) => o.label)
          .join("; "),
        tp > 0,
      );
    }
    case "true_false": {
      if (answer.kind !== "true_false") break;
      const ok = answer.value === question.correctAnswer;
      return baseFeedback(
        question,
        ok ? 1 : 0,
        ok ? "Správně" : "Opak je pravda",
        [
          `Tvoje volba: ${answer.value ? "pravda" : "nepravda"}.`,
          `Správně: ${question.correctAnswer ? "pravda" : "nepravda"}.`,
        ],
        question.correctAnswer ? "Pravda" : "Nepravda",
        ok,
      );
    }
    case "short_answer": {
      if (answer.kind !== "short_answer") break;
      const keyIdeas = [
        ...question.correctAnswer.keyTerms.map((t, i) => ({
          id: `term-${i}`,
          label: t,
          synonyms: [] as string[],
          required: true,
        })),
        ...question.correctAnswer.accepted.map((a, i) => ({
          id: `acc-${i}`,
          label: a,
          synonyms: [] as string[],
          // Accepted full phrases are alternate paths — not all required
          required: question.correctAnswer.keyTerms.length === 0,
        })),
      ];
      // Deduplicate by normalized label
      const seen = new Set<string>();
      const uniqueIdeas = keyIdeas.filter((k) => {
        const n = normalizeOpenText(k.label);
        if (!n || seen.has(n)) return false;
        seen.add(n);
        return true;
      });
      const ideal =
        question.correctAnswer.accepted[0] ??
        question.correctAnswer.keyTerms.join(", ");
      const openEvaluation = evaluateOpenAnswer({
        studentAnswer: answer.text,
        keyIdeas: uniqueIdeas.length
          ? uniqueIdeas
          : [{ id: "ideal", label: ideal, synonyms: [], required: true }],
        idealAnswer: ideal,
        sourceEvidence: {
          quote: question.explanation.slice(0, 2000),
          sourceLabel: question.source,
        },
        knownIncorrect: question.distractors,
      });
      // Soft full-credit: any accepted phrase matched → boost coverage path
      const acceptedSoft = question.correctAnswer.accepted.some((a) =>
        ideaPresentInAnswer(normalizeOpenText(answer.text), a).matched,
      );
      let score = openEvaluation.coverage;
      if (acceptedSoft) score = Math.max(score, 0.9);
      if (openEvaluation.whatWasWrong.length && score >= 0.85) {
        score = Math.min(score, 0.7);
      }
      const details = [
        `${openAnswerResultLabelsCs[openEvaluation.result]} (${openEvaluation.resultLabel})`,
        ...openEvaluation.whatWasCorrect.map((c) => `✓ Správně: ${c}`),
        ...openEvaluation.whatWasMissing.map((m) => `○ Chybí: ${m}`),
        ...openEvaluation.whatWasWrong.map((w) => `✗ ${w}`),
      ];
      return baseFeedback(
        question,
        score,
        openAnswerResultLabelsCs[openEvaluation.result],
        details,
        openEvaluation.idealAnswer,
        score > 0,
        openEvaluation,
      );
    }
    case "long_answer": {
      if (answer.kind !== "long_answer") break;
      const openEvaluation = evaluateOpenAnswer({
        studentAnswer: answer.text,
        keyIdeas: question.correctAnswer.keyPoints.map((kp, i) => ({
          id: `kp-${i}`,
          label: kp,
          synonyms: [],
          required: true,
        })),
        idealAnswer: question.correctAnswer.keyPoints.join(" · "),
        sourceEvidence: {
          quote: question.explanation.slice(0, 2000),
          sourceLabel: question.source,
        },
        knownIncorrect: question.distractors,
      });
      let score = openEvaluation.coverage;
      if (openEvaluation.whatWasWrong.length && score >= 0.85) {
        score = Math.min(score, 0.7);
      }
      const details = [
        `${openAnswerResultLabelsCs[openEvaluation.result]} (${openEvaluation.resultLabel})`,
        ...openEvaluation.whatWasCorrect.map((c) => `✓ Správně: ${c}`),
        ...openEvaluation.whatWasMissing.map((m) => `○ Chybí: ${m}`),
        ...openEvaluation.whatWasWrong.map((w) => `✗ ${w}`),
      ];
      return baseFeedback(
        question,
        score,
        openAnswerResultLabelsCs[openEvaluation.result],
        details,
        openEvaluation.idealAnswer,
        score > 0,
        openEvaluation,
      );
    }
    case "fill_blank": {
      if (answer.kind !== "fill_blank") break;
      const expected = question.correctAnswer;
      const given = answer.blanks;
      let hits = 0;
      const details: string[] = [];
      for (let i = 0; i < expected.length; i += 1) {
        const ok =
          normalizeText(given[i] ?? "") === normalizeText(expected[i] ?? "");
        if (ok) hits += 1;
        details.push(
          ok
            ? `✓ Blank ${i + 1}: ${expected[i]}`
            : `✗ Blank ${i + 1}: napsáno „${given[i] ?? ""}“, správně „${expected[i]}“`,
        );
      }
      const score = expected.length === 0 ? 0 : hits / expected.length;
      return baseFeedback(
        question,
        score,
        score >= 0.85 ? "Doplněno správně" : score > 0 ? "Částečně" : "Chybně",
        details,
        expected.join(" / "),
        score > 0,
      );
    }
    case "matching":
    case "author_work_pairing":
    case "character_work_pairing": {
      const pairs =
        answer.kind === "matching" ||
        answer.kind === "author_work_pairing" ||
        answer.kind === "character_work_pairing"
          ? answer.pairs
          : {};
      const { score, details } = pairScore(question.correctAnswer, pairs);
      return baseFeedback(
        question,
        score,
        score >= 0.85 ? "Párování sedí" : score > 0 ? "Částečné párování" : "Páry nesedí",
        details,
        Object.entries(question.correctAnswer)
          .map(([a, b]) => `${a}→${b}`)
          .join(", "),
        score > 0,
      );
    }
    case "ordering":
    case "timeline_ordering": {
      const order =
        answer.kind === "ordering" || answer.kind === "timeline_ordering"
          ? answer.order
          : [];
      const { score, details } = orderScore(question.correctAnswer, order);
      return baseFeedback(
        question,
        score,
        score >= 0.85 ? "Pořadí sedí" : score > 0 ? "Částečné pořadí" : "Pořadí nesedí",
        details,
        question.correctAnswer.join(" → "),
        score > 0,
      );
    }
    case "categorization": {
      if (answer.kind !== "categorization") break;
      const { score, details } = pairScore(
        question.correctAnswer,
        answer.assignments,
      );
      return baseFeedback(
        question,
        score,
        score >= 0.85
          ? "Kategorie sedí"
          : score > 0
            ? "Částečná kategorizace"
            : "Kategorie nesedí",
        details,
        Object.entries(question.correctAnswer)
          .map(([item, cat]) => `${item}∈${cat}`)
          .join(", "),
        score > 0,
      );
    }
    case "identify_from_clues":
    case "error_spotting": {
      if (
        answer.kind !== "identify_from_clues" &&
        answer.kind !== "error_spotting"
      ) {
        break;
      }
      const ok = answer.optionId === question.correctAnswer;
      const correct = question.options.find((o) => o.id === question.correctAnswer);
      const chosen = question.options.find((o) => o.id === answer.optionId);
      return baseFeedback(
        question,
        ok ? 1 : 0,
        ok ? "Identifikováno správně" : "Vedle",
        [
          `Volba: ${chosen?.label ?? "—"}`,
          `Správně: ${correct?.label ?? "—"}`,
        ],
        correct?.label ?? "",
        ok,
      );
    }
  }

  return baseFeedback(
    question,
    0,
    "Nehodnoceno",
    ["Nepodařilo se vyhodnotit odpověď."],
    "",
    false,
  );
}

export function emptyQuestionProgress(
  learnerId: string,
  pack: QuestionPack,
  nowIso: string,
): QuestionProgress {
  return {
    learnerId,
    packId: pack.id,
    packSlug: pack.slug,
    currentIndex: 0,
    completedQuestionIds: [],
    attemptCount: 0,
    correctCount: 0,
    partialCount: 0,
    incorrectCount: 0,
    scoreSum: 0,
    updatedAt: nowIso,
  };
}

export function applyGradeToProgress(
  progress: QuestionProgress,
  questionId: string,
  grade: GradeFeedback,
  nowIso: string,
): QuestionProgress {
  const completed = progress.completedQuestionIds.includes(questionId)
    ? progress.completedQuestionIds
    : [...progress.completedQuestionIds, questionId];
  return {
    ...progress,
    currentIndex: completed.length,
    completedQuestionIds: completed,
    attemptCount: progress.attemptCount + 1,
    correctCount: progress.correctCount + (grade.result === "correct" ? 1 : 0),
    partialCount: progress.partialCount + (grade.result === "partial" ? 1 : 0),
    incorrectCount:
      progress.incorrectCount + (grade.result === "incorrect" ? 1 : 0),
    scoreSum: progress.scoreSum + grade.score,
    updatedAt: nowIso,
  };
}

export function averageScore(progress: QuestionProgress): number | null {
  if (progress.attemptCount === 0) return null;
  return Math.round((progress.scoreSum / progress.attemptCount) * 100);
}

export const questionKindLabelsCs: Record<QuestionEngineKind, string> = {
  single_choice: "Jedna správná",
  multiple_choice: "Více správných",
  true_false: "Pravda / nepravda",
  short_answer: "Krátká odpověď",
  long_answer: "Delší odpověď",
  fill_blank: "Doplňovačka",
  matching: "Párování",
  ordering: "Řazení",
  timeline_ordering: "Časová osa",
  categorization: "Kategorizace",
  author_work_pairing: "Autor ↔ dílo",
  character_work_pairing: "Postava ↔ dílo",
  identify_from_clues: "Identifikace z indicií",
  error_spotting: "Najdi chybu",
};
