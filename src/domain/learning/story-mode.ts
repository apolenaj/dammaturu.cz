import { z } from "zod";

/**
 * Story Mode — literary history as cause→effect narrative.
 * Every displayed fact must resolve from a verified QA FINAL.
 * Never invent fictional historical facts.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** Pointer to Content QA item that must be verified/corrected. */
export const storyEvidenceSchema = z.object({
  qaItemId: z.string().min(1),
  knowledgeUnitId: z.string().min(1),
  /** Snapshot of publishedStatement at pack build — must match live FINAL. */
  publishedStatement: z.string().min(1).max(2000),
  validationStatus: z.enum(["verified_from_source", "corrected"]),
  filename: z.string().min(1),
});

export type StoryEvidence = z.infer<typeof storyEvidenceSchema>;

const checkSchema = z.object({
  question: z.string().min(1).max(240),
  choices: z.array(z.string().min(1).max(200)).min(2).max(4),
  correctIndex: z.number().int().min(0),
  /** Correct choice must be grounded in evidence (not invented). */
  evidenceIds: z.array(z.string().min(1)).min(1),
  explanationEvidenceIds: z.array(z.string().min(1)).default([]),
});

export const timelineBeatSchema = z.object({
  type: z.literal("timeline"),
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  /** Label on the timeline (e.g. „70. léta 18. stol.“) — from evidence. */
  eraLabelEvidenceId: z.string().min(1),
  bodyEvidenceIds: z.array(z.string().min(1)).min(1).max(4),
});

export const causeEffectBeatSchema = z.object({
  type: z.literal("cause_effect"),
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  causeEvidenceIds: z.array(z.string().min(1)).min(1).max(3),
  effectEvidenceIds: z.array(z.string().min(1)).min(1).max(3),
});

export const personCardBeatSchema = z.object({
  type: z.literal("person_card"),
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  /** Name must appear inside evidence text (verified). */
  nameEvidenceId: z.string().min(1),
  roleEvidenceIds: z.array(z.string().min(1)).min(1).max(3),
});

export const whatNextBeatSchema = z.object({
  type: z.literal("what_next"),
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  prompt: z.string().min(1).max(200),
  /** Options: only the correct one is backed by evidence; distractors are marked. */
  options: z
    .array(
      z.object({
        label: z.string().min(1).max(220),
        isCorrect: z.boolean(),
        evidenceIds: z.array(z.string().min(1)).default([]),
      }),
    )
    .min(2)
    .max(4),
});

export const decisionMomentBeatSchema = z.object({
  type: z.literal("decision_moment"),
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  situationEvidenceIds: z.array(z.string().min(1)).min(1).max(3),
  /** Historical outcome that followed (verified). */
  outcomeEvidenceIds: z.array(z.string().min(1)).min(1).max(3),
  reflectionPrompt: z.string().min(1).max(240),
});

export const storyCheckpointBeatSchema = z.object({
  type: z.literal("checkpoint"),
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  items: z.array(checkSchema).min(2).max(4),
});

export const storyBeatSchema = z.discriminatedUnion("type", [
  timelineBeatSchema,
  causeEffectBeatSchema,
  personCardBeatSchema,
  whatNextBeatSchema,
  decisionMomentBeatSchema,
  storyCheckpointBeatSchema,
]);

export type StoryBeat = z.infer<typeof storyBeatSchema>;

export const storyPackSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  topicSlug: z.string().min(1).max(120),
  curriculumSlug: z.string().min(1).max(120),
  summary: z.string().min(1).max(500),
  /** All evidence keyed by local evidence id used in beats. */
  evidence: z.record(z.string(), storyEvidenceSchema),
  beats: z.array(storyBeatSchema).min(5).max(24),
  requiresVerifiedOnly: z.literal(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type StoryPack = z.infer<typeof storyPackSchema>;

export const storyProgressSchema = z.object({
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  currentBeatIndex: z.number().int().min(0),
  completedBeatIds: z.array(z.string().uuid()),
  checksAnswered: z.number().int().min(0),
  checksCorrect: z.number().int().min(0),
  status: z.enum(["in_progress", "completed", "abandoned"]),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});

export type StoryProgress = z.infer<typeof storyProgressSchema>;

export function collectEvidenceIds(beat: StoryBeat): string[] {
  switch (beat.type) {
    case "timeline":
      return [beat.eraLabelEvidenceId, ...beat.bodyEvidenceIds];
    case "cause_effect":
      return [...beat.causeEvidenceIds, ...beat.effectEvidenceIds];
    case "person_card":
      return [beat.nameEvidenceId, ...beat.roleEvidenceIds];
    case "what_next":
      return beat.options.flatMap((o) => o.evidenceIds);
    case "decision_moment":
      return [...beat.situationEvidenceIds, ...beat.outcomeEvidenceIds];
    case "checkpoint":
      return beat.items.flatMap((i) => [
        ...i.evidenceIds,
        ...i.explanationEvidenceIds,
      ]);
    default: {
      const _e: never = beat;
      return _e;
    }
  }
}

/**
 * Structural + provenance integrity.
 * Throws if any beat references missing evidence or invents ungrounded correct answers.
 */
export function assertStoryPackIntegrity(pack: StoryPack): void {
  if (!pack.requiresVerifiedOnly) {
    throw new Error("Story Mode vyžaduje requiresVerifiedOnly=true.");
  }

  const types = new Set(pack.beats.map((b) => b.type));
  for (const required of [
    "timeline",
    "cause_effect",
    "person_card",
    "what_next",
    "decision_moment",
    "checkpoint",
  ] as const) {
    if (!types.has(required)) {
      throw new Error(`Story pack ${pack.slug}: chybí beat typu ${required}.`);
    }
  }

  for (const [eid, ev] of Object.entries(pack.evidence)) {
    storyEvidenceSchema.parse(ev);
    if (
      ev.validationStatus !== "verified_from_source" &&
      ev.validationStatus !== "corrected"
    ) {
      throw new Error(
        `Evidence ${eid}: status ${ev.validationStatus} — Story Mode povoluje jen verified/corrected.`,
      );
    }
  }

  for (const beat of pack.beats) {
    for (const eid of collectEvidenceIds(beat)) {
      if (!pack.evidence[eid]) {
        throw new Error(
          `Beat ${beat.id} odkazuje na neexistující evidence ${eid}.`,
        );
      }
    }
    if (beat.type === "what_next") {
      const correct = beat.options.filter((o) => o.isCorrect);
      if (correct.length !== 1) {
        throw new Error(`what_next ${beat.id}: právě 1 správná volba.`);
      }
      if (correct[0]!.evidenceIds.length < 1) {
        throw new Error(
          `what_next ${beat.id}: správná volba musí mít evidence (žádná fikce).`,
        );
      }
      for (const opt of beat.options) {
        if (!opt.isCorrect && opt.evidenceIds.length > 0) {
          throw new Error(
            `what_next ${beat.id}: distraktor nesmí předstírat verified evidence.`,
          );
        }
      }
    }
    if (beat.type === "person_card") {
      const nameEv = pack.evidence[beat.nameEvidenceId]!;
      // Name should appear in the verified statement (prevents orphan labels)
      const nameHint = beat.title;
      if (
        nameHint.length >= 3 &&
        !nameEv.publishedStatement
          .toLowerCase()
          .includes(nameHint.toLowerCase().slice(0, 8))
      ) {
        // title may be Czech "Josef Dobrovský" — check first token
        const token = nameHint.split(/\s+/)[0] ?? "";
        if (
          token.length >= 4 &&
          !nameEv.publishedStatement.toLowerCase().includes(token.toLowerCase())
        ) {
          throw new Error(
            `person_card ${beat.id}: jméno „${nameHint}“ není ve verified evidence.`,
          );
        }
      }
    }
  }
}

export function parseStoryPack(raw: unknown): StoryPack {
  const pack = storyPackSchema.parse(raw);
  assertStoryPackIntegrity(pack);
  return pack;
}

export function resolveEvidenceText(
  pack: StoryPack,
  evidenceIds: string[],
): string[] {
  return evidenceIds.map((id) => {
    const ev = pack.evidence[id];
    if (!ev) throw new Error(`Chybí evidence ${id}`);
    return ev.publishedStatement;
  });
}

/**
 * UI-safe evidence resolve — never throws during render.
 * Missing ids are skipped (pack integrity still enforced at seed time).
 */
export function safeResolveEvidenceText(
  pack: StoryPack,
  evidenceIds: string[],
): string[] {
  const out: string[] = [];
  for (const id of evidenceIds) {
    const ev = pack.evidence[id];
    if (ev?.publishedStatement) out.push(ev.publishedStatement);
  }
  return out;
}
