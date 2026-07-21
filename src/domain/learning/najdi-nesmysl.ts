import { z } from "zod";

/**
 * „Najdi nesmysl“ — 3 true + 1 false statements (D-029).
 * Student picks the nonsense and explains why; always then see the real explanation.
 * False statements must be realistic distractors with a clear corrective explanation
 * so they never stick as “false knowledge”.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const nonsenseCategories = [
  "author",
  "work",
  "period",
  "movement",
  "character",
  "genre",
] as const;

export type NonsenseCategory = (typeof nonsenseCategories)[number];

export const nonsenseCategorySchema = z.enum(nonsenseCategories);

export const nonsenseStatementSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(12).max(320),
  /** Exactly one statement per round is false. */
  isTrue: z.boolean(),
});

export type NonsenseStatement = z.infer<typeof nonsenseStatementSchema>;

export const nonsenseRoundSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  category: nonsenseCategorySchema,
  /** Short prompt above the four claims. */
  stem: z.string().min(1).max(200).default("Které tvrzení je nesmysl?"),
  statements: z.array(nonsenseStatementSchema).length(4),
  /**
   * Shown after submit — corrects the false claim and anchors the three truths.
   * Must be long enough to prevent sticky misconceptions.
   */
  explanation: z.string().min(80).max(1200),
  /** Optional short notes per true statement id (reinforce correct facts). */
  trueNotes: z.record(z.string(), z.string().min(1).max(240)).default({}),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
});

export type NonsenseRound = z.infer<typeof nonsenseRoundSchema>;

export const nonsensePackSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  rounds: z.array(nonsenseRoundSchema).min(6).max(80),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type NonsensePack = z.infer<typeof nonsensePackSchema>;

export const nonsenseAttemptSchema = z.object({
  roundId: z.string().uuid(),
  selectedStatementId: z.string().uuid(),
  studentReason: z.string().min(1).max(800),
  pickCorrect: z.boolean(),
  reasonQuality: z.enum(["thin", "ok", "strong"]),
  at: z.string().datetime(),
});

export type NonsenseAttempt = z.infer<typeof nonsenseAttemptSchema>;

export const nonsenseProgressSchema = z.object({
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  attempts: z.array(nonsenseAttemptSchema),
  solvedRoundIds: z.array(z.string().uuid()),
  updatedAt: z.string().datetime(),
});

export type NonsenseProgress = z.infer<typeof nonsenseProgressSchema>;

export const nonsenseCategoryLabelsCs: Record<NonsenseCategory, string> = {
  author: "Autoři",
  work: "Díla",
  period: "Období",
  movement: "Literární směry",
  character: "Postavy",
  genre: "Žánry",
};

export function parseNonsensePack(raw: unknown): NonsensePack {
  const pack = nonsensePackSchema.parse(raw);
  const slugs = new Set<string>();
  for (const round of pack.rounds) {
    if (slugs.has(round.slug)) {
      throw new Error(`Duplicitní round slug: ${round.slug}`);
    }
    slugs.add(round.slug);
    const falseCount = round.statements.filter((s) => !s.isTrue).length;
    if (falseCount !== 1) {
      throw new Error(
        `Round ${round.slug}: očekáváno přesně 1 chybné tvrzení, je ${falseCount}`,
      );
    }
    if (round.explanation.trim().length < 80) {
      throw new Error(`Round ${round.slug}: explanation příliš krátké`);
    }
    const ids = new Set(round.statements.map((s) => s.id));
    for (const noteId of Object.keys(round.trueNotes)) {
      if (!ids.has(noteId)) {
        throw new Error(`Round ${round.slug}: trueNotes id ${noteId} neexistuje`);
      }
      const st = round.statements.find((s) => s.id === noteId);
      if (st && !st.isTrue) {
        throw new Error(
          `Round ${round.slug}: trueNotes nesmí mířit na chybné tvrzení`,
        );
      }
    }
  }
  return pack;
}

export function getNonsenseStatement(
  round: NonsenseRound,
): NonsenseStatement {
  const found = round.statements.find((s) => !s.isTrue);
  if (!found) throw new Error(`Round ${round.slug}: chybí nesmysl`);
  return found;
}

/** Keywords from explanation used to lightly score student reason. */
export function extractReasonKeywords(explanation: string): string[] {
  return explanation
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 5)
    .filter(
      (w) =>
        ![
          "ktery",
          "ktera",
          "proto",
          "protoze",
          "takze",
          "tedy",
          "nebo",
          "jsou",
          "bylo",
          "byla",
          "tento",
          "tato",
          "jejich",
          "mezi",
          "take",
          "také",
        ].includes(w),
    )
    .slice(0, 24);
}

export function scoreStudentReason(
  reason: string,
  explanation: string,
): "thin" | "ok" | "strong" {
  const trimmed = reason.trim();
  if (trimmed.length < 20) return "thin";
  const reasonNorm = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const hits = extractReasonKeywords(explanation).filter((kw) =>
    reasonNorm.includes(kw),
  ).length;
  if (hits >= 3 && trimmed.length >= 60) return "strong";
  if (hits >= 1 || trimmed.length >= 40) return "ok";
  return "thin";
}

export type NonsenseGrade = {
  pickCorrect: boolean;
  reasonQuality: "thin" | "ok" | "strong";
  nonsense: NonsenseStatement;
  explanation: string;
  trueNotes: Array<{ statementId: string; text: string; note: string }>;
  headline: string;
};

export function gradeNonsenseRound(input: {
  round: NonsenseRound;
  selectedStatementId: string;
  studentReason: string;
}): NonsenseGrade {
  const nonsense = getNonsenseStatement(input.round);
  const pickCorrect = input.selectedStatementId === nonsense.id;
  const reasonQuality = scoreStudentReason(
    input.studentReason,
    input.round.explanation,
  );
  const trueNotes = input.round.statements
    .filter((s) => s.isTrue)
    .map((s) => ({
      statementId: s.id,
      text: s.text,
      note: input.round.trueNotes[s.id] ?? "",
    }));

  let headline: string;
  if (pickCorrect) {
    headline =
      reasonQuality === "strong"
        ? "Správně — a tvé zdůvodnění sedí."
        : reasonQuality === "ok"
          ? "Správně odhalený nesmysl."
          : "Správně odhalený nesmysl — doplň si ale vysvětlení níže.";
  } else {
    headline = "Tohle tvrzení není nesmysl — podívej se na vysvětlení.";
  }

  return {
    pickCorrect,
    reasonQuality,
    nonsense,
    explanation: input.round.explanation,
    trueNotes,
    headline,
  };
}

export function emptyNonsenseProgress(
  learnerId: string,
  pack: NonsensePack,
  nowIso: string,
): NonsenseProgress {
  return {
    learnerId,
    packId: pack.id,
    packSlug: pack.slug,
    attempts: [],
    solvedRoundIds: [],
    updatedAt: nowIso,
  };
}

export function applyNonsenseAttempt(
  progress: NonsenseProgress,
  attempt: NonsenseAttempt,
  nowIso: string,
): NonsenseProgress {
  const solved = new Set(progress.solvedRoundIds);
  if (attempt.pickCorrect) solved.add(attempt.roundId);
  return {
    ...progress,
    attempts: [...progress.attempts, attempt],
    solvedRoundIds: [...solved],
    updatedAt: nowIso,
  };
}

export function shuffleStatements<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export const reasonQualityLabelsCs: Record<
  "thin" | "ok" | "strong",
  string
> = {
  thin: "Slabé zdůvodnění",
  ok: "Srozumitelné zdůvodnění",
  strong: "Silné zdůvodnění",
};
