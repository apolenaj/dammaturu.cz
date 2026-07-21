import type {
  LearnerScheduleBook,
  ReviewKnowledge,
  SpacedSchedule,
  SpacedReviewPack,
} from "@/domain/learning/spaced-repetition";

function isScheduleNew(schedule: SpacedSchedule | undefined): boolean {
  return !schedule || schedule.lastReviewed === null;
}

/**
 * Mixed practice / interleaving (D-033).
 * After basics: mix Balzac · Dickens · Dostojevskij · romantismus · realismus · Máj · Kytice.
 * Beginners stay in a focused cluster — no chaotic full mix.
 */

export const interleavePhases = [
  "beginner_focus",
  "within_cluster",
  "light_mix",
  "full_interleave",
] as const;

export type InterleavePhase = (typeof interleavePhases)[number];

export const interleavePhaseLabelsCs: Record<InterleavePhase, string> = {
  beginner_focus: "Začátečník — jeden cluster",
  within_cluster: "Procvičení clusteru",
  light_mix: "Lehký mix (2 clustery)",
  full_interleave: "Plné interleaving",
};

export type TopicClusterDef = {
  id: string;
  labelCs: string;
  /** Entity keys that belong here. */
  entityKeys: string[];
  /** Starter order for beginners (lower = earlier). */
  beginnerOrder: number;
  /** Clusters that are easy to confuse — distinguish practice. */
  confusableWith: string[];
};

/** Canonical clusters for ČJL mixed practice. */
export const TOPIC_CLUSTERS: TopicClusterDef[] = [
  {
    id: "czech-romantic-works",
    labelCs: "Český romantismus — díla",
    entityKeys: ["maj", "kytice", "macha", "erben"],
    beginnerOrder: 0,
    confusableWith: ["movements", "czech-realist-works"],
  },
  {
    id: "movements",
    labelCs: "Literární směry",
    entityKeys: ["romantismus", "realismus", "naturalismus", "symbolismus"],
    beginnerOrder: 1,
    confusableWith: ["czech-romantic-works", "realist-authors"],
  },
  {
    id: "realist-authors",
    labelCs: "Realističtí autoři (svět)",
    entityKeys: ["balzac", "dickens", "dostojevskij", "tolstoj", "goriot"],
    beginnerOrder: 3,
    confusableWith: ["movements", "czech-realist-works"],
  },
  {
    id: "czech-realist-works",
    labelCs: "Český realismus — díla",
    entityKeys: ["neruda", "nemcova", "babicka", "marysa", "havlicek"],
    beginnerOrder: 2,
    confusableWith: ["czech-romantic-works", "realist-authors"],
  },
  {
    id: "poetics",
    labelCs: "Poetika / pojmy",
    entityKeys: ["metafora", "epiteton", "synekdocha", "balada", "ironie"],
    beginnerOrder: 4,
    confusableWith: [],
  },
];

export const interleaveConfig = {
  /** Total graded reviews before leaving pure beginner focus. */
  beginnerMaxTotalReviews: 6,
  /** Min items in a cluster with reviewCount ≥ this to count as “introduced”. */
  clusterIntroReviewCount: 2,
  /** Min stable items (reviewCount + stability) to unlock cluster for mixing. */
  clusterStableMinItems: 2,
  clusterStableMinReviews: 2,
  clusterStableMinStability: 1.0,
  /** Max consecutive same entityKey. */
  maxSameEntityRun: {
    beginner_focus: 4,
    within_cluster: 3,
    light_mix: 2,
    full_interleave: 1,
  } as Record<InterleavePhase, number>,
  /** Max consecutive same cluster. */
  maxSameClusterRun: {
    beginner_focus: 8,
    within_cluster: 6,
    light_mix: 3,
    full_interleave: 2,
  } as Record<InterleavePhase, number>,
  /** Max share of queue from a single entity in full_interleave. */
  maxEntityFractionFull: 0.22,
} as const;

export function clusterById(id: string): TopicClusterDef | undefined {
  return TOPIC_CLUSTERS.find((c) => c.id === id);
}

export function resolveClusterId(knowledge: ReviewKnowledge): string {
  if (knowledge.clusterId) return knowledge.clusterId;
  const tag = knowledge.tags.find((t) => t.startsWith("cluster:"));
  if (tag) return tag.slice("cluster:".length);
  // Infer from entity
  const entity = resolveEntityKey(knowledge);
  const hit = TOPIC_CLUSTERS.find((c) => c.entityKeys.includes(entity));
  return hit?.id ?? "poetics";
}

export function resolveEntityKey(knowledge: ReviewKnowledge): string {
  if (knowledge.entityKey) return knowledge.entityKey;
  const tag = knowledge.tags.find((t) => t.startsWith("entity:"));
  if (tag) return tag.slice("entity:".length);
  // slug heuristics
  const s = knowledge.slug;
  if (s.includes("maj") || s.includes("macha")) return "maj";
  if (s.includes("kytice") || s.includes("erben")) return "kytice";
  if (s.includes("goriot") || s.includes("balzac")) return "balzac";
  if (s.includes("dickens")) return "dickens";
  if (s.includes("raskolnikov") || s.includes("dostojev")) return "dostojevskij";
  if (s.includes("romantismus")) return "romantismus";
  if (s.includes("realismus") && !s.includes("symbol")) return "realismus";
  if (s.includes("neruda")) return "neruda";
  if (s.includes("nemcova") || s.includes("babicka")) return "nemcova";
  if (s.includes("marysa")) return "marysa";
  if (s.includes("metafora")) return "metafora";
  if (s.includes("epiteton")) return "epiteton";
  if (s.includes("synekdocha")) return "synekdocha";
  if (s.includes("symbolismus")) return "symbolismus";
  if (s.includes("havlicek")) return "havlicek";
  if (s.includes("balada")) return "balada";
  if (s.includes("obrozeni")) return "obrozeni";
  return s.split("-")[0] ?? s;
}

function scheduleOf(
  book: LearnerScheduleBook | null,
  knowledgeId: string,
): SpacedSchedule | undefined {
  return book?.byKnowledgeId[knowledgeId];
}

function isStable(sch: SpacedSchedule | undefined): boolean {
  if (!sch || isScheduleNew(sch)) return false;
  return (
    sch.reviewCount >= interleaveConfig.clusterStableMinReviews &&
    sch.stability >= interleaveConfig.clusterStableMinStability &&
    sch.lapseCount <= sch.reviewCount // not drowning in lapses
  );
}

export type ClusterStats = {
  clusterId: string;
  total: number;
  introduced: number;
  stable: number;
  totalReviews: number;
};

export function computeClusterStats(
  pack: SpacedReviewPack,
  book: LearnerScheduleBook | null,
): ClusterStats[] {
  const map = new Map<string, ClusterStats>();
  for (const c of TOPIC_CLUSTERS) {
    map.set(c.id, {
      clusterId: c.id,
      total: 0,
      introduced: 0,
      stable: 0,
      totalReviews: 0,
    });
  }
  for (const k of pack.knowledge) {
    const cid = resolveClusterId(k);
    const row =
      map.get(cid) ??
      ({
        clusterId: cid,
        total: 0,
        introduced: 0,
        stable: 0,
        totalReviews: 0,
      } satisfies ClusterStats);
    row.total += 1;
    const sch = scheduleOf(book, k.id);
    if (sch && !isScheduleNew(sch)) {
      row.introduced += 1;
      row.totalReviews += sch.reviewCount;
      if (isStable(sch)) row.stable += 1;
    }
    map.set(cid, row);
  }
  return [...map.values()];
}

export function clusterIsUnlocked(stats: ClusterStats): boolean {
  return stats.stable >= interleaveConfig.clusterStableMinItems;
}

/**
 * Determine how aggressively to interleave.
 */
export function resolveInterleavePhase(
  pack: SpacedReviewPack,
  book: LearnerScheduleBook | null,
): InterleavePhase {
  const stats = computeClusterStats(pack, book);
  const totalReviews = stats.reduce((s, c) => s + c.totalReviews, 0);
  const unlocked = stats.filter(clusterIsUnlocked);

  if (totalReviews < interleaveConfig.beginnerMaxTotalReviews) {
    return "beginner_focus";
  }
  if (unlocked.length === 0) {
    return "within_cluster";
  }
  if (unlocked.length === 1) {
    return "within_cluster";
  }
  if (unlocked.length === 2) {
    return "light_mix";
  }
  return "full_interleave";
}

/** Primary cluster for a beginner / within_cluster focus. */
export function pickFocusCluster(
  pack: SpacedReviewPack,
  book: LearnerScheduleBook | null,
): string {
  const stats = computeClusterStats(pack, book);
  const byId = new Map(stats.map((s) => [s.clusterId, s]));

  // Prefer earliest beginnerOrder cluster that still has unintroduced or unstable items
  const ordered = [...TOPIC_CLUSTERS].sort(
    (a, b) => a.beginnerOrder - b.beginnerOrder,
  );
  for (const c of ordered) {
    const st = byId.get(c.id);
    if (!st || st.total === 0) continue;
    if (st.stable < interleaveConfig.clusterStableMinItems) {
      return c.id;
    }
  }
  // All stable — use weakest by avg (fewest stable)
  const withItems = stats.filter((s) => s.total > 0);
  withItems.sort((a, b) => a.stable - b.stable || a.totalReviews - b.totalReviews);
  return withItems[0]?.clusterId ?? ordered[0]!.id;
}

export type InterleaveMeta = {
  phase: InterleavePhase;
  focusClusterId: string;
  unlockedClusterIds: string[];
  rationaleCs: string;
};

export function describeInterleave(
  pack: SpacedReviewPack,
  book: LearnerScheduleBook | null,
): InterleaveMeta {
  const phase = resolveInterleavePhase(pack, book);
  const focusClusterId = pickFocusCluster(pack, book);
  const unlockedClusterIds = computeClusterStats(pack, book)
    .filter(clusterIsUnlocked)
    .map((s) => s.clusterId);

  const focusLabel =
    clusterById(focusClusterId)?.labelCs ?? focusClusterId;

  let rationaleCs: string;
  switch (phase) {
    case "beginner_focus":
      rationaleCs = `Začátečnický režim: držíme se „${focusLabel}“, aby nevznikl chaos.`;
      break;
    case "within_cluster":
      rationaleCs = `Procvičuješ hlavně „${focusLabel}“, než odemkneme mix.`;
      break;
    case "light_mix":
      rationaleCs =
        "Lehký mix 2 odemčených clusterů — začínáš rozlišovat podobná témata.";
      break;
    case "full_interleave":
      rationaleCs =
        "Plné interleaving: Balzac · Dickens · Dostojevskij · směry · Máj · Kytice — test rozlišování.";
      break;
  }

  return { phase, focusClusterId, unlockedClusterIds, rationaleCs };
}

/**
 * Reorder candidate knowledge for interleaving constraints.
 * Does not drop due items unnecessarily — filters only in beginner_focus / within_cluster.
 */
export function interleaveKnowledgeOrder(input: {
  candidates: ReviewKnowledge[];
  pack: SpacedReviewPack;
  book: LearnerScheduleBook | null;
}): { ordered: ReviewKnowledge[]; meta: InterleaveMeta } {
  const meta = describeInterleave(input.pack, input.book);
  const phase = meta.phase;

  let pool = [...input.candidates];

  if (phase === "beginner_focus" || phase === "within_cluster") {
    const focused = pool.filter(
      (k) => resolveClusterId(k) === meta.focusClusterId,
    );
    // Keep at least something; if focus empty (all due elsewhere), fall back
    if (focused.length >= Math.min(3, pool.length) || focused.length > 0) {
      pool = focused.length > 0 ? focused : pool;
    }
  } else if (phase === "light_mix") {
    const allowed = new Set(
      meta.unlockedClusterIds.length >= 2
        ? meta.unlockedClusterIds.slice(0, 2)
        : [meta.focusClusterId, meta.unlockedClusterIds[0]].filter(Boolean),
    );
    // Always allow focus + one unlocked
    allowed.add(meta.focusClusterId);
    const filtered = pool.filter((k) => allowed.has(resolveClusterId(k)));
    if (filtered.length >= 3) pool = filtered;
  }

  const ordered = arrangeWithRuns(pool, phase, input.book);
  const capped =
    phase === "full_interleave"
      ? capEntityFraction(ordered, interleaveConfig.maxEntityFractionFull)
      : ordered;

  return { ordered: capped, meta };
}

function arrangeWithRuns(
  items: ReviewKnowledge[],
  phase: InterleavePhase,
  book: LearnerScheduleBook | null,
): ReviewKnowledge[] {
  if (items.length <= 1) return items;

  const maxEntity = interleaveConfig.maxSameEntityRun[phase];
  const maxCluster = interleaveConfig.maxSameClusterRun[phase];

  // Sort due-urgency first if we have schedules
  const remaining = [...items].sort((a, b) => {
    const sa = scheduleOf(book, a.id);
    const sb = scheduleOf(book, b.id);
    if (sa && sb) {
      return (
        new Date(sa.nextReview).getTime() - new Date(sb.nextReview).getTime()
      );
    }
    return a.slug.localeCompare(b.slug);
  });

  const out: ReviewKnowledge[] = [];

  while (remaining.length > 0) {
    let pickedIdx = -1;
    for (let i = 0; i < remaining.length; i += 1) {
      const cand = remaining[i]!;
      const entity = resolveEntityKey(cand);
      const cluster = resolveClusterId(cand);
      if (out.length === 0) {
        pickedIdx = i;
        break;
      }
      const entityRun = trailingRun(out, (k) => resolveEntityKey(k) === entity);
      const clusterRun = trailingRun(
        out,
        (k) => resolveClusterId(k) === cluster,
      );
      if (entityRun < maxEntity && clusterRun < maxCluster) {
        pickedIdx = i;
        break;
      }
    }
    if (pickedIdx < 0) {
      // Forced pick — take item that breaks entity run if possible
      pickedIdx = 0;
      const lastEntity = resolveEntityKey(out[out.length - 1]!);
      for (let i = 0; i < remaining.length; i += 1) {
        if (resolveEntityKey(remaining[i]!) !== lastEntity) {
          pickedIdx = i;
          break;
        }
      }
    }
    out.push(remaining.splice(pickedIdx, 1)[0]!);
  }

  return out;
}

function trailingRun(
  items: ReviewKnowledge[],
  pred: (k: ReviewKnowledge) => boolean,
): number {
  let n = 0;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (!pred(items[i]!)) break;
    n += 1;
  }
  return n;
}

/** Prevent 20× Balzac: cap fraction per entity, redistribute overflow to end then re-arrange lightly. */
function capEntityFraction(
  items: ReviewKnowledge[],
  maxFraction: number,
): ReviewKnowledge[] {
  if (items.length < 5) return items;
  const maxCount = Math.max(2, Math.floor(items.length * maxFraction));
  const counts = new Map<string, number>();
  const kept: ReviewKnowledge[] = [];
  const deferred: ReviewKnowledge[] = [];

  for (const k of items) {
    const e = resolveEntityKey(k);
    const n = counts.get(e) ?? 0;
    if (n < maxCount) {
      kept.push(k);
      counts.set(e, n + 1);
    } else {
      deferred.push(k);
    }
  }
  // Append deferred but skip if it would recreate long entity runs at the join
  for (const k of deferred) {
    kept.push(k);
  }
  return kept;
}

/**
 * Prefer distinguish-style payloads (questions that contrast confusable entities)
 * when phase is light_mix / full_interleave and knowledge has a distinguish tag.
 */
export function preferDistinguishFormat(
  knowledge: ReviewKnowledge,
  phase: InterleavePhase,
): boolean {
  if (phase !== "light_mix" && phase !== "full_interleave") return false;
  return (
    knowledge.tags.includes("distinguish") ||
    Boolean(knowledge.entityKey === "distinguish") ||
    knowledge.formats.some(
      (f) =>
        f.format === "question" &&
        /balzac|dickens|dostojev|romantismus|realismus|máj|kytice/i.test(
          f.stem + f.options.join(" "),
        ),
    )
  );
}

/**
 * Order due/new pools so limits slice the right cluster first (beginner safety).
 * Full interleave: round-robin by entity so we don’t take 18× Balzac from due.
 */
export function prioritizeForSelection(
  items: ReviewKnowledge[],
  meta: InterleaveMeta,
): ReviewKnowledge[] {
  if (items.length <= 1) return items;
  const { phase, focusClusterId, unlockedClusterIds } = meta;

  if (phase === "beginner_focus" || phase === "within_cluster") {
    const focus = items.filter((k) => resolveClusterId(k) === focusClusterId);
    const rest = items.filter((k) => resolveClusterId(k) !== focusClusterId);
    return [...focus, ...rest];
  }

  if (phase === "light_mix") {
    const allowed = new Set<string>([
      focusClusterId,
      ...unlockedClusterIds.slice(0, 2),
    ]);
    const inMix = items.filter((k) => allowed.has(resolveClusterId(k)));
    const rest = items.filter((k) => !allowed.has(resolveClusterId(k)));
    return [...roundRobinByEntity(inMix), ...rest];
  }

  return roundRobinByEntity(items);
}

function roundRobinByEntity(items: ReviewKnowledge[]): ReviewKnowledge[] {
  const buckets = new Map<string, ReviewKnowledge[]>();
  for (const k of items) {
    const e = resolveEntityKey(k);
    const list = buckets.get(e) ?? [];
    list.push(k);
    buckets.set(e, list);
  }
  const keys = [...buckets.keys()].sort();
  const out: ReviewKnowledge[] = [];
  let guard = 0;
  while (out.length < items.length && guard < items.length * 3) {
    guard += 1;
    let progressed = false;
    for (const key of keys) {
      const list = buckets.get(key);
      if (list && list.length > 0) {
        out.push(list.shift()!);
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return out;
}
