import { z } from "zod";

/**
 * Kytice experience (D-043) — 13 balad as interactive collection + games.
 * Story briefs and evidence must come from Kytice.docx + verified QA items.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const kyticeEvidenceSchema = z.object({
  qaItemId: z.string().min(1),
  knowledgeUnitId: z.string().min(1),
  publishedStatement: z.string().min(1).max(8000),
  validationStatus: z.enum(["verified_from_source", "corrected"]),
  filename: z.literal("Kytice.docx"),
});

export type KyticeEvidence = z.infer<typeof kyticeEvidenceSchema>;

export const kyticeBalladSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(80),
  orderIndex: z.number().int().min(0).max(20),
  /** Verbatim / source-backed brief plot (from Shrnutí in SOURCE). */
  storyBrief: z.string().min(20).max(4000),
  mainConflict: z.string().min(1).max(280),
  guilt: z.string().min(1).max(280),
  punishment: z.string().min(1).max(280),
  motif: z.string().min(1).max(200),
  memorablePoint: z.string().min(1).max(280),
  evidence: kyticeEvidenceSchema,
  /** Optional link into Story Reconstruction pack story slug. */
  storyReconstructionSlug: z.string().min(1).max(120).nullable(),
});

export type KyticeBallad = z.infer<typeof kyticeBalladSchema>;

export const kyticeRecognizeItemSchema = z.object({
  id: z.string().min(1).max(64),
  balladSlug: slugSchema,
  promptStory: z.string().min(20).max(1200),
  options: z.array(z.string().min(1).max(80)).length(4),
  correctIndex: z.number().int().min(0).max(3),
});

export const kyticeGuiltMatchPairSchema = z.object({
  id: z.string().min(1).max(64),
  balladSlug: slugSchema,
  guilt: z.string().min(1).max(280),
  punishment: z.string().min(1).max(280),
});

export const kyticeWhichBalladItemSchema = z.object({
  id: z.string().min(1).max(64),
  balladSlug: slugSchema,
  clue: z.string().min(1).max(400),
  options: z.array(z.string().min(1).max(80)).length(4),
  correctIndex: z.number().int().min(0).max(3),
});

export const kyticeGamesSchema = z.object({
  recognizeByStory: z.array(kyticeRecognizeItemSchema).min(5).max(20),
  matchGuiltConsequence: z.array(kyticeGuiltMatchPairSchema).min(5).max(16),
  whichBallad: z.array(kyticeWhichBalladItemSchema).min(5).max(20),
});

export type KyticeGames = z.infer<typeof kyticeGamesSchema>;

export const kyticeExperiencePackSchema = z.object({
  id: z.string().uuid(),
  slug: z.literal("kytice"),
  title: z.string().min(1).max(160),
  author: z.string().min(1).max(120),
  summary: z.string().min(1).max(500),
  themeCs: z.string().min(1).max(200),
  motifOverviewCs: z.string().min(1).max(300),
  sourceFilename: z.literal("Kytice.docx"),
  literaryWorkHref: z.string().min(1).max(200),
  reconstructionPackHref: z.string().min(1).max(200),
  ballads: z.array(kyticeBalladSchema).length(13),
  games: kyticeGamesSchema,
  requiresVerifiedOnly: z.literal(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type KyticeExperiencePack = z.infer<typeof kyticeExperiencePackSchema>;

export function parseKyticeExperiencePack(raw: unknown): KyticeExperiencePack {
  return kyticeExperiencePackSchema.parse(raw);
}

export const kyticeGameModeLabelsCs = {
  collection: "13 balad",
  recognize: "Poznej baladu podle příběhu",
  match: "Spoj provinění s následkem",
  which: "Která balada?",
  reconstruction: "Story reconstruction",
} as const;

export type KyticeGameMode = keyof typeof kyticeGameModeLabelsCs;

/** Canonical order from SOURCE list (úvodní Kytice last in list, we put first). */
export const KYTICE_BALLAD_ORDER = [
  "kytice",
  "vodnik",
  "polednice",
  "zahorovo-loze",
  "stedry-den",
  "holoubek",
  "lilie",
  "vestkyne",
  "svatebni-kosile",
  "vrba",
  "zlaty-kolovrat",
  "dcerina-kletba",
  "poklad",
] as const;

export type KyticeBalladSlug = (typeof KYTICE_BALLAD_ORDER)[number];

/** SOURCE header titles as they appear under Shrnutí. */
export const KYTICE_SOURCE_HEADERS: Record<KyticeBalladSlug, string> = {
  kytice: "Kytice",
  vodnik: "Vodník",
  polednice: "Polednice",
  "zahorovo-loze": "Záhořovo lože",
  "stedry-den": "Štědrý den",
  holoubek: "Holoubek",
  lilie: "Lilie",
  vestkyne: "Věštkyně (Úlomky)",
  "svatebni-kosile": "Svatební košile",
  vrba: "Vrba",
  "zlaty-kolovrat": "Zlatý kolovrat",
  "dcerina-kletba": "Dceřina kletba",
  poklad: "Poklad",
};

export function extractBalladSummaryFromSource(
  plainText: string,
  header: string,
  allHeaders: string[],
): string {
  const marker = `\n${header}\n`;
  const start = plainText.indexOf(marker);
  if (start < 0) {
    throw new Error(`SOURCE shrnutí nenalezeno pro „${header}“`);
  }
  const from = start + marker.length;
  let end = plainText.length;
  for (const other of allHeaders) {
    if (other === header) continue;
    const p = plainText.indexOf(`\n${other}\n`, from);
    if (p >= 0 && p < end) end = p;
  }
  return plainText.slice(from, end).replace(/\s+/g, " ").trim();
}

export function truncateStoryClue(story: string, max = 160): string {
  const t = story.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function buildRecognizeGame(
  ballads: KyticeBallad[],
): KyticeGames["recognizeByStory"] {
  const titles = ballads.map((b) => b.title);
  return ballads.slice(0, 12).map((b, i) => {
    const distractors = titles.filter((t) => t !== b.title);
    const options = shuffleStable(
      [b.title, ...distractors.slice(i % distractors.length, (i % distractors.length) + 3)].slice(0, 4),
      b.slug,
    );
    // ensure 4 unique
    const uniq = [...new Set(options)];
    while (uniq.length < 4) {
      const extra = distractors.find((d) => !uniq.includes(d));
      if (!extra) break;
      uniq.push(extra);
    }
    const correctIndex = uniq.indexOf(b.title);
    return {
      id: `recognize-${b.slug}`,
      balladSlug: b.slug,
      promptStory: truncateStoryClue(b.storyBrief, 200),
      options: uniq.slice(0, 4),
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
    };
  });
}

export function buildGuiltMatchGame(
  ballads: KyticeBallad[],
): KyticeGames["matchGuiltConsequence"] {
  return ballads
    .filter((b) => b.slug !== "vestkyne") // prophecy fragment — weak guilt/punishment pair
    .slice(0, 12)
    .map((b) => ({
      id: `match-${b.slug}`,
      balladSlug: b.slug,
      guilt: b.guilt,
      punishment: b.punishment,
    }));
}

export function buildWhichBalladGame(
  ballads: KyticeBallad[],
): KyticeGames["whichBallad"] {
  const titles = ballads.map((b) => b.title);
  return ballads.slice(0, 12).map((b, i) => {
    const distractors = titles.filter((t) => t !== b.title);
    const options = [
      b.title,
      distractors[(i + 1) % distractors.length]!,
      distractors[(i + 3) % distractors.length]!,
      distractors[(i + 5) % distractors.length]!,
    ];
    const shuffled = shuffleStable(options, `which-${b.slug}`);
    return {
      id: `which-${b.slug}`,
      balladSlug: b.slug,
      clue: `${b.mainConflict} · Motiv: ${b.motif}`,
      options: shuffled,
      correctIndex: shuffled.indexOf(b.title),
    };
  });
}

function shuffleStable<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function gradeRecognize(
  item: KyticeGames["recognizeByStory"][number],
  choiceIndex: number,
): boolean {
  return choiceIndex === item.correctIndex;
}

export function gradeWhichBallad(
  item: KyticeGames["whichBallad"][number],
  choiceIndex: number,
): boolean {
  return choiceIndex === item.correctIndex;
}

export function gradeGuiltMatch(
  pairs: KyticeGames["matchGuiltConsequence"],
  mapping: Record<string, string>,
): { correct: number; total: number; perfect: boolean } {
  let correct = 0;
  for (const p of pairs) {
    if (mapping[p.id] === p.punishment) correct += 1;
  }
  return {
    correct,
    total: pairs.length,
    perfect: correct === pairs.length,
  };
}
