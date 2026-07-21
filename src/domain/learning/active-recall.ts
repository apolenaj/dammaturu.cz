import { z } from "zod";

/**
 * Active recall mode — free production (text or speech), no choices.
 * Grading is coverage over key points mapped to knowledge units — never binary-only.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const recallAttemptResults = [
  "correct",
  "partial",
  "incorrect",
] as const;

export type RecallAttemptResult = (typeof recallAttemptResults)[number];

export const recallKeyPointSchema = z.object({
  id: z.string().uuid(),
  /** Canonical point the student should mention. */
  label: z.string().min(1).max(160),
  /** Alternate phrasings for matching (normalized). */
  synonyms: z.array(z.string().min(1).max(80)).max(12).default([]),
  knowledgeUnitId: z.string().uuid(),
  knowledgeUnitTitle: z.string().min(1).max(120),
});

export type RecallKeyPoint = z.infer<typeof recallKeyPointSchema>;

export const recallPromptSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  prompt: z.string().min(1).max(400),
  /** How many points a “full” answer should roughly cover. */
  minExpected: z.number().int().min(1).max(12),
  keyPoints: z.array(recallKeyPointSchema).min(2).max(12),
  /** Short model answer shown after submit. */
  modelAnswer: z.string().min(1).max(900),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
});

export type RecallPrompt = z.infer<typeof recallPromptSchema>;

export const recallPackSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  prompts: z.array(recallPromptSchema).min(3).max(40),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type RecallPack = z.infer<typeof recallPackSchema>;

export const recallKuStatSchema = z.object({
  knowledgeUnitId: z.string().uuid(),
  title: z.string().min(1).max(120),
  hits: z.number().int().min(0),
  misses: z.number().int().min(0),
});

export const recallProgressSchema = z.object({
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  currentIndex: z.number().int().min(0),
  completedPromptIds: z.array(z.string().uuid()),
  attemptCount: z.number().int().min(0),
  correctCount: z.number().int().min(0),
  partialCount: z.number().int().min(0),
  incorrectCount: z.number().int().min(0),
  /** Cumulative coverage 0–1 sum for average. */
  coverageSum: z.number().min(0),
  kuStats: z.array(recallKuStatSchema),
  lastResult: z.enum(recallAttemptResults).nullable(),
  updatedAt: z.string().datetime(),
});

export type RecallProgress = z.infer<typeof recallProgressSchema>;

export type MatchedKeyPoint = {
  keyPointId: string;
  label: string;
  knowledgeUnitId: string;
  knowledgeUnitTitle: string;
  matchedVia: string;
};

export type MissingKeyPoint = {
  keyPointId: string;
  label: string;
  knowledgeUnitId: string;
  knowledgeUnitTitle: string;
};

export type KuOutcome = {
  knowledgeUnitId: string;
  title: string;
  status: "hit" | "miss";
};

export type RecallGrade = {
  result: RecallAttemptResult;
  /** 0–1 share of key points hit. */
  coverage: number;
  /** Hits relative to minExpected (capped at 1). */
  expectedCoverage: number;
  matched: MatchedKeyPoint[];
  missing: MissingKeyPoint[];
  /** Student fragments that did not map to any key point. */
  extra: string[];
  modelAnswer: string;
  perKnowledgeUnit: KuOutcome[];
};

export function parseRecallPack(raw: unknown): RecallPack {
  const pack = recallPackSchema.parse(raw);
  for (const prompt of pack.prompts) {
    if (prompt.minExpected > prompt.keyPoints.length) {
      throw new Error(
        `Prompt ${prompt.slug}: minExpected > počet key points`,
      );
    }
    const kuIds = new Set<string>();
    for (const kp of prompt.keyPoints) {
      if (kuIds.has(kp.knowledgeUnitId)) {
        throw new Error(
          `Prompt ${prompt.slug}: duplicitní KU ${kp.knowledgeUnitId}`,
        );
      }
      kuIds.add(kp.knowledgeUnitId);
    }
  }
  return pack;
}

/** Lowercase, strip diacritics, collapse whitespace/punct for matching. */
export function normalizeRecallText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesPhrase(haystack: string, needle: string): boolean {
  const n = normalizeRecallText(needle);
  if (n.length < 2) return false;
  if (haystack.includes(n)) return true;

  const hayTokens = haystack.split(" ").filter(Boolean);
  const needleTokens = n.split(" ").filter((t) => t.length >= 3);
  if (needleTokens.length === 0) return false;

  return needleTokens.every((nt) => {
    if (haystack.includes(nt)) return true;
    // Czech morphology: typizace ↔ typizuje, sociální ↔ socialni already normalized
    const stemLen = Math.min(nt.length, Math.max(4, nt.length - 2));
    const stem = nt.slice(0, stemLen);
    return hayTokens.some(
      (ht) =>
        ht.startsWith(stem) ||
        (ht.length >= 4 && stem.startsWith(ht.slice(0, Math.min(stemLen, ht.length)))),
    );
  });
}

/** Split free answer into candidate “claims” for extra detection. */
export function splitAnswerFragments(answer: string): string[] {
  return answer
    .split(/[\n;•]+|(?<=\.)\s+|(?:,\s*(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]))/)
    .map((s) => s.replace(/^[-–—*\d.)\s]+/, "").trim())
    .filter((s) => s.length >= 3);
}

/**
 * Grade free recall against key points → KU outcomes.
 * correct ≥ 85% of key points OR ≥ minExpected hits
 * partial ≥ 1 hit and < correct threshold
 * incorrect = 0 hits
 */
export function gradeRecallAnswer(
  prompt: RecallPrompt,
  answer: string,
): RecallGrade {
  const normalized = normalizeRecallText(answer);
  const matched: MatchedKeyPoint[] = [];
  const missing: MissingKeyPoint[] = [];

  for (const kp of prompt.keyPoints) {
    const candidates = [kp.label, ...kp.synonyms];
    let hitVia: string | null = null;
    for (const c of candidates) {
      if (includesPhrase(normalized, c)) {
        hitVia = c;
        break;
      }
    }
    if (hitVia) {
      matched.push({
        keyPointId: kp.id,
        label: kp.label,
        knowledgeUnitId: kp.knowledgeUnitId,
        knowledgeUnitTitle: kp.knowledgeUnitTitle,
        matchedVia: hitVia,
      });
    } else {
      missing.push({
        keyPointId: kp.id,
        label: kp.label,
        knowledgeUnitId: kp.knowledgeUnitId,
        knowledgeUnitTitle: kp.knowledgeUnitTitle,
      });
    }
  }

  const matchedIds = new Set(matched.map((m) => m.keyPointId));
  const fragments = splitAnswerFragments(answer);
  const extra = fragments.filter((frag) => {
    const n = normalizeRecallText(frag);
    if (n.length < 4) return false;
    // fragment is “extra” if it doesn't help any key point
    return !prompt.keyPoints.some((kp) => {
      if (matchedIds.has(kp.id) && includesPhrase(n, kp.label)) return true;
      return [kp.label, ...kp.synonyms].some((s) => includesPhrase(n, s));
    });
  });

  const coverage =
    prompt.keyPoints.length === 0
      ? 0
      : matched.length / prompt.keyPoints.length;
  const expectedCoverage = Math.min(
    1,
    matched.length / Math.max(1, prompt.minExpected),
  );

  let result: RecallAttemptResult;
  if (matched.length === 0) {
    result = "incorrect";
  } else if (
    coverage >= 0.85 ||
    matched.length >= prompt.minExpected
  ) {
    result = "correct";
  } else {
    result = "partial";
  }

  const perKnowledgeUnit: KuOutcome[] = prompt.keyPoints.map((kp) => ({
    knowledgeUnitId: kp.knowledgeUnitId,
    title: kp.knowledgeUnitTitle,
    status: matchedIds.has(kp.id) ? "hit" : "miss",
  }));

  return {
    result,
    coverage: Math.round(coverage * 100) / 100,
    expectedCoverage: Math.round(expectedCoverage * 100) / 100,
    matched,
    missing,
    extra,
    modelAnswer: prompt.modelAnswer,
    perKnowledgeUnit,
  };
}

export function emptyRecallProgress(
  learnerId: string,
  pack: RecallPack,
  nowIso: string,
): RecallProgress {
  return {
    learnerId,
    packId: pack.id,
    packSlug: pack.slug,
    currentIndex: 0,
    completedPromptIds: [],
    attemptCount: 0,
    correctCount: 0,
    partialCount: 0,
    incorrectCount: 0,
    coverageSum: 0,
    kuStats: [],
    lastResult: null,
    updatedAt: nowIso,
  };
}

export function applyRecallGradeToProgress(
  progress: RecallProgress,
  prompt: RecallPrompt,
  grade: RecallGrade,
  nowIso: string,
): RecallProgress {
  const kuMap = new Map(
    progress.kuStats.map((s) => [s.knowledgeUnitId, { ...s }]),
  );
  for (const outcome of grade.perKnowledgeUnit) {
    const cur = kuMap.get(outcome.knowledgeUnitId) ?? {
      knowledgeUnitId: outcome.knowledgeUnitId,
      title: outcome.title,
      hits: 0,
      misses: 0,
    };
    if (outcome.status === "hit") cur.hits += 1;
    else cur.misses += 1;
    kuMap.set(outcome.knowledgeUnitId, cur);
  }

  const completed = progress.completedPromptIds.includes(prompt.id)
    ? progress.completedPromptIds
    : [...progress.completedPromptIds, prompt.id];

  return {
    ...progress,
    /** Next prompt index to answer (after current feedback). */
    currentIndex: Math.min(completed.length, progress.currentIndex + 1),
    completedPromptIds: completed,
    attemptCount: progress.attemptCount + 1,
    correctCount: progress.correctCount + (grade.result === "correct" ? 1 : 0),
    partialCount: progress.partialCount + (grade.result === "partial" ? 1 : 0),
    incorrectCount:
      progress.incorrectCount + (grade.result === "incorrect" ? 1 : 0),
    coverageSum: progress.coverageSum + grade.coverage,
    kuStats: [...kuMap.values()],
    lastResult: grade.result,
    updatedAt: nowIso,
  };
}

export function averageCoverage(progress: RecallProgress): number | null {
  if (progress.attemptCount === 0) return null;
  return Math.round((progress.coverageSum / progress.attemptCount) * 100);
}

export const recallResultLabelsCs: Record<RecallAttemptResult, string> = {
  correct: "Skoro kompletní",
  partial: "Částečná znalost",
  incorrect: "Zatím bez zásahu",
};
