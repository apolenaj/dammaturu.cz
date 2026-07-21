import { z } from "zod";

/**
 * CERMAT ČJL didactic preparation (D-055).
 * Structured by skill categories of the common Czech maturity didactic test.
 * Items in this product are exam-style generated practice — NEVER presented as
 * official CERMAT past papers unless provenance = official_past with a real source.
 */

export const cermatCategories = [
  "language",
  "orthography",
  "morphology",
  "syntax",
  "word_meaning",
  "text_comprehension",
  "literary_knowledge",
  "work_with_text",
] as const;

export type CermatCategory = (typeof cermatCategories)[number];

export const cermatCategoryLabelsCs: Record<CermatCategory, string> = {
  language: "Jazyk a styl",
  orthography: "Pravopis",
  morphology: "Tvarosloví (morfologie)",
  syntax: "Skladba (syntax)",
  word_meaning: "Význam slov",
  text_comprehension: "Porozumění textu",
  literary_knowledge: "Literární znalosti",
  work_with_text: "Práce s textem",
};

export const cermatCategoryHintsCs: Record<CermatCategory, string> = {
  language: "Funkční styly, spisovnost, vhodnost formulací.",
  orthography: "I/Y, předložky, velká písmena, interpunkce.",
  morphology: "Slovní druhy, tvary, shoda, stupňování.",
  syntax: "Větná stavba, větné členy, souvětí.",
  word_meaning: "Synonyma, antonyma, homonyma, význam v kontextu.",
  text_comprehension: "Hlavní myšlenka, inference, vztah částí textu.",
  literary_knowledge: "Směry, žánry, autoři — v testové podobě (ne ústní seznam).",
  work_with_text: "Úpravy, doplňování, práce s úryvkem.",
};

export const cermatItemProvenances = [
  "exam_style_generated",
  "official_past",
] as const;

export type CermatItemProvenance = (typeof cermatItemProvenances)[number];

export const cermatProvenanceLabelsCs: Record<CermatItemProvenance, string> = {
  exam_style_generated:
    "Cvičná otázka ve stylu didaktického testu — není oficiální CERMAT zadání.",
  official_past: "Oficiální / minulé CERMAT zadání (ověřený zdroj).",
};

export const cermatSessionModes = [
  "timed_simulation",
  "untimed_training",
  "weak_category",
] as const;

export type CermatSessionMode = (typeof cermatSessionModes)[number];

export const cermatSessionModeLabelsCs: Record<CermatSessionMode, string> = {
  timed_simulation: "Časovaná simulace",
  untimed_training: "Trénink bez limitu",
  weak_category: "Trénink slabých kategorií",
};

export const cermatSessionModeHintsCs: Record<CermatSessionMode, string> = {
  timed_simulation:
    "Mix kategorií s odpočtem — nácvik tempa didaktického testu.",
  untimed_training: "Klidné procvičení s vysvětlením po každé odpovědi.",
  weak_category: "Priorita kategorií, kde máš nejnižší úspěšnost.",
};

export const cermatItemFormats = [
  "single_choice",
  "true_false",
  "error_spotting",
  "fill_blank",
] as const;

export type CermatItemFormat = (typeof cermatItemFormats)[number];

const optionSchema = z.object({
  id: z.string().min(1).max(8),
  labelCs: z.string().min(1).max(400),
});

export const cermatItemSchema = z.object({
  id: z.string().min(1).max(64),
  category: z.enum(cermatCategories),
  format: z.enum(cermatItemFormats),
  stemCs: z.string().min(1).max(1200),
  /** Optional passage for comprehension / work-with-text. */
  passageCs: z.string().max(2000).nullable(),
  options: z.array(optionSchema).min(2).max(6).optional(),
  /** Option id, boolean string, blank answers, or error option id. */
  correctAnswer: z.union([
    z.string().min(1).max(120),
    z.array(z.string().min(1).max(80)).min(1).max(4),
  ]),
  explanationCs: z.string().min(40).max(800),
  difficulty: z.number().int().min(1).max(5),
  provenance: z.enum(cermatItemProvenances),
  provenanceLabelCs: z.string().min(1).max(200),
  /** Human-readable source note (curriculum / pedagogy), never “official CERMAT” unless true. */
  sourceNoteCs: z.string().min(1).max(200),
});

export type CermatItem = z.infer<typeof cermatItemSchema>;

export const cermatPackSchema = z.object({
  id: z.string().min(1).max(64),
  slug: z.literal("cermat-cjl-prep"),
  titleCs: z.string().min(1).max(160),
  summaryCs: z.string().min(1).max(500),
  disclaimerCs: z.string().min(1).max(500),
  timedSecondsDefault: z.number().int().min(300).max(7200),
  items: z.array(cermatItemSchema).min(8).max(200),
  updatedAt: z.string().datetime(),
});

export type CermatPack = z.infer<typeof cermatPackSchema>;

export const cermatCategoryStatsSchema = z.object({
  category: z.enum(cermatCategories),
  attempts: z.number().int().min(0),
  correct: z.number().int().min(0),
  partial: z.number().int().min(0),
  /** 0–100, null if no attempts. */
  accuracyPct: z.number().min(0).max(100).nullable(),
});

export type CermatCategoryStats = z.infer<typeof cermatCategoryStatsSchema>;

export const cermatLearnerProgressSchema = z.object({
  learnerId: z.string().min(1).max(64),
  byCategory: z.array(cermatCategoryStatsSchema).length(8),
  totalAttempts: z.number().int().min(0),
  totalCorrect: z.number().int().min(0),
  lastSessionMode: z.enum(cermatSessionModes).nullable(),
  updatedAt: z.string().datetime(),
});

export type CermatLearnerProgress = z.infer<typeof cermatLearnerProgressSchema>;

export type CermatGradeResult = "correct" | "partial" | "incorrect";

export function emptyCategoryStats(): CermatCategoryStats[] {
  return cermatCategories.map((category) => ({
    category,
    attempts: 0,
    correct: 0,
    partial: 0,
    accuracyPct: null,
  }));
}

export function emptyCermatProgress(
  learnerId: string,
  nowIso: string,
): CermatLearnerProgress {
  return {
    learnerId,
    byCategory: emptyCategoryStats(),
    totalAttempts: 0,
    totalCorrect: 0,
    lastSessionMode: null,
    updatedAt: nowIso,
  };
}

export function gradeCermatAnswer(
  item: CermatItem,
  answer: string | string[] | boolean | null,
): { result: CermatGradeResult; explanationCs: string } {
  if (answer == null || answer === "") {
    return { result: "incorrect", explanationCs: item.explanationCs };
  }

  if (item.format === "true_false") {
    const expectedBool =
      typeof item.correctAnswer === "string"
        ? item.correctAnswer === "true"
        : false;
    const actual =
      answer === true ||
      answer === "true" ||
      String(answer).toLowerCase() === "ano";
    return {
      result: actual === expectedBool ? "correct" : "incorrect",
      explanationCs: item.explanationCs,
    };
  }

  if (item.format === "fill_blank") {
    const expected = Array.isArray(item.correctAnswer)
      ? item.correctAnswer
      : [item.correctAnswer];
    const givenRaw = Array.isArray(answer)
      ? answer.join(" ")
      : String(answer);
    const g = givenRaw.toLowerCase().trim().replace(/\s+/g, " ");
    // Array answers = accepted alternatives for one blank (exact match).
    const matched = expected.some(
      (e) => g === e.toLowerCase().trim().replace(/\s+/g, " "),
    );
    return {
      result: matched ? "correct" : "incorrect",
      explanationCs: item.explanationCs,
    };
  }

  // single_choice / error_spotting
  const correct = Array.isArray(item.correctAnswer)
    ? item.correctAnswer[0]
    : item.correctAnswer;
  const given = Array.isArray(answer) ? answer[0] : String(answer);
  return {
    result: given === correct ? "correct" : "incorrect",
    explanationCs: item.explanationCs,
  };
}

export function applyAttemptToProgress(
  progress: CermatLearnerProgress,
  input: {
    category: CermatCategory;
    result: CermatGradeResult;
    mode: CermatSessionMode;
    nowIso: string;
  },
): CermatLearnerProgress {
  const byCategory = progress.byCategory.map((row) => {
    if (row.category !== input.category) return row;
    const attempts = row.attempts + 1;
    const correct = row.correct + (input.result === "correct" ? 1 : 0);
    const partial = row.partial + (input.result === "partial" ? 1 : 0);
    const scoreUnits = correct + partial * 0.5;
    return {
      ...row,
      attempts,
      correct,
      partial,
      accuracyPct: Math.round((scoreUnits / attempts) * 100),
    };
  });
  return {
    ...progress,
    byCategory,
    totalAttempts: progress.totalAttempts + 1,
    totalCorrect:
      progress.totalCorrect + (input.result === "correct" ? 1 : 0),
    lastSessionMode: input.mode,
    updatedAt: input.nowIso,
  };
}

export function weakestCategories(
  progress: CermatLearnerProgress,
  limit = 3,
): CermatCategory[] {
  const ranked = [...progress.byCategory].sort((a, b) => {
    const aa = a.accuracyPct ?? 101;
    const bb = b.accuracyPct ?? 101;
    // Prefer categories with attempts but low accuracy; then never-tried
    if (a.attempts === 0 && b.attempts === 0) return 0;
    if (a.attempts === 0) return 1;
    if (b.attempts === 0) return -1;
    return aa - bb;
  });
  return ranked.slice(0, limit).map((r) => r.category);
}

export function buildCermatSessionQueue(input: {
  pack: CermatPack;
  mode: CermatSessionMode;
  progress: CermatLearnerProgress;
  categoryFilter?: CermatCategory | null;
  limit?: number;
}): CermatItem[] {
  const limit =
    input.limit ??
    (input.mode === "timed_simulation"
      ? 12
      : input.mode === "weak_category"
        ? 8
        : 10);

  let pool = [...input.pack.items];

  if (input.mode === "weak_category") {
    const weak = weakestCategories(input.progress, 3);
    const preferred = pool.filter((i) => weak.includes(i.category));
    pool = preferred.length >= 4 ? preferred : pool;
  } else if (input.categoryFilter) {
    pool = pool.filter((i) => i.category === input.categoryFilter);
  }

  // Shuffle lightly (deterministic-ish by id for stability in tests — use Fisher-Yates with Date)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  // Timed: mix categories round-robin preference
  if (input.mode === "timed_simulation") {
    const byCat = new Map<CermatCategory, CermatItem[]>();
    for (const item of pool) {
      const list = byCat.get(item.category) ?? [];
      list.push(item);
      byCat.set(item.category, list);
    }
    const mixed: CermatItem[] = [];
    let guard = 0;
    while (mixed.length < limit && guard < 200) {
      guard += 1;
      for (const cat of cermatCategories) {
        const list = byCat.get(cat);
        if (!list?.length) continue;
        mixed.push(list.shift()!);
        if (mixed.length >= limit) break;
      }
      if ([...byCat.values()].every((l) => l.length === 0)) break;
    }
    return mixed;
  }

  return pool.slice(0, limit);
}

export type CermatHubView = {
  titleCs: string;
  summaryCs: string;
  disclaimerCs: string;
  modes: Array<{
    mode: CermatSessionMode;
    labelCs: string;
    hintCs: string;
  }>;
  categories: Array<{
    category: CermatCategory;
    labelCs: string;
    hintCs: string;
    accuracyPct: number | null;
    attempts: number;
  }>;
  weakCategories: CermatCategory[];
  itemCount: number;
  generatedOnlyNoticeCs: string;
};

export function buildCermatHubView(input: {
  pack: CermatPack;
  progress: CermatLearnerProgress;
}): CermatHubView {
  return {
    titleCs: input.pack.titleCs,
    summaryCs: input.pack.summaryCs,
    disclaimerCs: input.pack.disclaimerCs,
    modes: cermatSessionModes.map((mode) => ({
      mode,
      labelCs: cermatSessionModeLabelsCs[mode],
      hintCs: cermatSessionModeHintsCs[mode],
    })),
    categories: input.progress.byCategory.map((row) => ({
      category: row.category,
      labelCs: cermatCategoryLabelsCs[row.category],
      hintCs: cermatCategoryHintsCs[row.category],
      accuracyPct: row.accuracyPct,
      attempts: row.attempts,
    })),
    weakCategories: weakestCategories(input.progress, 3),
    itemCount: input.pack.items.length,
    generatedOnlyNoticeCs:
      "Všechny položky v tomto balíčku jsou cvičné (exam-style generated). Nejsou oficiálními CERMAT testy.",
  };
}

export const CERMAT_PREP_DISCLAIMER_CS =
  "Modul připravuje na společný didaktický test ČJL (CERMAT). Otázky zde jsou cvičné ve stylu exam-format — nejsou oficiálními zadáními CERMAT, pokud není výslovně uvedeno jinak s ověřeným zdrojem.";
