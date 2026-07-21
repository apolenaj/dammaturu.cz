import { z } from "zod";

/**
 * Beta tester feedback (Beta 1.0) — privacy-safe product feedback.
 * No free-text PII beyond optional short notes.
 */

export const betaFeedbackSchema = z.object({
  id: z.string().uuid(),
  learnerKey: z.string().min(1).max(64),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  at: z.string().datetime(),
  confusingCs: z.string().min(0).max(500).default(""),
  boringCs: z.string().min(0).max(500).default(""),
  helpedMostCs: z.string().min(0).max(500).default(""),
  brokenCs: z.string().min(0).max(500).default(""),
  changeWishCs: z.string().min(0).max(500).default(""),
});

export type BetaFeedback = z.infer<typeof betaFeedbackSchema>;

export const betaFeedbackPromptCs = {
  titleCs: "Rychlý feedback",
  subtitleCs: "Pomáhá vylepšit DámMaturu — 1–2 věty stačí.",
  confusingCs: "Co bylo matoucí?",
  boringCs: "Co bylo nudné?",
  helpedMostCs: "Co ti nejvíc pomohlo?",
  brokenCs: "Co nefungovalo?",
  changeWishCs: "Co bys změnil/a?",
  submitCs: "Odeslat feedback",
  thanksCs: "Díky — uloženo.",
} as const;

/**
 * Before/after learning report for private beta (31. 8. 2026).
 */
export const diagnosticBaselineSchema = z.object({
  completedAt: z.string().datetime(),
  attempts: z.number().int().min(0),
  correct: z.number().int().min(0),
  accuracyPct: z.number().min(0).max(100),
  readinessPct: z.number().min(0).max(100).nullable(),
  packSlug: z.string().min(1).max(120),
});

export type DiagnosticBaseline = z.infer<typeof diagnosticBaselineSchema>;

export type BeforeAfterReport = {
  generatedAt: string;
  targetDate: string;
  displayName: string;
  diagnosticBaseline: DiagnosticBaseline | null;
  finalMasteryPct: number | null;
  accuracyImprovementPct: number | null;
  /** Retention proxy: share of review ratings ≥ 3 (0–100) or null. */
  retentionProxyPct: number | null;
  topicsMastered: Array<{ id: string; title: string; score: number }>;
  studyTimeMinutes: number;
  weaknessesRemaining: Array<{ labelCs: string; pct: number }>;
  summaryCs: string;
};

export function buildBeforeAfterReport(input: {
  displayName: string;
  targetDate: string;
  baseline: DiagnosticBaseline | null;
  finalMasteryPct: number | null;
  recentAccuracyPct: number | null;
  retentionProxyPct: number | null;
  topicsMastered: Array<{ id: string; title: string; score: number }>;
  studyTimeMinutes: number;
  weaknessesRemaining: Array<{ labelCs: string; pct: number }>;
  nowIso?: string;
}): BeforeAfterReport {
  const nowIso = input.nowIso ?? new Date().toISOString();
  let accuracyImprovementPct: number | null = null;
  if (
    input.baseline != null &&
    input.recentAccuracyPct != null &&
    Number.isFinite(input.baseline.accuracyPct)
  ) {
    accuracyImprovementPct = Math.round(
      input.recentAccuracyPct - input.baseline.accuracyPct,
    );
  }

  let summaryCs = "Zatím málo dat pro before/after.";
  if (input.baseline && input.finalMasteryPct != null) {
    const delta =
      input.baseline.readinessPct != null
        ? Math.round(input.finalMasteryPct - input.baseline.readinessPct)
        : null;
    summaryCs =
      delta == null
        ? `Baseline accuracy ${input.baseline.accuracyPct} % · aktuální mastery ${input.finalMasteryPct} %.`
        : `Mastery ${delta >= 0 ? "+" : ""}${delta} p.b. od diagnostiky (${input.baseline.readinessPct} % → ${input.finalMasteryPct} %).`;
  }

  return {
    generatedAt: nowIso,
    targetDate: input.targetDate,
    displayName: input.displayName,
    diagnosticBaseline: input.baseline,
    finalMasteryPct: input.finalMasteryPct,
    accuracyImprovementPct,
    retentionProxyPct: input.retentionProxyPct,
    topicsMastered: input.topicsMastered,
    studyTimeMinutes: input.studyTimeMinutes,
    weaknessesRemaining: input.weaknessesRemaining,
    summaryCs,
  };
}
