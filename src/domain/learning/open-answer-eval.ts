import { z } from "zod";
import type { MasteryCorrectness } from "@/domain/learning/mastery-engine";

/**
 * Robust open-answer evaluation — coverage of key ideas, not exact strings.
 * Harmless wording / morphology / diacritics never alone decide Incorrect.
 */

/** Local normalize — avoid circular import with question-engine. */
export function normalizeOpenText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const openAnswerResults = [
  "correct",
  "partially_correct",
  "incorrect",
] as const;

export type OpenAnswerResult = (typeof openAnswerResults)[number];

export const openAnswerResultLabelsEn: Record<OpenAnswerResult, string> = {
  correct: "Correct",
  partially_correct: "Partially correct",
  incorrect: "Incorrect",
};

export const openAnswerResultLabelsCs: Record<OpenAnswerResult, string> = {
  correct: "Správně",
  partially_correct: "Částečně správně",
  incorrect: "Nesprávně",
};

export const openAnswerKeyIdeaSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(200),
  synonyms: z.array(z.string().min(1).max(120)).max(12).default([]),
  /** If false, missing this idea alone won't force Incorrect when others hit. */
  required: z.boolean().default(true),
});

export type OpenAnswerKeyIdea = z.infer<typeof openAnswerKeyIdeaSchema>;

export const openAnswerSourceEvidenceSchema = z.object({
  quote: z.string().min(1).max(2000),
  sourceLabel: z.string().min(1).max(240),
  pageStart: z.number().int().min(1).nullable().optional(),
  pageEnd: z.number().int().min(1).nullable().optional(),
});

export type OpenAnswerSourceEvidence = z.infer<
  typeof openAnswerSourceEvidenceSchema
>;

export const openAnswerEvaluationSchema = z.object({
  result: z.enum(openAnswerResults),
  resultLabel: z.string().min(1).max(40),
  /** 0–1 factual / key-idea coverage. */
  coverage: z.number().min(0).max(1),
  /** Ideas found in the student answer (harmless wording OK). */
  whatWasCorrect: z.array(z.string().min(1).max(200)).max(20),
  /** Required ideas not found. */
  whatWasMissing: z.array(z.string().min(1).max(200)).max(20),
  /** Unsupported or contradictory claims. */
  whatWasWrong: z.array(z.string().min(1).max(200)).max(20),
  idealAnswer: z.string().min(1).max(1200),
  sourceEvidence: openAnswerSourceEvidenceSchema.nullable(),
  /** Mapped for mastery engine. */
  masteryCorrectness: z.enum(["correct", "partial", "incorrect"]),
  scoredKeyIdeas: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      matched: z.boolean(),
      matchedVia: z.string().nullable(),
    }),
  ),
});

export type OpenAnswerEvaluation = z.infer<typeof openAnswerEvaluationSchema>;

export type EvaluateOpenAnswerInput = {
  studentAnswer: string;
  keyIdeas: OpenAnswerKeyIdea[];
  idealAnswer: string;
  sourceEvidence?: OpenAnswerSourceEvidence | null;
  /** Known misconceptions / distractor phrases. */
  knownIncorrect?: string[];
  fullThreshold?: number;
  partialThreshold?: number;
};

const STOP = new Set(
  [
    "a",
    "ale",
    "je",
    "jsou",
    "to",
    "se",
    "na",
    "v",
    "ve",
    "z",
    "ze",
    "o",
    "u",
    "k",
    "ke",
    "do",
    "od",
    "po",
    "pro",
    "pri",
    "i",
    "nebo",
    "ze",
    "že",
    "jak",
    "co",
  ].map((w) => normalizeOpenText(w)),
);

function significantTokens(phrase: string): string[] {
  return normalizeOpenText(phrase)
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

/**
 * Soft phrase match: exact normalized include, or all significant stems present.
 * Czech morphology via shared prefix — never requires identical wording.
 */
export function ideaPresentInAnswer(
  answerNorm: string,
  idea: string,
  synonyms: string[] = [],
): { matched: boolean; via: string | null } {
  const candidates = [idea, ...synonyms].filter(Boolean);
  const hayTokens = answerNorm.split(/\s+/).filter(Boolean);

  for (const candidate of candidates) {
    const n = normalizeOpenText(candidate);
    if (n.length < 2) continue;
    if (answerNorm.includes(n)) {
      return { matched: true, via: candidate };
    }

    const tokens = significantTokens(candidate);
    if (tokens.length === 0) continue;

    const allHit = tokens.every((nt) => {
      if (answerNorm.includes(nt)) return true;
      const stemLen = Math.min(nt.length, Math.max(4, nt.length - 2));
      const stem = nt.slice(0, stemLen);
      return hayTokens.some(
        (ht) =>
          ht.startsWith(stem) ||
          (ht.length >= 4 &&
            stem.startsWith(ht.slice(0, Math.min(stemLen, ht.length)))),
      );
    });
    // Allow one miss for long phrases (harmless wording / extra fluff)
    if (tokens.length >= 3) {
      const hits = tokens.filter((nt) => {
        if (answerNorm.includes(nt)) return true;
        const stemLen = Math.min(nt.length, Math.max(4, nt.length - 2));
        const stem = nt.slice(0, stemLen);
        return hayTokens.some((ht) => ht.startsWith(stem));
      }).length;
      if (hits / tokens.length >= 0.75) {
        return { matched: true, via: candidate };
      }
    } else if (allHit) {
      return { matched: true, via: candidate };
    }
  }
  return { matched: false, via: null };
}

function detectWrongClaims(params: {
  studentAnswer: string;
  answerNorm: string;
  keyIdeas: OpenAnswerKeyIdea[];
  idealAnswer: string;
  sourceEvidence?: OpenAnswerSourceEvidence | null;
  knownIncorrect?: string[];
}): string[] {
  const wrong: string[] = [];
  const evidenceBlob = normalizeOpenText(
    [
      params.idealAnswer,
      ...params.keyIdeas.map((k) => `${k.label} ${k.synonyms.join(" ")}`),
      params.sourceEvidence?.quote ?? "",
    ].join(" "),
  );

  for (const bad of params.knownIncorrect ?? []) {
    const n = normalizeOpenText(bad);
    if (n.length >= 3 && params.answerNorm.includes(n)) {
      wrong.push(`Častá mýlka: „${bad}“`);
    }
  }

  for (const year of params.studentAnswer.matchAll(
    /\b(1[0-9]{3}|20[0-9]{2})\b/g,
  )) {
    const y = year[1]!;
    if (!evidenceBlob.includes(y)) {
      wrong.push(`Rok ${y} není v podkladu / ideální odpovědi.`);
    }
  }

  for (const m of params.studentAnswer.matchAll(
    /\b([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}'-]+(?:\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}'-]+){0,2})\b/gu,
  )) {
    const name = m[1]!;
    if (name.length < 4) continue;
    const nn = normalizeOpenText(name);
    if (nn.length < 4) continue;
    // Skip if it matches a key idea / evidence
    const supported =
      evidenceBlob.includes(nn) ||
      params.keyIdeas.some(
        (k) =>
          ideaPresentInAnswer(nn, k.label, k.synonyms).matched ||
          normalizeOpenText(k.label).includes(nn),
      );
    if (!supported) {
      // Only flag if it looks like a competing entity claim (2+ capitalized tokens or known length)
      if (name.split(/\s+/).length >= 2) {
        wrong.push(`Tvrzení o „${name}“ není podložené zdrojem.`);
      }
    }
  }

  return [...new Set(wrong)].slice(0, 8);
}

function toMastery(result: OpenAnswerResult): MasteryCorrectness {
  if (result === "correct") return "correct";
  if (result === "partially_correct") return "partial";
  return "incorrect";
}

/**
 * Evaluate an open student answer against required key ideas + evidence.
 */
export function evaluateOpenAnswer(
  input: EvaluateOpenAnswerInput,
): OpenAnswerEvaluation {
  const fullThreshold = input.fullThreshold ?? 0.85;
  const partialThreshold = input.partialThreshold ?? 0.35;
  const answer = input.studentAnswer.trim();
  const answerNorm = normalizeOpenText(answer);
  const keyIdeas = input.keyIdeas.map((k) =>
    openAnswerKeyIdeaSchema.parse(k),
  );

  const scored = keyIdeas.map((idea) => {
    const hit = ideaPresentInAnswer(answerNorm, idea.label, idea.synonyms);
    return {
      id: idea.id,
      label: idea.label,
      matched: hit.matched,
      matchedVia: hit.via,
      required: idea.required,
    };
  });

  const whatWasCorrect = scored
    .filter((s) => s.matched)
    .map((s) => s.label);
  const whatWasMissing = scored
    .filter((s) => !s.matched && s.required)
    .map((s) => s.label);

  const required = scored.filter((s) => s.required);
  const requiredHits = required.filter((s) => s.matched).length;
  const coverage =
    required.length === 0
      ? scored.length === 0
        ? 0
        : scored.filter((s) => s.matched).length / scored.length
      : requiredHits / required.length;

  const whatWasWrong = answer
    ? detectWrongClaims({
        studentAnswer: answer,
        answerNorm,
        keyIdeas,
        idealAnswer: input.idealAnswer,
        sourceEvidence: input.sourceEvidence,
        knownIncorrect: input.knownIncorrect,
      })
    : ["Prázdná odpověď."];

  // Empty answer → incorrect
  let result: OpenAnswerResult;
  if (!answer) {
    result = "incorrect";
  } else if (coverage >= fullThreshold && whatWasWrong.length === 0) {
    result = "correct";
  } else if (
    coverage >= fullThreshold &&
    whatWasWrong.length > 0 &&
    coverage >= 0.9
  ) {
    // Strong coverage but unsupported extras → partial (don't ignore wrong claims)
    result = "partially_correct";
  } else if (coverage >= partialThreshold || whatWasCorrect.length > 0) {
    result = "partially_correct";
  } else {
    result = "incorrect";
  }

  return openAnswerEvaluationSchema.parse({
    result,
    resultLabel: openAnswerResultLabelsEn[result],
    coverage: Math.round(coverage * 100) / 100,
    whatWasCorrect,
    whatWasMissing,
    whatWasWrong,
    idealAnswer: input.idealAnswer.slice(0, 1200),
    sourceEvidence: input.sourceEvidence ?? null,
    masteryCorrectness: toMastery(result),
    scoredKeyIdeas: scored.map(({ id, label, matched, matchedVia }) => ({
      id,
      label,
      matched,
      matchedVia,
    })),
  });
}

/** Map open-eval result → Question Engine attempt result. */
export function openResultToAttemptResult(
  result: OpenAnswerResult,
): "correct" | "partial" | "incorrect" {
  if (result === "correct") return "correct";
  if (result === "partially_correct") return "partial";
  return "incorrect";
}
