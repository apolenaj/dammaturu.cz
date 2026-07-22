/**
 * Evidence-informed learning session engine.
 * Core rule: RECALL BEFORE REVEAL — never show the answer before an attempt
 * (unless the student chooses „Nevím“).
 *
 * Works fully offline / without any AI provider — all text from approved sources.
 */

import { z } from "zod";
import {
  evaluateOpenAnswer,
  normalizeOpenText,
  type OpenAnswerEvaluation,
  type OpenAnswerKeyIdea,
} from "@/domain/learning/open-answer-eval";
import { extractKeyPhrasesFromSource } from "@/domain/learning/grounded-study";
import type { ReviewGrade } from "@/domain/learning/scheduler";

export const learningInteractionTypes = [
  "free_recall",
  "short_answer",
  "multiple_choice",
  "cloze",
  "true_false",
  "matching",
  "ordering",
  "compare",
  "explain_own_words",
  "example_nonexample",
] as const;

export type LearningInteractionType = (typeof learningInteractionTypes)[number];

export const learningInteractionLabelsCs: Record<
  LearningInteractionType,
  string
> = {
  free_recall: "Volné vybavení",
  short_answer: "Krátká odpověď",
  multiple_choice: "Výběr z možností",
  cloze: "Doplňovačka",
  true_false: "Pravda / nepravda",
  matching: "Párování",
  ordering: "Seřazení",
  compare: "Porovnání",
  explain_own_words: "Vysvětli vlastními slovy",
  example_nonexample: "Příklad / ne-příklad",
};

export const learningStepKinds = [
  "micro",
  "primary",
  "follow_up",
  "confidence",
] as const;

export type LearningStepKind = (typeof learningStepKinds)[number];

/** Canonical knowledge atom for the engine (adapter-friendly). */
export type LearningAtom = {
  id: string;
  title: string;
  statement: string;
  kind: string;
  topic: string;
  subtopic: string | null;
  sourceId: string;
  sourceTitle: string;
  sourceChunkId: string | null;
  sourceText: string;
  headingPath: string | null;
  charStart: number | null;
  charEnd: number | null;
  tags: string[];
};

export type LearningChoice = {
  id: string;
  label: string;
  correct: boolean;
};

export type LearningPair = {
  leftId: string;
  left: string;
  rightId: string;
  right: string;
};

export type LearningSourceRef = {
  sourceId: string;
  sourceTitle: string;
  chunkId: string | null;
  headingPath: string | null;
  /** Verbatim excerpt — never invented. */
  excerpt: string;
  charStart: number | null;
  charEnd: number | null;
};

export type LearningItem = {
  id: string;
  atomId: string;
  stepKind: LearningStepKind;
  interaction: LearningInteractionType;
  /** Shown before answer attempt — must not contain the ideal answer for primary/follow_up. */
  prompt: string;
  /** Optional framing (micro) — context only. */
  microText: string | null;
  idealAnswer: string;
  keyIdeas: OpenAnswerKeyIdea[];
  choices: LearningChoice[];
  pairs: LearningPair[];
  /** Ordering tokens (correct order). */
  orderItems: Array<{ id: string; label: string }>;
  trueFalseCorrect: boolean | null;
  clozeTemplate: string | null;
  clozeAnswers: string[];
  source: LearningSourceRef;
  conciseExplanation: string;
  literatureLens:
    | "timeline"
    | "author_work"
    | "movement_traits"
    | "character_work"
    | "work_theme"
    | "compare_movements"
    | "excerpt"
    | null;
};

export type LearningSession = {
  id: string;
  learnerId: string;
  sourceIds: string[];
  subject: string;
  title: string;
  items: LearningItem[];
  createdAt: string;
};

export type LearningGradeResult = {
  result: "correct" | "partial" | "incorrect";
  resultLabelCs: string;
  coverage: number;
  whatWasCorrect: string[];
  whatWasMissing: string[];
  whatWasWrong: string[];
  conciseExplanation: string;
  source: LearningSourceRef;
  openEvaluation: OpenAnswerEvaluation | null;
  reviewGrade: ReviewGrade;
  scheduledDueAt: string | null;
};

export type SimpleExplanation = {
  text: string;
  source: LearningSourceRef;
  insufficient: boolean;
};

export const DONT_KNOW_TOKEN = "__NEVIM__";

const RESULT_CS = {
  correct: "Správně",
  partial: "Částečně správně",
  incorrect: "Nesprávně",
} as const;

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

export function keyIdeasFromAtom(atom: LearningAtom): OpenAnswerKeyIdea[] {
  const phrases = extractKeyPhrasesFromSource(atom.statement);
  const ideas: OpenAnswerKeyIdea[] = [];
  const seen = new Set<string>();
  for (const label of [atom.title, ...phrases]) {
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
      label: atom.statement.slice(0, 120),
      synonyms: [],
      required: true,
    });
  }
  return ideas;
}

function sourceRefFromAtom(atom: LearningAtom): LearningSourceRef {
  return {
    sourceId: atom.sourceId,
    sourceTitle: atom.sourceTitle,
    chunkId: atom.sourceChunkId,
    headingPath: atom.headingPath,
    excerpt: atom.sourceText.slice(0, 900),
    charStart: atom.charStart,
    charEnd: atom.charEnd,
  };
}

function conciseExplanation(atom: LearningAtom): string {
  // Grounded: statement + short surrounding excerpt, no rewrite invention.
  const excerpt = atom.sourceText.trim();
  const stmt = atom.statement.trim();
  if (excerpt && !normalizeOpenText(excerpt).includes(normalizeOpenText(stmt).slice(0, 40))) {
    return `${stmt}\n\nZe zdroje: ${excerpt.slice(0, 280)}${excerpt.length > 280 ? "…" : ""}`;
  }
  return stmt;
}

/** Micro framing — topic/title only; does NOT reveal the statement. */
export function buildMicroItem(atom: LearningAtom): LearningItem {
  return {
    id: newId("micro"),
    atomId: atom.id,
    stepKind: "micro",
    interaction: "free_recall",
    prompt: `Teď: ${atom.title}`,
    microText: [
      atom.topic,
      atom.subtopic,
      atom.headingPath ? `Oddíl: ${atom.headingPath}` : null,
      "Nejdřív si zkus vybavit odpověď — ukážeme ji až po tvém pokusu.",
    ]
      .filter(Boolean)
      .join(" · "),
    idealAnswer: atom.statement,
    keyIdeas: keyIdeasFromAtom(atom),
    choices: [],
    pairs: [],
    orderItems: [],
    trueFalseCorrect: null,
    clozeTemplate: null,
    clozeAnswers: [],
    source: sourceRefFromAtom(atom),
    conciseExplanation: conciseExplanation(atom),
    literatureLens: null,
  };
}

function pickDistractors(
  atom: LearningAtom,
  pool: LearningAtom[],
  n: number,
): LearningAtom[] {
  return pool
    .filter((a) => a.id !== atom.id && a.statement !== atom.statement)
    .slice(0, n);
}

export function buildPrimaryItem(
  atom: LearningAtom,
  pool: LearningAtom[],
  preferred?: LearningInteractionType,
): LearningItem {
  const interaction =
    preferred ??
    pickPrimaryInteraction(atom, pool);
  return buildInteractionItem(atom, pool, interaction, "primary");
}

export function buildFollowUpItem(
  atom: LearningAtom,
  pool: LearningAtom[],
  used: LearningInteractionType,
): LearningItem {
  const next = pickFollowUpInteraction(atom, pool, used);
  return buildInteractionItem(atom, pool, next, "follow_up");
}

export function buildConfidenceItem(atom: LearningAtom): LearningItem {
  return {
    id: newId("conf"),
    atomId: atom.id,
    stepKind: "confidence",
    interaction: "true_false",
    prompt: "Jak jistě umíš tuhle jednotku teď vysvětlit?",
    microText: "Vyber upřímně — podle toho naplánujeme opakování.",
    idealAnswer: "know",
    keyIdeas: keyIdeasFromAtom(atom),
    choices: [
      { id: "know", label: "Umím to jistě", correct: true },
      { id: "almost", label: "Skoro — potřebuju ještě opakovat", correct: false },
      { id: "dont_know", label: "Ještě si nejsem jistý/á", correct: false },
    ],
    pairs: [],
    orderItems: [],
    trueFalseCorrect: null,
    clozeTemplate: null,
    clozeAnswers: [],
    source: sourceRefFromAtom(atom),
    conciseExplanation: conciseExplanation(atom),
    literatureLens: null,
  };
}

function isLiteratureAtom(atom: LearningAtom): boolean {
  const hay = `${atom.topic} ${atom.subtopic ?? ""} ${atom.sourceTitle} ${atom.tags.join(" ")}`.toLowerCase();
  return /díl|autor|romant|realis|máj|kytice|babič|drama|obrozen|liter/.test(
    hay,
  );
}

function pickPrimaryInteraction(
  atom: LearningAtom,
  pool: LearningAtom[],
): LearningInteractionType {
  if (isLiteratureAtom(atom)) {
    if (/autor|naps|dílo/.test(normalizeOpenText(atom.statement))) {
      return "short_answer";
    }
    if (pool.length >= 3) return "matching";
    return "explain_own_words";
  }
  // Prefer recall forms over MCQ.
  const cycle: LearningInteractionType[] = [
    "free_recall",
    "short_answer",
    "cloze",
    "explain_own_words",
    "true_false",
  ];
  const idx =
    Math.abs(
      [...atom.id].reduce((a, c) => a + c.charCodeAt(0), 0),
    ) % cycle.length;
  return cycle[idx]!;
}

function pickFollowUpInteraction(
  atom: LearningAtom,
  pool: LearningAtom[],
  used: LearningInteractionType,
): LearningInteractionType {
  const options: LearningInteractionType[] = isLiteratureAtom(atom)
    ? [
        "true_false",
        "example_nonexample",
        "compare",
        "multiple_choice",
        "ordering",
      ]
    : [
        "cloze",
        "true_false",
        "example_nonexample",
        "multiple_choice",
        "compare",
        "short_answer",
      ];
  const filtered = options.filter((o) => o !== used);
  if (pool.length < 2) {
    return filtered.find((o) => o !== "compare" && o !== "matching") ?? "true_false";
  }
  return filtered[0] ?? "true_false";
}

function buildCloze(statement: string): {
  template: string;
  answers: string[];
} {
  const phrases = extractKeyPhrasesFromSource(statement);
  const target =
    phrases.find((p) => p.length >= 4 && statement.includes(p)) ??
    statement.split(/\s+/).find((w) => w.length >= 6) ??
    statement.slice(0, 12);
  const template = statement.replace(target, "____");
  return { template, answers: [target.replace(/[.,;:!?]$/, "")] };
}

function buildInteractionItem(
  atom: LearningAtom,
  pool: LearningAtom[],
  interaction: LearningInteractionType,
  stepKind: "primary" | "follow_up",
): LearningItem {
  const base = {
    id: newId(stepKind),
    atomId: atom.id,
    stepKind,
    interaction,
    microText: null as string | null,
    idealAnswer: atom.statement,
    keyIdeas: keyIdeasFromAtom(atom),
    choices: [] as LearningChoice[],
    pairs: [] as LearningPair[],
    orderItems: [] as Array<{ id: string; label: string }>,
    trueFalseCorrect: null as boolean | null,
    clozeTemplate: null as string | null,
    clozeAnswers: [] as string[],
    source: sourceRefFromAtom(atom),
    conciseExplanation: conciseExplanation(atom),
    literatureLens: null as LearningItem["literatureLens"],
  };

  switch (interaction) {
    case "free_recall":
      return {
        ...base,
        prompt: `Vybav si bez nápovědy: ${atom.title}`,
        literatureLens: isLiteratureAtom(atom) ? "work_theme" : null,
      };
    case "short_answer":
      return {
        ...base,
        prompt: `Stručná odpověď: ${atom.title}?`,
        literatureLens: isLiteratureAtom(atom) ? "author_work" : null,
      };
    case "explain_own_words":
      return {
        ...base,
        prompt: `Vysvětli vlastními slovy: ${atom.title}`,
      };
    case "cloze": {
      const { template, answers } = buildCloze(atom.statement);
      return {
        ...base,
        prompt: "Doplň chybějící část ze zdroje.",
        clozeTemplate: template,
        clozeAnswers: answers,
        idealAnswer: answers[0] ?? atom.statement,
      };
    }
    case "true_false": {
      const flip = pool.find((a) => a.id !== atom.id);
      const useTrue = !flip || atom.id.charCodeAt(0) % 2 === 0;
      const claim = useTrue ? atom.statement : flip!.statement;
      return {
        ...base,
        prompt: `Je toto tvrzení pravdivé vzhledem k tématu „${atom.title}“?\n\n„${claim}“`,
        idealAnswer: useTrue ? "pravda" : "nepravda",
        trueFalseCorrect: useTrue,
        choices: [
          { id: "true", label: "Pravda", correct: useTrue },
          { id: "false", label: "Nepravda", correct: !useTrue },
        ],
        conciseExplanation: useTrue
          ? conciseExplanation(atom)
          : `Správně je nepravda pro toto téma. Správné tvrzení: ${atom.statement}`,
        literatureLens: isLiteratureAtom(atom) ? "movement_traits" : null,
      };
    }
    case "multiple_choice": {
      const distractors = pickDistractors(atom, pool, 3);
      const choices: LearningChoice[] = [
        { id: "c0", label: atom.statement.slice(0, 220), correct: true },
        ...distractors.map((d, i) => ({
          id: `c${i + 1}`,
          label: d.statement.slice(0, 220),
          correct: false,
        })),
      ];
      // Shuffle deterministically
      const seed = atom.id.length;
      choices.sort(
        (a, b) =>
          ((a.id.charCodeAt(0) + seed) % 7) - ((b.id.charCodeAt(0) + seed) % 7),
      );
      return {
        ...base,
        prompt: `Které tvrzení patří k: ${atom.title}?`,
        choices,
        literatureLens: isLiteratureAtom(atom) ? "movement_traits" : null,
      };
    }
    case "example_nonexample": {
      const other = pickDistractors(atom, pool, 1)[0];
      return {
        ...base,
        prompt: `Který text je příklad k „${atom.title}“ (ne ne-příklad)?`,
        choices: [
          {
            id: "ex",
            label: atom.statement.slice(0, 220),
            correct: true,
          },
          {
            id: "non",
            label: (other?.statement ?? "Obecné tvrzení mimo téma.").slice(
              0,
              220,
            ),
            correct: false,
          },
        ],
      };
    }
    case "matching": {
      const peers = [atom, ...pickDistractors(atom, pool, 2)].slice(0, 3);
      const pairs: LearningPair[] = peers.map((p, i) => ({
        leftId: `L${i}`,
        left: p.title.slice(0, 80),
        rightId: `R${i}`,
        right: p.statement.slice(0, 120),
      }));
      return {
        ...base,
        prompt: "Spáruj pojem s tvrzením ze zdroje.",
        pairs,
        idealAnswer: pairs.map((p) => `${p.left} → ${p.right}`).join("; "),
        literatureLens: isLiteratureAtom(atom) ? "author_work" : null,
      };
    }
    case "ordering": {
      const peers = [atom, ...pickDistractors(atom, pool, 2)].slice(0, 3);
      const orderItems = peers.map((p, i) => ({
        id: `o${i}`,
        label: p.title.slice(0, 100),
      }));
      return {
        ...base,
        prompt: "Seřaď pojmy v pořadí, jak jdou ve studijním materiálu (podle úseků).",
        orderItems,
        idealAnswer: orderItems.map((o) => o.label).join(" → "),
        literatureLens: isLiteratureAtom(atom) ? "timeline" : null,
      };
    }
    case "compare": {
      const other = pickDistractors(atom, pool, 1)[0];
      return {
        ...base,
        prompt: other
          ? `Porovnej: „${atom.title}“ a „${other.title}“. Co je odlišuje?`
          : `Čím se „${atom.title}“ liší od podobných pojmů?`,
        idealAnswer: other
          ? `${atom.statement} × ${other.statement}`
          : atom.statement,
        keyIdeas: [
          ...keyIdeasFromAtom(atom),
          ...(other ? keyIdeasFromAtom(other).slice(0, 2) : []),
        ].slice(0, 8),
        literatureLens: isLiteratureAtom(atom) ? "compare_movements" : null,
      };
    }
    default:
      return {
        ...base,
        prompt: `Vybav si: ${atom.title}`,
        interaction: "free_recall",
      };
  }
}

/**
 * Full KU sequence: micro → primary → follow-up → confidence.
 * Answers are never embedded in prompts for primary/follow_up.
 */
export function buildAtomSequence(
  atom: LearningAtom,
  pool: LearningAtom[],
): LearningItem[] {
  const micro = buildMicroItem(atom);
  const primary = buildPrimaryItem(atom, pool);
  const follow = buildFollowUpItem(atom, pool, primary.interaction);
  const confidence = buildConfidenceItem(atom);
  return [micro, primary, follow, confidence];
}

export function buildLearningSession(input: {
  learnerId: string;
  subject: string;
  title: string;
  atoms: LearningAtom[];
  maxAtoms?: number;
}): LearningSession {
  const maxAtoms = input.maxAtoms ?? 4;
  const selected = input.atoms.slice(0, maxAtoms);
  const items: LearningItem[] = [];
  for (const atom of selected) {
    items.push(...buildAtomSequence(atom, input.atoms));
  }
  return {
    id: newId("sess"),
    learnerId: input.learnerId,
    sourceIds: [...new Set(selected.map((a) => a.sourceId))],
    subject: input.subject,
    title: input.title,
    items,
    createdAt: new Date().toISOString(),
  };
}

/** Grade student response — deterministic, no LLM. */
export function gradeLearningResponse(input: {
  item: LearningItem;
  rawAnswer: string;
}): Omit<LearningGradeResult, "scheduledDueAt"> {
  const raw = input.rawAnswer.trim();
  const dontKnow =
    raw === DONT_KNOW_TOKEN ||
    normalizeOpenText(raw) === "nevim" ||
    normalizeOpenText(raw) === "nevím";

  if (input.item.stepKind === "micro") {
    return {
      result: "correct",
      resultLabelCs: RESULT_CS.correct,
      coverage: 1,
      whatWasCorrect: [],
      whatWasMissing: [],
      whatWasWrong: [],
      conciseExplanation: input.item.conciseExplanation,
      source: input.item.source,
      openEvaluation: null,
      reviewGrade: "know",
    };
  }

  if (input.item.stepKind === "confidence") {
    const grade: ReviewGrade =
      raw === "know" || raw === "almost" || raw === "dont_know"
        ? raw
        : "almost";
    return {
      result:
        grade === "know"
          ? "correct"
          : grade === "almost"
            ? "partial"
            : "incorrect",
      resultLabelCs:
        grade === "know"
          ? RESULT_CS.correct
          : grade === "almost"
            ? RESULT_CS.partial
            : RESULT_CS.incorrect,
      coverage: grade === "know" ? 1 : grade === "almost" ? 0.5 : 0,
      whatWasCorrect: [],
      whatWasMissing: [],
      whatWasWrong: [],
      conciseExplanation: input.item.conciseExplanation,
      source: input.item.source,
      openEvaluation: null,
      reviewGrade: grade,
    };
  }

  if (dontKnow) {
    return {
      result: "incorrect",
      resultLabelCs: RESULT_CS.incorrect,
      coverage: 0,
      whatWasCorrect: [],
      whatWasMissing: input.item.keyIdeas.map((k) => k.label),
      whatWasWrong: [],
      conciseExplanation: input.item.conciseExplanation,
      source: input.item.source,
      openEvaluation: null,
      reviewGrade: "dont_know",
    };
  }

  const type = input.item.interaction;

  if (
    type === "multiple_choice" ||
    type === "example_nonexample" ||
    (type === "true_false" && input.item.choices.length > 0)
  ) {
    const choice = input.item.choices.find((c) => c.id === raw);
    const correct = Boolean(choice?.correct);
    return {
      result: correct ? "correct" : "incorrect",
      resultLabelCs: correct ? RESULT_CS.correct : RESULT_CS.incorrect,
      coverage: correct ? 1 : 0,
      whatWasCorrect: correct ? [choice?.label ?? ""] : [],
      whatWasMissing: correct
        ? []
        : [input.item.choices.find((c) => c.correct)?.label ?? input.item.idealAnswer],
      whatWasWrong: correct ? [] : [choice?.label ?? raw],
      conciseExplanation: input.item.conciseExplanation,
      source: input.item.source,
      openEvaluation: null,
      reviewGrade: correct ? "know" : "dont_know",
    };
  }

  if (type === "cloze") {
    const norm = normalizeOpenText(raw);
    const hit = input.item.clozeAnswers.some(
      (a) =>
        normalizeOpenText(a) === norm ||
        norm.includes(normalizeOpenText(a)) ||
        normalizeOpenText(a).includes(norm),
    );
    return {
      result: hit ? "correct" : "incorrect",
      resultLabelCs: hit ? RESULT_CS.correct : RESULT_CS.incorrect,
      coverage: hit ? 1 : 0,
      whatWasCorrect: hit ? input.item.clozeAnswers : [],
      whatWasMissing: hit ? [] : input.item.clozeAnswers,
      whatWasWrong: hit ? [] : [raw],
      conciseExplanation: input.item.conciseExplanation,
      source: input.item.source,
      openEvaluation: null,
      reviewGrade: hit ? "know" : "dont_know",
    };
  }

  if (type === "matching" || type === "ordering") {
    // Student sends semicolon-joined labels; soft match via open eval on ideal.
    const evaluation = evaluateOpenAnswer({
      studentAnswer: raw,
      keyIdeas: input.item.keyIdeas,
      idealAnswer: input.item.idealAnswer,
      sourceEvidence: {
        quote: input.item.source.excerpt,
        sourceLabel: input.item.source.sourceTitle,
      },
    });
    return fromOpenEval(evaluation, input.item);
  }

  const evaluation = evaluateOpenAnswer({
    studentAnswer: raw,
    keyIdeas: input.item.keyIdeas,
    idealAnswer: input.item.idealAnswer,
    sourceEvidence: {
      quote: input.item.source.excerpt,
      sourceLabel: input.item.source.sourceTitle,
      pageStart: null,
      pageEnd: null,
    },
  });
  return fromOpenEval(evaluation, input.item);
}

function fromOpenEval(
  evaluation: OpenAnswerEvaluation,
  item: LearningItem,
): Omit<LearningGradeResult, "scheduledDueAt"> {
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
    conciseExplanation: item.conciseExplanation,
    source: item.source,
    openEvaluation: evaluation,
    reviewGrade:
      result === "correct"
        ? "know"
        : result === "partial"
          ? "almost"
          : "dont_know",
  };
}

/**
 * „Vysvětli mi to jednoduše“ — extractive, grounded in approved source only.
 * No LLM; if source is thin, returns insufficient.
 */
export function explainSimplyFromSource(atom: LearningAtom): SimpleExplanation {
  const text = atom.sourceText.trim();
  if (text.length < 40) {
    return {
      text: "Ve schváleném zdroji teď nemám dost textu pro jednoduché vysvětlení. Otevři původní materiál.",
      source: sourceRefFromAtom(atom),
      insufficient: true,
    };
  }
  // Take first 2–3 sentences / lines as a simple grounded gloss + statement.
  const parts = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, 3);
  const body =
    parts.length > 0
      ? parts.join(" ")
      : text.slice(0, 360);
  return {
    text: `Jednoduše (ze zdroje):\n${atom.statement}\n\n${body.slice(0, 500)}${body.length > 500 ? "…" : ""}`,
    source: sourceRefFromAtom(atom),
    insufficient: false,
  };
}

/** Zod schemas for action payloads (loose ids — catalog uses hex ids). */
export const learningItemSchema = z.object({
  id: z.string().min(1).max(80),
  atomId: z.string().min(1).max(80),
  stepKind: z.enum(learningStepKinds),
  interaction: z.enum(learningInteractionTypes),
  prompt: z.string(),
  microText: z.string().nullable(),
  idealAnswer: z.string(),
  keyIdeas: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      synonyms: z.array(z.string()).default([]),
      required: z.boolean().default(true),
    }),
  ),
  choices: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      correct: z.boolean(),
    }),
  ),
  pairs: z.array(
    z.object({
      leftId: z.string(),
      left: z.string(),
      rightId: z.string(),
      right: z.string(),
    }),
  ),
  orderItems: z.array(z.object({ id: z.string(), label: z.string() })),
  trueFalseCorrect: z.boolean().nullable(),
  clozeTemplate: z.string().nullable(),
  clozeAnswers: z.array(z.string()),
  source: z.object({
    sourceId: z.string(),
    sourceTitle: z.string(),
    chunkId: z.string().nullable(),
    headingPath: z.string().nullable(),
    excerpt: z.string(),
    charStart: z.number().nullable(),
    charEnd: z.number().nullable(),
  }),
  conciseExplanation: z.string(),
  literatureLens: z
    .enum([
      "timeline",
      "author_work",
      "movement_traits",
      "character_work",
      "work_theme",
      "compare_movements",
      "excerpt",
    ])
    .nullable(),
});

export type LearningItemDto = z.infer<typeof learningItemSchema>;
