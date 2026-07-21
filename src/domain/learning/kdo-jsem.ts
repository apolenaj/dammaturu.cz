import { z } from "zod";

/**
 * „Kdo jsem?“ — progressive hints from verified QA FINALs only.
 * Earlier correct guess → higher score. No invented facts.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const hintCategories = [
  "role",
  "work",
  "trait",
  "context",
] as const;

export type HintCategory = (typeof hintCategories)[number];

export const kdoJsemEvidenceSchema = z.object({
  qaItemId: z.string().min(1),
  knowledgeUnitId: z.string().min(1),
  publishedStatement: z.string().min(1).max(4000),
  validationStatus: z.enum(["verified_from_source", "corrected"]),
  filename: z.string().min(1).max(260),
});

export type KdoJsemEvidence = z.infer<typeof kdoJsemEvidenceSchema>;

export const kdoJsemHintSchema = z.object({
  id: z.string().uuid(),
  order: z.number().int().min(0).max(7),
  category: z.enum(hintCategories),
  /** Student-facing clue (name redacted mechanically from FINAL). */
  displayText: z.string().min(1).max(500),
  evidenceId: z.string().min(1).max(80),
});

export type KdoJsemHint = z.infer<typeof kdoJsemHintSchema>;

export const kdoJsemMysterySchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  answerName: z.string().min(1).max(120),
  answerAliases: z.array(z.string().min(1).max(120)).min(1).max(12),
  hints: z.array(kdoJsemHintSchema).min(3).max(6),
  knowledgeUnitIds: z.array(z.string().min(1)).min(1).max(12),
});

export type KdoJsemMystery = z.infer<typeof kdoJsemMysterySchema>;

export const kdoJsemPackSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  requiresVerifiedOnly: z.literal(true),
  mysteries: z.array(kdoJsemMysterySchema).min(3).max(40),
  evidence: z.record(z.string(), kdoJsemEvidenceSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type KdoJsemPack = z.infer<typeof kdoJsemPackSchema>;

export const kdoJsemProgressSchema = z.object({
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  solvedMysteryIds: z.array(z.string().uuid()),
  totalScore: z.number().int().min(0),
  attempts: z.number().int().min(0),
  earlySolves: z.number().int().min(0),
  updatedAt: z.string().datetime(),
});

export type KdoJsemProgress = z.infer<typeof kdoJsemProgressSchema>;

export const hintCategoryLabelsCs: Record<HintCategory, string> = {
  role: "Byl/a jsem představitel…",
  work: "Mé dílo…",
  trait: "Typický znak…",
  context: "Historická souvislost…",
};

export function pointsForHintCount(
  hintsRevealed: number,
  maxHints = 4,
): number {
  if (hintsRevealed < 1) return 0;
  return Math.max(1, maxHints - hintsRevealed + 1);
}

export function normalizeGuess(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCorrectGuess(
  mystery: KdoJsemMystery,
  guess: string,
): boolean {
  const g = normalizeGuess(guess);
  if (g.length < 2) return false;
  const aliases = [mystery.answerName, ...mystery.answerAliases].map(
    normalizeGuess,
  );
  return aliases.some((a) => g === a || g.includes(a) || a.includes(g));
}

export function redactNameFromStatement(
  statement: string,
  names: string[],
): string {
  let out = statement;
  const sorted = [...names].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    if (name.trim().length < 2) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "gi"), "…");
  }
  return out.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
}

export function parseKdoJsemPack(raw: unknown): KdoJsemPack {
  const pack = kdoJsemPackSchema.parse(raw);
  if (!pack.requiresVerifiedOnly) {
    throw new Error("Pack musí mít requiresVerifiedOnly: true");
  }
  for (const ev of Object.values(pack.evidence)) {
    if (
      ev.validationStatus !== "verified_from_source" &&
      ev.validationStatus !== "corrected"
    ) {
      throw new Error(`Evidence ${ev.qaItemId} není verified`);
    }
    if (!ev.publishedStatement.trim()) {
      throw new Error(`Evidence ${ev.qaItemId} bez FINAL`);
    }
  }
  for (const m of pack.mysteries) {
    for (const h of m.hints) {
      const ev = pack.evidence[h.evidenceId];
      if (!ev) {
        throw new Error(`Mystery ${m.slug}: chybí evidence ${h.evidenceId}`);
      }
      const finalNorm = normalizeGuess(ev.publishedStatement);
      const displayNorm = normalizeGuess(h.displayText.replace(/…/g, " "));
      const tokens = displayNorm.split(" ").filter((t) => t.length >= 4);
      const grounded =
        finalNorm.includes(displayNorm) ||
        (tokens.length > 0 &&
          tokens.filter((t) => finalNorm.includes(t)).length >=
            Math.ceil(tokens.length * 0.6));
      if (!grounded) {
        throw new Error(
          `Mystery ${m.slug} hint ${h.order}: displayText není zakotvený ve verified FINAL`,
        );
      }
    }
  }
  return pack;
}

export function emptyKdoJsemProgress(
  learnerId: string,
  pack: KdoJsemPack,
  nowIso: string,
): KdoJsemProgress {
  return {
    learnerId,
    packId: pack.id,
    packSlug: pack.slug,
    solvedMysteryIds: [],
    totalScore: 0,
    attempts: 0,
    earlySolves: 0,
    updatedAt: nowIso,
  };
}

export function applySolveToProgress(
  progress: KdoJsemProgress,
  mysteryId: string,
  points: number,
  hintsRevealed: number,
  nowIso: string,
): KdoJsemProgress {
  const already = progress.solvedMysteryIds.includes(mysteryId);
  return {
    ...progress,
    solvedMysteryIds: already
      ? progress.solvedMysteryIds
      : [...progress.solvedMysteryIds, mysteryId],
    totalScore: progress.totalScore + (already ? 0 : points),
    attempts: progress.attempts + 1,
    earlySolves:
      progress.earlySolves + (!already && hintsRevealed <= 2 ? 1 : 0),
    updatedAt: nowIso,
  };
}
