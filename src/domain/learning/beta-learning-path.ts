import { z } from "zod";
import { BETA_TARGET_DATE } from "@/domain/onboarding/schema";

/**
 * Beta learning path (D-040) — auto-generated from curriculum pack until Aug 31.
 * Phase recipes select topics by module/topic slug from the pack.
 * Components must only render the resulting view model (no topic lists in UI).
 */

export const betaPathPhaseIds = [
  "diagnostics",
  "basics",
  "world_realism",
  "czech_lit",
  "interleaved_review",
  "simulation_repair",
] as const;

export type BetaPathPhaseId = (typeof betaPathPhaseIds)[number];

export const betaPathPhaseLabelsCs: Record<BetaPathPhaseId, string> = {
  diagnostics: "Diagnostika",
  basics: "Základy",
  world_realism: "Světový realismus",
  czech_lit: "Česká literatura",
  interleaved_review: "Interleaved review",
  simulation_repair: "Simulace a weak spot repair",
};

export const betaPathPhaseFocusCs: Record<BetaPathPhaseId, string> = {
  diagnostics:
    "Zjistit vstupní slabiny — pořadí dalších fází se přizpůsobí výsledkům.",
  basics: "Romantismus, realismus, národní obrození, jazykové pojmy.",
  world_realism: "Francie, Anglie, Rusko (světový realismus).",
  czech_lit: "Máj, Kytice, Babička, Jirásek, drama.",
  interleaved_review: "Smíšené opakování napříč už probranými tématy.",
  simulation_repair:
    "Simulace maturity + cílená oprava největších slabin.",
};

/** Calendar share of study days (sums ≈ 1). */
export const betaPathPhaseShares: Record<BetaPathPhaseId, number> = {
  diagnostics: 0.04,
  basics: 0.28,
  world_realism: 0.2,
  czech_lit: 0.22,
  interleaved_review: 0.14,
  simulation_repair: 0.12,
};

/**
 * How to pull topics from a CurriculumPack.
 * All slugs must exist in seeded curriculum — resolution fails soft (skip missing).
 */
export type TopicSelector = {
  moduleSlug: string;
  /** If omitted, all topics in the module (by orderIndex). */
  topicSlugs?: string[];
};

export type PhaseBlueprint = {
  id: BetaPathPhaseId;
  kind: "diagnostics" | "learn" | "review" | "simulation";
  /** Curriculum selectors — empty for diagnostics/simulation shell. */
  selectors: TopicSelector[];
  /**
   * Cluster keys for diagnostic reordering within the phase.
   * Topics whose moduleSlug matches are grouped; weak clusters go first.
   */
  clusterByModule?: boolean;
};

/**
 * Canonical beta path recipe — maps product phases → curriculum selectors.
 * Source of truth for structure; topics themselves always come from the pack.
 */
export const betaPathBlueprints: PhaseBlueprint[] = [
  {
    id: "diagnostics",
    kind: "diagnostics",
    selectors: [],
  },
  {
    id: "basics",
    kind: "learn",
    clusterByModule: true,
    selectors: [
      {
        moduleSlug: "literarni-smery",
        topicSlugs: [
          "romantismus",
          "realismus",
          "kriticky-realismus",
          "naturalismus",
        ],
      },
      { moduleSlug: "narodni-obrozeni" },
      { moduleSlug: "jazyk" },
    ],
  },
  {
    id: "world_realism",
    kind: "learn",
    clusterByModule: true,
    selectors: [
      {
        moduleSlug: "svetovy-realismus",
        topicSlugs: [
          "realismus-francie",
          "realismus-anglie",
          "realismus-rusko",
        ],
      },
    ],
  },
  {
    id: "czech_lit",
    kind: "learn",
    clusterByModule: true,
    selectors: [
      {
        moduleSlug: "rozbory-del",
        topicSlugs: ["rozbor-maj", "rozbor-kytice", "rozbor-babicka"],
      },
      {
        moduleSlug: "ceska-literatura-a-drama",
        topicSlugs: [
          "nemcova-babicka",
          "jirasek",
          "ceske-realisticke-drama",
          "stroupeznicky",
          "preissova",
          "mrstikove-marysa",
        ],
      },
    ],
  },
  {
    id: "interleaved_review",
    kind: "review",
    selectors: [], // filled from prior learn phases
  },
  {
    id: "simulation_repair",
    kind: "simulation",
    selectors: [], // filled from weakest diagnostic / mastery topics
  },
];

export const betaPathConfig = {
  targetDate: BETA_TARGET_DATE,
  curriculumSlug: "cjl-beta",
  diagnosticHref: "/app/tests?intent=diagnostic",
  simulationHref: "/app/simulation",
  topicsHref: "/app/topics",
  bufferDaysMin: 3,
} as const;

/** Minimal topic node required from curriculum pack. */
export type CurriculumTopicRef = {
  id: string;
  slug: string;
  title: string;
  moduleSlug: string;
  moduleTitle: string;
  orderIndex: number;
  examRelevance: string;
  prerequisiteSlugs: string[];
};

export type CurriculumPackLike = {
  curriculum: { slug: string; title: string };
  modules: Array<{
    slug: string;
    title: string;
    orderIndex: number;
    topics: Array<{
      id: string;
      slug: string;
      title: string;
      orderIndex: number;
      examRelevance: string;
      prerequisiteSlugs: string[];
    }>;
  }>;
};

export const diagnosticSnapshotSchema = z.object({
  completed: z.boolean(),
  /** Module or topic slug → 0–100 (higher = stronger). */
  scoresBySlug: z.record(z.string(), z.number().min(0).max(100)).default({}),
  weakSlugs: z.array(z.string()).max(40).default([]),
  strongSlugs: z.array(z.string()).max(40).default([]),
  completedAt: z.string().datetime().nullable().default(null),
});

export type DiagnosticSnapshot = z.infer<typeof diagnosticSnapshotSchema>;

export function emptyDiagnosticSnapshot(): DiagnosticSnapshot {
  return {
    completed: false,
    scoresBySlug: {},
    weakSlugs: [],
    strongSlugs: [],
    completedAt: null,
  };
}

export type PathTopic = {
  topicId: string;
  slug: string;
  title: string;
  moduleSlug: string;
  moduleTitle: string;
  examRelevance: string;
  /** Diagnostic / mastery score used for ordering (null = unknown). */
  score: number | null;
  adapted: boolean;
  href: string;
};

export type BetaPathPhase = {
  id: BetaPathPhaseId;
  labelCs: string;
  focusCs: string;
  kind: PhaseBlueprint["kind"];
  dayCount: number;
  startDate: string;
  endDate: string;
  topics: PathTopic[];
  adaptedOrder: boolean;
  href: string | null;
};

export type BetaLearningPath = {
  curriculumSlug: string;
  curriculumTitle: string;
  targetDate: string;
  daysRemaining: number;
  studyDays: number;
  bufferDays: number;
  currentPhaseId: BetaPathPhaseId;
  phases: BetaPathPhase[];
  nextTopic: PathTopic | null;
  diagnosticApplied: boolean;
  adaptationNoteCs: string;
  generatedAt: string;
};

export function flattenPackTopics(
  pack: CurriculumPackLike,
): CurriculumTopicRef[] {
  const mods = [...pack.modules].sort((a, b) => a.orderIndex - b.orderIndex);
  const out: CurriculumTopicRef[] = [];
  for (const mod of mods) {
    const topics = [...mod.topics].sort((a, b) => a.orderIndex - b.orderIndex);
    for (const t of topics) {
      out.push({
        id: t.id,
        slug: t.slug,
        title: t.title,
        moduleSlug: mod.slug,
        moduleTitle: mod.title,
        orderIndex: t.orderIndex,
        examRelevance: t.examRelevance,
        prerequisiteSlugs: t.prerequisiteSlugs ?? [],
      });
    }
  }
  return out;
}

export function resolveSelectorTopics(
  pack: CurriculumPackLike,
  selector: TopicSelector,
): CurriculumTopicRef[] {
  const all = flattenPackTopics(pack);
  const inModule = all.filter((t) => t.moduleSlug === selector.moduleSlug);
  if (!selector.topicSlugs || selector.topicSlugs.length === 0) {
    return inModule;
  }
  const wanted = new Set(selector.topicSlugs);
  // Preserve selector order, not only pack order
  const bySlug = new Map(inModule.map((t) => [t.slug, t]));
  const ordered: CurriculumTopicRef[] = [];
  for (const slug of selector.topicSlugs) {
    const hit = bySlug.get(slug);
    if (hit) ordered.push(hit);
  }
  // Also include any selector misses that exist under aliases — skip silently
  void wanted;
  return ordered;
}

function scoreFor(
  slug: string,
  moduleSlug: string,
  diagnostic: DiagnosticSnapshot,
): number | null {
  if (slug in diagnostic.scoresBySlug) return diagnostic.scoresBySlug[slug]!;
  if (moduleSlug in diagnostic.scoresBySlug) {
    return diagnostic.scoresBySlug[moduleSlug]!;
  }
  if (diagnostic.weakSlugs.includes(slug)) return 25;
  if (diagnostic.strongSlugs.includes(slug)) return 80;
  return null;
}

/**
 * Reorder topics: weakest first (diagnostic), keep module clusters if requested.
 * Prerequisites within the list are respected (prereq before dependent).
 */
export function adaptTopicOrder(
  topics: CurriculumTopicRef[],
  diagnostic: DiagnosticSnapshot,
  clusterByModule: boolean,
): { topics: CurriculumTopicRef[]; adapted: boolean } {
  if (!diagnostic.completed || topics.length <= 1) {
    return { topics, adapted: false };
  }

  const scored = topics.map((t) => ({
    topic: t,
    score: scoreFor(t.slug, t.moduleSlug, diagnostic) ?? 50,
  }));

  let ordered: CurriculumTopicRef[];

  if (clusterByModule) {
    const clusterScore = new Map<string, number>();
    const clusterOrder = new Map<string, number>();
    let orderIdx = 0;
    for (const row of scored) {
      const m = row.topic.moduleSlug;
      if (!clusterOrder.has(m)) clusterOrder.set(m, orderIdx++);
      const prev = clusterScore.get(m);
      clusterScore.set(m, prev == null ? row.score : Math.min(prev, row.score));
    }
    const modulesSorted = [...clusterScore.entries()].sort((a, b) => {
      if (a[1] !== b[1]) return a[1] - b[1];
      return (clusterOrder.get(a[0]) ?? 0) - (clusterOrder.get(b[0]) ?? 0);
    });
    ordered = [];
    for (const [mod] of modulesSorted) {
      const group = scored
        .filter((r) => r.topic.moduleSlug === mod)
        .sort((a, b) => a.score - b.score || a.topic.orderIndex - b.topic.orderIndex);
      ordered.push(...group.map((g) => g.topic));
    }
  } else {
    ordered = [...scored]
      .sort((a, b) => a.score - b.score || a.topic.orderIndex - b.topic.orderIndex)
      .map((r) => r.topic);
  }

  ordered = respectPrerequisites(ordered);
  const changed = ordered.some((t, i) => t.slug !== topics[i]?.slug);
  return { topics: ordered, adapted: changed };
}

/** Stable topo: if A is prereq of B and both in list, A before B. */
export function respectPrerequisites(
  topics: CurriculumTopicRef[],
): CurriculumTopicRef[] {
  const bySlug = new Map(topics.map((t) => [t.slug, t]));
  const inList = new Set(topics.map((t) => t.slug));
  const result: CurriculumTopicRef[] = [];
  const visiting = new Set<string>();
  const done = new Set<string>();

  function visit(slug: string) {
    if (done.has(slug) || !inList.has(slug)) return;
    if (visiting.has(slug)) return;
    visiting.add(slug);
    const t = bySlug.get(slug);
    if (!t) return;
    for (const pre of t.prerequisiteSlugs) {
      if (inList.has(pre)) visit(pre);
    }
    visiting.delete(slug);
    done.add(slug);
    result.push(t);
  }

  for (const t of topics) visit(t.slug);
  return result;
}

/** Round-robin interleave by module for review phase. */
export function interleaveByModule(
  topics: CurriculumTopicRef[],
): CurriculumTopicRef[] {
  const buckets = new Map<string, CurriculumTopicRef[]>();
  for (const t of topics) {
    const list = buckets.get(t.moduleSlug) ?? [];
    list.push(t);
    buckets.set(t.moduleSlug, list);
  }
  const queues = [...buckets.values()];
  const out: CurriculumTopicRef[] = [];
  let i = 0;
  while (queues.some((q) => q.length > 0)) {
    const q = queues[i % queues.length]!;
    const next = q.shift();
    if (next) out.push(next);
    i += 1;
    if (i > 10_000) break;
  }
  return out;
}

function toPathTopic(
  t: CurriculumTopicRef,
  diagnostic: DiagnosticSnapshot,
  adapted: boolean,
): PathTopic {
  return {
    topicId: t.id,
    slug: t.slug,
    title: t.title,
    moduleSlug: t.moduleSlug,
    moduleTitle: t.moduleTitle,
    examRelevance: t.examRelevance,
    score: scoreFor(t.slug, t.moduleSlug, diagnostic),
    adapted,
    href: `${betaPathConfig.topicsHref}?focus=${encodeURIComponent(t.slug)}`,
  };
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T12:00:00`).getTime();
  const b = new Date(`${toIso}T12:00:00`).getTime();
  return Math.max(0, Math.ceil((b - a) / 86_400_000));
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function allocateDays(studyDays: number): Record<BetaPathPhaseId, number> {
  const raw = betaPathPhaseIds.map((id) => ({
    id,
    n: betaPathPhaseShares[id] * studyDays,
  }));
  const floors = raw.map((r) => ({
    id: r.id,
    n: Math.max(r.id === "diagnostics" ? 1 : 1, Math.floor(r.n)),
  }));
  let used = floors.reduce((s, x) => s + x.n, 0);
  // Shrink if over
  while (used > studyDays) {
    const idx = floors.reduce(
      (best, x, i) => (x.n > floors[best]!.n ? i : best),
      0,
    );
    if (floors[idx]!.n <= 1) break;
    floors[idx]!.n -= 1;
    used -= 1;
  }
  // Grow remainders by fractional part
  const frac = raw
    .map((r, i) => ({ i, f: r.n - Math.floor(r.n) }))
    .sort((a, b) => b.f - a.f);
  let left = studyDays - used;
  for (const f of frac) {
    if (left <= 0) break;
    floors[f.i]!.n += 1;
    left -= 1;
  }
  const out = {} as Record<BetaPathPhaseId, number>;
  for (const row of floors) out[row.id] = row.n;
  return out;
}

export function pickWeakRepairTopics(
  pack: CurriculumPackLike,
  diagnostic: DiagnosticSnapshot,
  limit = 8,
): CurriculumTopicRef[] {
  const all = flattenPackTopics(pack);
  const ranked = all
    .map((t) => ({
      t,
      score: scoreFor(t.slug, t.moduleSlug, diagnostic) ?? 55,
    }))
    .sort((a, b) => a.score - b.score);
  const weak = ranked.filter((r) => r.score < 60).slice(0, limit);
  if (weak.length > 0) return weak.map((w) => w.t);
  return ranked.slice(0, Math.min(limit, 5)).map((w) => w.t);
}

/**
 * Build beta learning path from curriculum + diagnostic.
 * Never hardcode topic titles here beyond slug selectors in blueprints.
 */
export function buildBetaLearningPath(input: {
  pack: CurriculumPackLike;
  diagnostic?: DiagnosticSnapshot | null;
  targetDate?: string;
  now?: Date;
}): BetaLearningPath {
  const diagnostic = diagnosticSnapshotSchema.parse(
    input.diagnostic ?? emptyDiagnosticSnapshot(),
  );
  const now = input.now ?? new Date();
  const todayKey = dateKey(now);
  const targetDate = input.targetDate ?? betaPathConfig.targetDate;
  const daysRemaining = daysBetween(todayKey, targetDate);
  const bufferDays = Math.min(
    8,
    Math.max(betaPathConfig.bufferDaysMin, Math.round(daysRemaining * 0.1)),
  );
  const studyDays = Math.max(betaPathPhaseIds.length, daysRemaining - bufferDays);
  const dayAlloc = allocateDays(studyDays);

  const learnTopicsAccum: CurriculumTopicRef[] = [];
  let cursorOffset = 0;
  let anyAdapted = false;
  const phases: BetaPathPhase[] = [];

  for (const blueprint of betaPathBlueprints) {
    let resolved: CurriculumTopicRef[] = [];
    let adapted = false;

    if (blueprint.kind === "learn") {
      for (const sel of blueprint.selectors) {
        resolved.push(...resolveSelectorTopics(input.pack, sel));
      }
      // de-dupe by slug preserving order
      const seen = new Set<string>();
      resolved = resolved.filter((t) => {
        if (seen.has(t.slug)) return false;
        seen.add(t.slug);
        return true;
      });
      const adaptedResult = adaptTopicOrder(
        resolved,
        diagnostic,
        blueprint.clusterByModule ?? false,
      );
      resolved = adaptedResult.topics;
      adapted = adaptedResult.adapted;
      learnTopicsAccum.push(...resolved);
    } else if (blueprint.kind === "review") {
      resolved = interleaveByModule(learnTopicsAccum);
      adapted = diagnostic.completed;
    } else if (blueprint.kind === "simulation") {
      resolved = pickWeakRepairTopics(input.pack, diagnostic);
      adapted = diagnostic.completed;
    }

    if (adapted) anyAdapted = true;

    const dayCount = dayAlloc[blueprint.id] ?? 1;
    const startDate = addDaysIso(todayKey, cursorOffset);
    const endDate = addDaysIso(todayKey, cursorOffset + dayCount - 1);
    cursorOffset += dayCount;

    const pathTopics = resolved.map((t) =>
      toPathTopic(t, diagnostic, adapted),
    );

    let href: string | null = null;
    if (blueprint.kind === "diagnostics") href = betaPathConfig.diagnosticHref;
    else if (blueprint.kind === "simulation") href = betaPathConfig.simulationHref;
    else if (pathTopics[0]) href = pathTopics[0].href;

    phases.push({
      id: blueprint.id,
      labelCs: betaPathPhaseLabelsCs[blueprint.id],
      focusCs: betaPathPhaseFocusCs[blueprint.id],
      kind: blueprint.kind,
      dayCount,
      startDate,
      endDate,
      topics: pathTopics,
      adaptedOrder: adapted,
      href,
    });
  }

  const currentPhaseId =
    phases.find((p) => todayKey >= p.startDate && todayKey <= p.endDate)?.id ??
    phases[0]!.id;

  const current = phases.find((p) => p.id === currentPhaseId)!;
  const nextTopic =
    current.topics.find((t) => (t.score == null || t.score < 75)) ??
    current.topics[0] ??
    null;

  let adaptationNoteCs: string;
  if (!diagnostic.completed) {
    adaptationNoteCs =
      "Diagnostika ještě neproběhla — pořadí je defaultní z kurikula. Po diagnostice se fáze přeskupí podle slabin.";
  } else if (anyAdapted) {
    adaptationNoteCs =
      "Pořadí upraveno podle diagnostiky: nejdřív největší slabiny (předpoklady uvnitř fáze zůstávají).";
  } else {
    adaptationNoteCs =
      "Diagnostika dokončena — výchozí pořadí kurikula sedí se skóry.";
  }

  return {
    curriculumSlug: input.pack.curriculum.slug,
    curriculumTitle: input.pack.curriculum.title,
    targetDate,
    daysRemaining,
    studyDays,
    bufferDays,
    currentPhaseId,
    phases,
    nextTopic,
    diagnosticApplied: diagnostic.completed,
    adaptationNoteCs,
    generatedAt: now.toISOString(),
  };
}

/** Map readiness-like weak/strong area labels or ids into a diagnostic snapshot. */
export function diagnosticFromAreaScores(input: {
  completed: boolean;
  areaScores: Array<{ id: string; pct: number }>;
  completedAt?: string | null;
}): DiagnosticSnapshot {
  const scoresBySlug: Record<string, number> = {};
  for (const a of input.areaScores) {
    scoresBySlug[a.id] = a.pct;
  }
  // Map readiness area ids → curriculum module slugs where they differ
  const aliases: Record<string, string> = {
    "literarni-smery": "literarni-smery",
    "autori-dila": "ceska-literatura-a-drama",
    rozbory: "rozbory-del",
    jazyk: "jazyk",
  };
  for (const [areaId, mod] of Object.entries(aliases)) {
    if (areaId in scoresBySlug && !(mod in scoresBySlug)) {
      scoresBySlug[mod] = scoresBySlug[areaId]!;
    }
  }
  const ranked = Object.entries(scoresBySlug).sort((a, b) => a[1] - b[1]);
  return diagnosticSnapshotSchema.parse({
    completed: input.completed,
    scoresBySlug,
    weakSlugs: ranked.filter(([, s]) => s < 55).map(([k]) => k),
    strongSlugs: ranked.filter(([, s]) => s >= 75).map(([k]) => k),
    completedAt: input.completedAt ?? null,
  });
}
