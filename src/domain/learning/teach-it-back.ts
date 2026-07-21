import { z } from "zod";

/**
 * Teach It Back (D-035) — explain in own words (text or speech).
 * Graded by KU checklist + misconception patterns.
 * Length alone never earns a good result.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const teachResults = ["strong", "partial", "weak"] as const;
export type TeachResult = (typeof teachResults)[number];

export const teachResultLabelsCs: Record<TeachResult, string> = {
  strong: "Silné vysvětlení",
  partial: "Částečné vysvětlení",
  weak: "Slabé vysvětlení",
};

/** Checklist item = one concrete knowledge unit criterion. */
export const teachChecklistItemSchema = z.object({
  id: z.string().uuid(),
  /** What the student should cover. */
  label: z.string().min(1).max(200),
  synonyms: z.array(z.string().min(1).max(80)).max(14).default([]),
  knowledgeUnitId: z.string().uuid(),
  knowledgeUnitTitle: z.string().min(1).max(120),
  /** Required items drive the pass threshold. */
  required: z.boolean().default(true),
});

export type TeachChecklistItem = z.infer<typeof teachChecklistItemSchema>;

/** Misconception / swap — if found in answer → „Co je nepřesné“. */
export const teachInaccuracySchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(200),
  /** Phrases that indicate this misconception. */
  patterns: z.array(z.string().min(1).max(80)).min(1).max(12),
  correction: z.string().min(1).max(280),
});

export type TeachInaccuracy = z.infer<typeof teachInaccuracySchema>;

export const teachPromptSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  /** e.g. „Vysvětli vlastními slovy…“ */
  prompt: z.string().min(1).max(400),
  checklist: z.array(teachChecklistItemSchema).min(3).max(14),
  inaccuracies: z.array(teachInaccuracySchema).max(10).default([]),
  /** „Jak by vypadala výborná odpověď“ */
  excellentAnswer: z.string().min(1).max(1200),
  /** Min required checklist hits for „strong“ (defaults derived if omitted). */
  minRequiredHits: z.number().int().min(1).max(14).optional(),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
});

export type TeachPrompt = z.infer<typeof teachPromptSchema>;

export const teachPackSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  prompts: z.array(teachPromptSchema).min(2).max(30),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TeachPack = z.infer<typeof teachPackSchema>;

export const teachKuStatSchema = z.object({
  knowledgeUnitId: z.string().uuid(),
  title: z.string().min(1).max(120),
  hits: z.number().int().min(0),
  misses: z.number().int().min(0),
});

export const teachProgressSchema = z.object({
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  currentIndex: z.number().int().min(0),
  completedPromptIds: z.array(z.string().uuid()),
  attemptCount: z.number().int().min(0),
  strongCount: z.number().int().min(0),
  partialCount: z.number().int().min(0),
  weakCount: z.number().int().min(0),
  checklistCoverageSum: z.number().min(0),
  kuStats: z.array(teachKuStatSchema),
  lastResult: z.enum(teachResults).nullable(),
  updatedAt: z.string().datetime(),
});

export type TeachProgress = z.infer<typeof teachProgressSchema>;

export type TeachHit = {
  checklistId: string;
  label: string;
  knowledgeUnitId: string;
  knowledgeUnitTitle: string;
  matchedVia: string;
};

export type TeachMiss = {
  checklistId: string;
  label: string;
  knowledgeUnitId: string;
  knowledgeUnitTitle: string;
  required: boolean;
};

export type TeachInaccuracyHit = {
  inaccuracyId: string;
  label: string;
  correction: string;
  matchedVia: string;
};

export type TeachKuOutcome = {
  knowledgeUnitId: string;
  title: string;
  status: "hit" | "miss";
};

export type TeachGrade = {
  result: TeachResult;
  /** Share of checklist items hit (0–1). */
  checklistCoverage: number;
  /** Share of required items hit (0–1). */
  requiredCoverage: number;
  /** Word count — informational only; never drives result. */
  wordCount: number;
  /** True when answer is long but checklist is weak. */
  lengthWithoutSubstance: boolean;
  explainedWell: TeachHit[];
  missing: TeachMiss[];
  inaccurate: TeachInaccuracyHit[];
  excellentAnswer: string;
  perKnowledgeUnit: TeachKuOutcome[];
  coachingNoteCs: string;
};

export const teachConfig = {
  /** Below this word count → too short to grade (UI error). */
  minWordsToSubmit: 4,
  /** Long answer with low coverage → coaching flag (not a free pass). */
  longAnswerWords: 80,
  longAnswerWeakCoverage: 0.4,
  /** strong: high required coverage and no critical inaccuracies. */
  strongRequiredCoverage: 0.85,
  /** partial: at least one required hit. */
} as const;

export function parseTeachPack(raw: unknown): TeachPack {
  const pack = teachPackSchema.parse(raw);
  for (const prompt of pack.prompts) {
    const required = prompt.checklist.filter((c) => c.required);
    if (required.length === 0) {
      throw new Error(`Prompt ${prompt.slug}: potřeba ≥1 required checklist item`);
    }
  }
  return pack;
}

export function normalizeTeachText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(answer: string): number {
  const n = normalizeTeachText(answer);
  if (!n) return 0;
  return n.split(" ").filter(Boolean).length;
}

function includesPhrase(haystack: string, needle: string): boolean {
  const n = normalizeTeachText(needle);
  if (n.length < 2) return false;
  if (haystack.includes(n)) return true;

  const hayTokens = haystack.split(" ").filter(Boolean);
  const needleTokens = n.split(" ").filter((t) => t.length >= 3);
  if (needleTokens.length === 0) return false;

  return needleTokens.every((nt) => {
    if (haystack.includes(nt)) return true;
    const stemLen = Math.min(nt.length, Math.max(4, nt.length - 2));
    const stem = nt.slice(0, stemLen);
    return hayTokens.some(
      (ht) =>
        ht.startsWith(stem) ||
        (ht.length >= 4 &&
          stem.startsWith(ht.slice(0, Math.min(stemLen, ht.length)))),
    );
  });
}

/** Stricter: whole normalized phrase must appear (for misconception patterns). */
function includesContiguous(haystack: string, needle: string): boolean {
  const n = normalizeTeachText(needle);
  if (n.length < 3) return false;
  return haystack.includes(n);
}

function requiredHitTarget(prompt: TeachPrompt): number {
  const required = prompt.checklist.filter((c) => c.required);
  if (prompt.minRequiredHits != null) {
    return Math.min(prompt.minRequiredHits, required.length);
  }
  return Math.max(1, Math.ceil(required.length * teachConfig.strongRequiredCoverage));
}

/**
 * Grade Teach It Back answer against KU checklist.
 * Does NOT reward length — only checklist + inaccuracy patterns.
 */
export function gradeTeachBackAnswer(
  prompt: TeachPrompt,
  answer: string,
): TeachGrade {
  const normalized = normalizeTeachText(answer);
  const wordCount = countWords(answer);

  const explainedWell: TeachHit[] = [];
  const missing: TeachMiss[] = [];

  for (const item of prompt.checklist) {
    const candidates = [item.label, ...item.synonyms];
    let hitVia: string | null = null;
    for (const c of candidates) {
      if (includesPhrase(normalized, c)) {
        hitVia = c;
        break;
      }
    }
    if (hitVia) {
      explainedWell.push({
        checklistId: item.id,
        label: item.label,
        knowledgeUnitId: item.knowledgeUnitId,
        knowledgeUnitTitle: item.knowledgeUnitTitle,
        matchedVia: hitVia,
      });
    } else {
      missing.push({
        checklistId: item.id,
        label: item.label,
        knowledgeUnitId: item.knowledgeUnitId,
        knowledgeUnitTitle: item.knowledgeUnitTitle,
        required: item.required,
      });
    }
  }

  const inaccurate: TeachInaccuracyHit[] = [];
  for (const inc of prompt.inaccuracies) {
    for (const pattern of inc.patterns) {
      if (includesContiguous(normalized, pattern)) {
        inaccurate.push({
          inaccuracyId: inc.id,
          label: inc.label,
          correction: inc.correction,
          matchedVia: pattern,
        });
        break;
      }
    }
  }

  const hitIds = new Set(explainedWell.map((h) => h.checklistId));
  const requiredItems = prompt.checklist.filter((c) => c.required);
  const requiredHits = requiredItems.filter((c) => hitIds.has(c.id)).length;
  const checklistCoverage =
    prompt.checklist.length === 0
      ? 0
      : explainedWell.length / prompt.checklist.length;
  const requiredCoverage =
    requiredItems.length === 0 ? 0 : requiredHits / requiredItems.length;

  const lengthWithoutSubstance =
    wordCount >= teachConfig.longAnswerWords &&
    checklistCoverage < teachConfig.longAnswerWeakCoverage;

  const target = requiredHitTarget(prompt);
  let result: TeachResult;
  if (requiredHits === 0) {
    result = "weak";
  } else if (requiredHits >= target && inaccurate.length === 0) {
    result = "strong";
  } else {
    result = "partial";
  }

  // Length never upgrades; long empty prose cannot stay “strong”
  if (result === "strong" && lengthWithoutSubstance) {
    result = "partial";
  }

  const perKnowledgeUnit: TeachKuOutcome[] = prompt.checklist.map((item) => ({
    knowledgeUnitId: item.knowledgeUnitId,
    title: item.knowledgeUnitTitle,
    status: hitIds.has(item.id) ? "hit" : "miss",
  }));

  let coachingNoteCs: string;
  if (lengthWithoutSubstance) {
    coachingNoteCs =
      "Dlouhý text nestačí — hodnotíme konkrétní knowledge units, ne délku.";
  } else if (result === "strong") {
    coachingNoteCs = "Checklist KU je pokrytý. Dobrá práce — stručnost je v pořádku.";
  } else if (inaccurate.length > 0) {
    coachingNoteCs =
      "Oprav nepřesnosti níže a doplň chybějící body checklistu.";
  } else {
    coachingNoteCs =
      "Doplň chybějící body checklistu. Krátká přesná odpověď je lepší než dlouhá prázdná.";
  }

  return {
    result,
    checklistCoverage: Math.round(checklistCoverage * 100) / 100,
    requiredCoverage: Math.round(requiredCoverage * 100) / 100,
    wordCount,
    lengthWithoutSubstance,
    explainedWell,
    missing,
    inaccurate,
    excellentAnswer: prompt.excellentAnswer,
    perKnowledgeUnit,
    coachingNoteCs,
  };
}

export function emptyTeachProgress(
  learnerId: string,
  pack: TeachPack,
  nowIso: string,
): TeachProgress {
  return {
    learnerId,
    packId: pack.id,
    packSlug: pack.slug,
    currentIndex: 0,
    completedPromptIds: [],
    attemptCount: 0,
    strongCount: 0,
    partialCount: 0,
    weakCount: 0,
    checklistCoverageSum: 0,
    kuStats: [],
    lastResult: null,
    updatedAt: nowIso,
  };
}

export function applyTeachGradeToProgress(
  progress: TeachProgress,
  prompt: TeachPrompt,
  grade: TeachGrade,
  nowIso: string,
): TeachProgress {
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
    currentIndex: Math.min(completed.length, progress.currentIndex + 1),
    completedPromptIds: completed,
    attemptCount: progress.attemptCount + 1,
    strongCount: progress.strongCount + (grade.result === "strong" ? 1 : 0),
    partialCount: progress.partialCount + (grade.result === "partial" ? 1 : 0),
    weakCount: progress.weakCount + (grade.result === "weak" ? 1 : 0),
    checklistCoverageSum: progress.checklistCoverageSum + grade.checklistCoverage,
    kuStats: [...kuMap.values()],
    lastResult: grade.result,
    updatedAt: nowIso,
  };
}

export function averageTeachCoverage(progress: TeachProgress): number | null {
  if (progress.attemptCount === 0) return null;
  return Math.round(
    (progress.checklistCoverageSum / progress.attemptCount) * 100,
  );
}
