/**
 * Reusable testing engine over validated study content only.
 * Never emits a student-facing question without a validated answer/rubric.
 *
 * Modes: Rychlých 5 / 10 / 20 / Jen moje chyby / Jedno téma /
 * Mix témat / Nejslabší oblasti / Zkouška z mých materiálů.
 */

import { z } from "zod";
import {
  evaluateOpenAnswer,
  normalizeOpenText,
  type OpenAnswerKeyIdea,
} from "@/domain/learning/open-answer-eval";
import { extractKeyPhrasesFromSource } from "@/domain/learning/grounded-study";
import type { ReviewGrade } from "@/domain/learning/scheduler";

export const testingModes = [
  "quick_5",
  "ten",
  "twenty",
  "mistakes_only",
  "single_topic",
  "topic_mix",
  "weakest",
  "materials_exam",
] as const;

export type TestingMode = (typeof testingModes)[number];

export const testingModeLabelsCs: Record<TestingMode, string> = {
  quick_5: "Rychlých 5 otázek",
  ten: "10 otázek",
  twenty: "20 otázek",
  mistakes_only: "Jen moje chyby",
  single_topic: "Jedno téma",
  topic_mix: "Mix témat",
  weakest: "Nejslabší oblasti",
  materials_exam: "Zkouška z mých materiálů",
};

export const testingModeDescriptionsCs: Record<TestingMode, string> = {
  quick_5: "Krátký průřez ověřenými jednotkami.",
  ten: "Střední procvičení z katalogu a materiálů.",
  twenty: "Delší set — víc témat, víc evidence.",
  mistakes_only: "Jen jednotky, kde jsi už chyboval/a.",
  single_topic: "Souvislé otázky z jednoho tématu.",
  topic_mix: "Vyvážený výběr napříč tématy.",
  weakest: "Priorita podle slabé zvládnutosti a chyb.",
  materials_exam: "Jen z ověřených jednotek tvých nahraných materiálů.",
};

export const testingQuestionTypes = [
  "true_false",
  "short_answer",
  "multiple_choice",
  "cloze",
  "explain_own_words",
] as const;

export type TestingQuestionType = (typeof testingQuestionTypes)[number];

export const testingQuestionTypeLabelsCs: Record<TestingQuestionType, string> =
  {
    true_false: "Pravda / nepravda",
    short_answer: "Krátká odpověď",
    multiple_choice: "Výběr z možností",
    cloze: "Doplňovačka",
    explain_own_words: "Vysvětli vlastními slovy",
  };

/** Atom eligible for testing — must carry validated answer material. */
export type TestingAtom = {
  knowledgeUnitId: string;
  sourceId: string;
  sourceTitle: string;
  topic: string;
  title: string;
  statement: string;
  sourceExcerpt: string;
  headingPath: string | null;
  charStart: number | null;
  charEnd: number | null;
  /** Origin of the unit (catalog vs learner upload). */
  origin: "catalog" | "learner_material";
  /** Optional mastery 0–100 when known. */
  masteryScore: number | null;
  /** Mistake occurrence weight (0 = none). */
  mistakeWeight: number;
  difficultyHint: number;
};

export type ValidatedAnswer = {
  /** Canonical text / claim used for feedback. */
  canonical: string;
  keyIdeas: OpenAnswerKeyIdea[];
  /** For choice items. */
  correctChoiceId: string | null;
  /** For true/false. */
  correctIsTrue: boolean | null;
  /** For cloze. */
  clozeAnswers: string[];
};

export type TestingChoice = {
  id: string;
  label: string;
};

export type TestingProvenance = {
  sourceId: string;
  sourceTitle: string;
  excerpt: string;
  headingPath: string | null;
  charStart: number | null;
  charEnd: number | null;
};

export type ValidatedTestQuestion = {
  questionId: string;
  knowledgeUnitId: string;
  sourceId: string;
  topic: string;
  difficulty: number;
  questionType: TestingQuestionType;
  stem: string;
  choices: TestingChoice[];
  clozeTemplate: string | null;
  validatedAnswer: ValidatedAnswer;
  explanation: string;
  provenance: TestingProvenance;
};

export type TestingSession = {
  id: string;
  learnerId: string;
  mode: TestingMode;
  topicFilter: string | null;
  title: string;
  questions: ValidatedTestQuestion[];
  createdAt: string;
};

export type TestingGradeResult = {
  result: "correct" | "partial" | "incorrect";
  resultLabelCs: string;
  coverage: number;
  whatWasCorrect: string[];
  whatWasMissing: string[];
  whatWasWrong: string[];
  correctiveFeedback: string;
  explanation: string;
  provenance: TestingProvenance;
  reviewGrade: ReviewGrade;
  /** One success never permanently retires the item. */
  remainsInRotation: true;
};

export type TestingAttemptRecord = {
  questionId: string;
  knowledgeUnitId: string;
  topic: string;
  result: "correct" | "partial" | "incorrect";
  studentAnswer: string;
  coverage: number;
};

export type TestingSessionSummary = {
  whatYouKnow: string[];
  whatToReview: string[];
  biggestMistakeToday: string | null;
  nextRecommendedStep: {
    label: string;
    mode: TestingMode | null;
    href: string;
  };
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  total: number;
};

const RESULT_CS = {
  correct: "Správně",
  partial: "Částečně správně",
  incorrect: "Nesprávně",
} as const;

export const DONT_KNOW_TOKEN = "__NEVIM__";

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(16).slice(2, 12)}`;
}

/**
 * Gate: student-facing question only if statement + source excerpt support a
 * validated answer (statement grounded in excerpt).
 */
export function isAtomValidForTesting(atom: TestingAtom): boolean {
  const statement = atom.statement.trim();
  const excerpt = atom.sourceExcerpt.trim();
  if (statement.length < 12) return false;
  if (excerpt.length < 40) return false;
  const sn = normalizeOpenText(statement);
  const en = normalizeOpenText(excerpt);
  // Grounding: at least one substantial token from statement appears in source.
  const tokens = sn.split(/\s+/).filter((t) => t.length >= 5).slice(0, 8);
  if (tokens.length === 0) return en.includes(sn.slice(0, 24));
  const hits = tokens.filter((t) => en.includes(t)).length;
  return hits >= Math.min(2, tokens.length);
}

export function keyIdeasFromStatement(statement: string): OpenAnswerKeyIdea[] {
  const phrases = extractKeyPhrasesFromSource(statement);
  const ideas: OpenAnswerKeyIdea[] = [];
  const seen = new Set<string>();
  for (const label of phrases) {
    const key = normalizeOpenText(label);
    if (!key || key.length < 3 || seen.has(key)) continue;
    seen.add(key);
    ideas.push({
      id: `idea-${ideas.length}`,
      label: label.slice(0, 200),
      synonyms: [],
      required: ideas.length < 3,
    });
    if (ideas.length >= 8) break;
  }
  if (ideas.length === 0) {
    ideas.push({
      id: "idea-0",
      label: statement.slice(0, 120),
      synonyms: [],
      required: true,
    });
  }
  return ideas;
}

function buildExplanation(atom: TestingAtom): string {
  const stmt = atom.statement.trim();
  const excerpt = atom.sourceExcerpt.trim().slice(0, 280);
  return `${stmt}\n\nZe zdroje (${atom.sourceTitle}): ${excerpt}${atom.sourceExcerpt.length > 280 ? "…" : ""}`;
}

function provenanceFrom(atom: TestingAtom): TestingProvenance {
  return {
    sourceId: atom.sourceId,
    sourceTitle: atom.sourceTitle,
    excerpt: atom.sourceExcerpt.slice(0, 900),
    headingPath: atom.headingPath,
    charStart: atom.charStart,
    charEnd: atom.charEnd,
  };
}

function pickType(atom: TestingAtom, index: number): TestingQuestionType {
  const cycle: TestingQuestionType[] = [
    "short_answer",
    "true_false",
    "cloze",
    "explain_own_words",
    "multiple_choice",
  ];
  const seed =
    [...atom.knowledgeUnitId].reduce((a, c) => a + c.charCodeAt(0), 0) + index;
  return cycle[Math.abs(seed) % cycle.length]!;
}

function buildCloze(statement: string): { template: string; answers: string[] } {
  const phrases = extractKeyPhrasesFromSource(statement);
  const target =
    phrases.find((p) => p.length >= 4 && statement.includes(p)) ??
    statement.split(/\s+/).find((w) => w.length >= 6) ??
    statement.slice(0, 12);
  return {
    template: statement.replace(target, "____"),
    answers: [target.replace(/[.,;:!?]$/, "")],
  };
}

/**
 * Build one validated question. Returns null if validation fails.
 */
export function buildValidatedQuestion(
  atom: TestingAtom,
  pool: TestingAtom[],
  index = 0,
  preferredType?: TestingQuestionType,
): ValidatedTestQuestion | null {
  if (!isAtomValidForTesting(atom)) return null;

  const questionType = preferredType ?? pickType(atom, index);
  const keyIdeas = keyIdeasFromStatement(atom.statement);
  const explanation = buildExplanation(atom);
  const provenance = provenanceFrom(atom);
  const difficulty = Math.min(
    5,
    Math.max(1, Math.round(atom.difficultyHint || 3)),
  );
  const baseAnswer: ValidatedAnswer = {
    canonical: atom.statement,
    keyIdeas,
    correctChoiceId: null,
    correctIsTrue: null,
    clozeAnswers: [],
  };

  const questionId = newId(`tq-${atom.knowledgeUnitId.slice(0, 8)}`);

  switch (questionType) {
    case "true_false": {
      const peers = pool.filter(
        (p) =>
          p.knowledgeUnitId !== atom.knowledgeUnitId &&
          isAtomValidForTesting(p),
      );
      const makeFalse = peers.length > 0 && index % 2 === 1;
      const claim = makeFalse ? peers[0]!.statement : atom.statement;
      return {
        questionId,
        knowledgeUnitId: atom.knowledgeUnitId,
        sourceId: atom.sourceId,
        topic: atom.topic,
        difficulty,
        questionType: "true_false",
        stem: `Je toto tvrzení pravdivé vzhledem k tématu „${atom.title}“?\n\n„${claim}“`,
        choices: [
          { id: "true", label: "Pravda" },
          { id: "false", label: "Nepravda" },
        ],
        clozeTemplate: null,
        validatedAnswer: {
          ...baseAnswer,
          correctIsTrue: !makeFalse,
          correctChoiceId: makeFalse ? "false" : "true",
          canonical: atom.statement,
        },
        explanation: makeFalse
          ? `Správně je nepravda. Správné tvrzení k tématu: ${atom.statement}`
          : explanation,
        provenance,
      };
    }
    case "multiple_choice": {
      const distractors = pool
        .filter(
          (p) =>
            p.knowledgeUnitId !== atom.knowledgeUnitId &&
            isAtomValidForTesting(p),
        )
        .slice(0, 3);
      if (distractors.length < 1) {
        // Fall back to short answer — never invent distractors.
        return buildValidatedQuestion(atom, pool, index, "short_answer");
      }
      const choices: TestingChoice[] = [
        { id: "c0", label: atom.statement.slice(0, 220) },
        ...distractors.map((d, i) => ({
          id: `c${i + 1}`,
          label: d.statement.slice(0, 220),
        })),
      ];
      const seed = atom.knowledgeUnitId.length;
      choices.sort(
        (a, b) =>
          ((a.id.charCodeAt(0) + seed) % 7) -
          ((b.id.charCodeAt(0) + seed) % 7),
      );
      return {
        questionId,
        knowledgeUnitId: atom.knowledgeUnitId,
        sourceId: atom.sourceId,
        topic: atom.topic,
        difficulty,
        questionType: "multiple_choice",
        stem: `Které tvrzení patří k: ${atom.title}?`,
        choices,
        clozeTemplate: null,
        validatedAnswer: {
          ...baseAnswer,
          correctChoiceId: "c0",
        },
        explanation,
        provenance,
      };
    }
    case "cloze": {
      const { template, answers } = buildCloze(atom.statement);
      if (!answers[0] || answers[0].length < 2) {
        return buildValidatedQuestion(atom, pool, index, "short_answer");
      }
      return {
        questionId,
        knowledgeUnitId: atom.knowledgeUnitId,
        sourceId: atom.sourceId,
        topic: atom.topic,
        difficulty,
        questionType: "cloze",
        stem: "Doplň chybějící část ze zdroje.",
        choices: [],
        clozeTemplate: template,
        validatedAnswer: {
          ...baseAnswer,
          clozeAnswers: answers,
          canonical: answers[0]!,
        },
        explanation,
        provenance,
      };
    }
    case "explain_own_words":
      return {
        questionId,
        knowledgeUnitId: atom.knowledgeUnitId,
        sourceId: atom.sourceId,
        topic: atom.topic,
        difficulty,
        questionType: "explain_own_words",
        stem: `Vysvětli vlastními slovy: ${atom.title}`,
        choices: [],
        clozeTemplate: null,
        validatedAnswer: baseAnswer,
        explanation,
        provenance,
      };
    case "short_answer":
    default:
      return {
        questionId,
        knowledgeUnitId: atom.knowledgeUnitId,
        sourceId: atom.sourceId,
        topic: atom.topic,
        difficulty,
        questionType: "short_answer",
        stem: `Stručná odpověď: ${atom.title}?`,
        choices: [],
        clozeTemplate: null,
        validatedAnswer: baseAnswer,
        explanation,
        provenance,
      };
  }
}

export function modeTargetCount(mode: TestingMode): number {
  switch (mode) {
    case "quick_5":
      return 5;
    case "ten":
      return 10;
    case "twenty":
      return 20;
    case "mistakes_only":
      return 10;
    case "single_topic":
      return 10;
    case "topic_mix":
      return 12;
    case "weakest":
      return 10;
    case "materials_exam":
      return 15;
  }
}

/**
 * Select atoms for a mode. Correct answers never permanently remove atoms —
 * selection only prioritizes; all valid atoms stay eligible.
 */
export function selectAtomsForMode(input: {
  mode: TestingMode;
  pool: TestingAtom[];
  topicFilter?: string | null;
}): TestingAtom[] {
  const valid = input.pool.filter(isAtomValidForTesting);
  if (valid.length === 0) return [];

  const target = modeTargetCount(input.mode);
  let candidates = [...valid];

  switch (input.mode) {
    case "mistakes_only":
      candidates = valid
        .filter((a) => a.mistakeWeight > 0)
        .sort((a, b) => b.mistakeWeight - a.mistakeWeight);
      break;
    case "single_topic": {
      const topic = input.topicFilter?.trim();
      if (topic) {
        candidates = valid.filter(
          (a) =>
            a.topic === topic ||
            normalizeOpenText(a.topic).includes(normalizeOpenText(topic)),
        );
      } else {
        // Pick the largest topic cluster.
        const counts = new Map<string, number>();
        for (const a of valid) {
          counts.set(a.topic, (counts.get(a.topic) ?? 0) + 1);
        }
        let best = valid[0]!.topic;
        let bestN = 0;
        for (const [t, n] of counts) {
          if (n > bestN) {
            best = t;
            bestN = n;
          }
        }
        candidates = valid.filter((a) => a.topic === best);
      }
      break;
    }
    case "topic_mix": {
      const byTopic = new Map<string, TestingAtom[]>();
      for (const a of valid) {
        const list = byTopic.get(a.topic) ?? [];
        list.push(a);
        byTopic.set(a.topic, list);
      }
      const mixed: TestingAtom[] = [];
      const topics = [...byTopic.keys()];
      let i = 0;
      while (mixed.length < target && topics.length > 0) {
        const topic = topics[i % topics.length]!;
        const list = byTopic.get(topic);
        if (list && list.length > 0) {
          mixed.push(list.shift()!);
        } else {
          topics.splice(i % Math.max(topics.length, 1), 1);
          continue;
        }
        i += 1;
        if (i > target * topics.length + 10) break;
      }
      candidates = mixed;
      break;
    }
    case "weakest":
      candidates = [...valid].sort((a, b) => {
        const ma = a.masteryScore ?? 40;
        const mb = b.masteryScore ?? 40;
        if (ma !== mb) return ma - mb;
        return b.mistakeWeight - a.mistakeWeight;
      });
      break;
    case "materials_exam":
      candidates = valid.filter((a) => a.origin === "learner_material");
      break;
    default:
      // Shuffle lightly by id hash for variety; do not drop previously correct.
      candidates = [...valid].sort(
        (a, b) =>
          (a.knowledgeUnitId.charCodeAt(0) % 5) -
          (b.knowledgeUnitId.charCodeAt(0) % 5),
      );
  }

  return candidates.slice(0, target);
}

export function buildTestingSession(input: {
  learnerId: string;
  mode: TestingMode;
  pool: TestingAtom[];
  topicFilter?: string | null;
}): TestingSession | null {
  const atoms = selectAtomsForMode({
    mode: input.mode,
    pool: input.pool,
    topicFilter: input.topicFilter,
  });
  if (atoms.length === 0) return null;

  const questions: ValidatedTestQuestion[] = [];
  for (let i = 0; i < atoms.length; i++) {
    const q = buildValidatedQuestion(atoms[i]!, atoms, i);
    if (q) questions.push(q);
  }
  if (questions.length === 0) return null;

  return {
    id: newId("tsess"),
    learnerId: input.learnerId,
    mode: input.mode,
    topicFilter: input.topicFilter ?? null,
    title: testingModeLabelsCs[input.mode],
    questions,
    createdAt: new Date().toISOString(),
  };
}

/** Grade — deterministic, no LLM. */
export function gradeTestingAnswer(input: {
  question: ValidatedTestQuestion;
  rawAnswer: string;
}): TestingGradeResult {
  const raw = input.rawAnswer.trim();
  const q = input.question;
  const dontKnow =
    raw === DONT_KNOW_TOKEN ||
    normalizeOpenText(raw) === "nevim" ||
    normalizeOpenText(raw) === "nevím";

  const base = {
    explanation: q.explanation,
    provenance: q.provenance,
    remainsInRotation: true as const,
  };

  if (dontKnow) {
    return {
      result: "incorrect",
      resultLabelCs: RESULT_CS.incorrect,
      coverage: 0,
      whatWasCorrect: [],
      whatWasMissing: q.validatedAnswer.keyIdeas.map((k) => k.label),
      whatWasWrong: [],
      correctiveFeedback:
        "Nejdřív si zkus vybavit odpověď. Tady je správné znění ze zdroje.",
      reviewGrade: "dont_know",
      ...base,
    };
  }

  if (
    q.questionType === "true_false" ||
    q.questionType === "multiple_choice"
  ) {
    const ok = raw === q.validatedAnswer.correctChoiceId;
    return {
      result: ok ? "correct" : "incorrect",
      resultLabelCs: ok ? RESULT_CS.correct : RESULT_CS.incorrect,
      coverage: ok ? 1 : 0,
      whatWasCorrect: ok
        ? [q.choices.find((c) => c.id === raw)?.label ?? ""]
        : [],
      whatWasMissing: ok
        ? []
        : [
            q.choices.find(
              (c) => c.id === q.validatedAnswer.correctChoiceId,
            )?.label ?? q.validatedAnswer.canonical,
          ],
      whatWasWrong: ok
        ? []
        : [q.choices.find((c) => c.id === raw)?.label ?? raw],
      correctiveFeedback: ok
        ? "Sedí se zdrojem."
        : `Správná volba: ${
            q.choices.find((c) => c.id === q.validatedAnswer.correctChoiceId)
              ?.label ?? q.validatedAnswer.canonical
          }`,
      reviewGrade: ok ? "know" : "dont_know",
      ...base,
    };
  }

  if (q.questionType === "cloze") {
    const norm = normalizeOpenText(raw);
    const hit = q.validatedAnswer.clozeAnswers.some(
      (a) =>
        normalizeOpenText(a) === norm ||
        norm.includes(normalizeOpenText(a)) ||
        normalizeOpenText(a).includes(norm),
    );
    return {
      result: hit ? "correct" : "incorrect",
      resultLabelCs: hit ? RESULT_CS.correct : RESULT_CS.incorrect,
      coverage: hit ? 1 : 0,
      whatWasCorrect: hit ? q.validatedAnswer.clozeAnswers : [],
      whatWasMissing: hit ? [] : q.validatedAnswer.clozeAnswers,
      whatWasWrong: hit ? [] : [raw],
      correctiveFeedback: hit
        ? "Doplnění sedí."
        : `Očekávané doplnění: ${q.validatedAnswer.clozeAnswers.join(", ")}`,
      reviewGrade: hit ? "know" : "dont_know",
      ...base,
    };
  }

  const evaluation = evaluateOpenAnswer({
    studentAnswer: raw,
    keyIdeas: q.validatedAnswer.keyIdeas,
    idealAnswer: q.validatedAnswer.canonical,
    sourceEvidence: {
      quote: q.provenance.excerpt,
      sourceLabel: q.provenance.sourceTitle,
    },
  });
  const result =
    evaluation.masteryCorrectness === "correct"
      ? "correct"
      : evaluation.masteryCorrectness === "partial"
        ? "partial"
        : "incorrect";

  return {
    result,
    resultLabelCs: RESULT_CS[result],
    coverage: evaluation.coverage,
    whatWasCorrect: evaluation.whatWasCorrect,
    whatWasMissing: evaluation.whatWasMissing,
    whatWasWrong: evaluation.whatWasWrong,
    correctiveFeedback:
      result === "correct"
        ? "Odpověď pokrývá klíčové body ze zdroje."
        : result === "partial"
          ? `Částečně — doplň: ${evaluation.whatWasMissing.slice(0, 3).join("; ") || "zbývající body ze zdroje"}.`
          : `Ze zdroje: ${q.validatedAnswer.canonical.slice(0, 220)}`,
    reviewGrade:
      result === "correct"
        ? "know"
        : result === "partial"
          ? "almost"
          : "dont_know",
    ...base,
  };
}

export function buildTestingSessionSummary(input: {
  attempts: TestingAttemptRecord[];
  mode: TestingMode;
}): TestingSessionSummary {
  const attempts = input.attempts;
  const correct = attempts.filter((a) => a.result === "correct");
  const partial = attempts.filter((a) => a.result === "partial");
  const incorrect = attempts.filter((a) => a.result === "incorrect");

  const whatYouKnow = [
    ...new Set(
      [...correct, ...partial]
        .map((a) => a.topic)
        .filter(Boolean),
    ),
  ].slice(0, 6);

  const whatToReview = [
    ...new Set(
      [...incorrect, ...partial]
        .map((a) => a.topic)
        .filter(Boolean),
    ),
  ].slice(0, 6);

  const biggest =
    incorrect.sort((a, b) => a.coverage - b.coverage)[0] ?? null;

  let nextMode: TestingMode | null = "mistakes_only";
  let nextLabel = "Procvič jen moje chyby";
  let href = "/app/tests?mode=mistakes_only";

  if (incorrect.length === 0 && partial.length === 0) {
    nextMode = "topic_mix";
    nextLabel = "Zkus mix témat";
    href = "/app/tests?mode=topic_mix";
  } else if (incorrect.length >= 3) {
    nextMode = "weakest";
    nextLabel = "Zaměř se na nejslabší oblasti";
    href = "/app/tests?mode=weakest";
  } else if (whatToReview[0]) {
    nextMode = "single_topic";
    nextLabel = `Zopakuj téma: ${whatToReview[0]}`;
    href = `/app/tests?mode=single_topic&topic=${encodeURIComponent(whatToReview[0])}`;
  }

  if (attempts.length === 0) {
    nextMode = input.mode;
    nextLabel = "Spusť znovu stejný režim";
    href = `/app/tests?mode=${input.mode}`;
  }

  return {
    whatYouKnow:
      whatYouKnow.length > 0
        ? whatYouKnow
        : ["Zatím bez jistých témat v tomto setu."],
    whatToReview:
      whatToReview.length > 0
        ? whatToReview
        : ["Nic akutního — udržuj pravidelné opakování."],
    biggestMistakeToday: biggest
      ? `${biggest.topic}: odpověď nebyla podložená zdrojem.`
      : null,
    nextRecommendedStep: {
      label: nextLabel,
      mode: nextMode,
      href,
    },
    correctCount: correct.length,
    partialCount: partial.length,
    incorrectCount: incorrect.length,
    total: attempts.length,
  };
}

/** Client-safe question (hides correct choice ids / cloze answers until graded). */
export function toClientTestingQuestion(
  q: ValidatedTestQuestion,
): Omit<ValidatedTestQuestion, "validatedAnswer"> & {
  validatedAnswer: null;
  hasValidatedAnswer: true;
} {
  return {
    ...q,
    validatedAnswer: null,
    hasValidatedAnswer: true,
  };
}

export const testingQuestionSchema = z.object({
  questionId: z.string().min(1).max(120),
  knowledgeUnitId: z.string().min(1).max(120),
  sourceId: z.string().min(1).max(120),
  topic: z.string(),
  difficulty: z.number().int().min(1).max(5),
  questionType: z.enum(testingQuestionTypes),
  stem: z.string(),
  choices: z.array(
    z.object({ id: z.string(), label: z.string() }),
  ),
  clozeTemplate: z.string().nullable(),
  validatedAnswer: z.object({
    canonical: z.string().min(1),
    keyIdeas: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        synonyms: z.array(z.string()).default([]),
        required: z.boolean().default(true),
      }),
    ),
    correctChoiceId: z.string().nullable(),
    correctIsTrue: z.boolean().nullable(),
    clozeAnswers: z.array(z.string()),
  }),
  explanation: z.string().min(1),
  provenance: z.object({
    sourceId: z.string(),
    sourceTitle: z.string(),
    excerpt: z.string().min(1),
    headingPath: z.string().nullable(),
    charStart: z.number().nullable(),
    charEnd: z.number().nullable(),
  }),
});
