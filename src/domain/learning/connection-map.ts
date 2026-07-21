import { z } from "zod";

/**
 * Visual Connection Map — literary-history relationships as teachable paths.
 * Not decorative: every edge belongs to a named path students can explore or fill.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const connectionNodeKinds = [
  "movement",
  "region",
  "author",
  "work",
  "concept",
] as const;

export type ConnectionNodeKind = (typeof connectionNodeKinds)[number];

export const connectionNodeKindSchema = z.enum(connectionNodeKinds);

export const connectionNodeSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  kind: connectionNodeKindSchema,
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(320),
  detail: z.string().min(1).max(700),
});

export type ConnectionNode = z.infer<typeof connectionNodeSchema>;

export const connectionEdgeSchema = z.object({
  id: z.string().uuid(),
  fromSlug: slugSchema,
  toSlug: slugSchema,
  /** Short Czech relation label shown on the edge. */
  relation: z.string().min(1).max(40),
});

export type ConnectionEdge = z.infer<typeof connectionEdgeSchema>;

export const connectionPathSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  label: z.string().min(1).max(120),
  /** Ordered chain of node slugs — the teachable connection. */
  nodeSlugs: z.array(slugSchema).min(3).max(8),
  /** Root focus this path belongs under (usually first node). */
  rootSlug: slugSchema,
});

export type ConnectionPath = z.infer<typeof connectionPathSchema>;

export const connectionMapPackSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  nodes: z.array(connectionNodeSchema).min(8).max(60),
  edges: z.array(connectionEdgeSchema).min(6).max(80),
  paths: z.array(connectionPathSchema).min(3).max(24),
  /** Focus roots shown as filters (Realismus, NO, …). */
  rootSlugs: z.array(slugSchema).min(2).max(8),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ConnectionMapPack = z.infer<typeof connectionMapPackSchema>;

export const connectionMapModes = ["explore", "fill"] as const;
export type ConnectionMapMode = (typeof connectionMapModes)[number];

export const connectionMapProgressSchema = z.object({
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  mode: z.enum(connectionMapModes),
  fillAnswered: z.number().int().min(0),
  fillCorrect: z.number().int().min(0),
  exploredNodeIds: z.array(z.string().uuid()),
  completedPathIds: z.array(z.string().uuid()),
  updatedAt: z.string().datetime(),
});

export type ConnectionMapProgress = z.infer<typeof connectionMapProgressSchema>;

export function parseConnectionMapPack(raw: unknown): ConnectionMapPack {
  const pack = connectionMapPackSchema.parse(raw);
  const bySlug = new Map(pack.nodes.map((n) => [n.slug, n]));

  for (const root of pack.rootSlugs) {
    if (!bySlug.has(root)) {
      throw new Error(`Root slug chybí mezi nodes: ${root}`);
    }
  }

  for (const edge of pack.edges) {
    if (!bySlug.has(edge.fromSlug) || !bySlug.has(edge.toSlug)) {
      throw new Error(
        `Edge ${edge.id}: neznámý node (${edge.fromSlug} → ${edge.toSlug})`,
      );
    }
  }

  for (const path of pack.paths) {
    if (!bySlug.has(path.rootSlug)) {
      throw new Error(`Path ${path.slug}: root ${path.rootSlug} neexistuje`);
    }
    for (let i = 0; i < path.nodeSlugs.length; i += 1) {
      const slug = path.nodeSlugs[i]!;
      if (!bySlug.has(slug)) {
        throw new Error(`Path ${path.slug}: node ${slug} neexistuje`);
      }
      if (i > 0) {
        const prev = path.nodeSlugs[i - 1]!;
        const hasEdge = pack.edges.some(
          (e) => e.fromSlug === prev && e.toSlug === slug,
        );
        if (!hasEdge) {
          throw new Error(
            `Path ${path.slug}: chybí edge ${prev} → ${slug}`,
          );
        }
      }
    }
  }

  return pack;
}

export function getNodeBySlug(
  pack: ConnectionMapPack,
  slug: string,
): ConnectionNode | undefined {
  return pack.nodes.find((n) => n.slug === slug);
}

export function getNeighbors(
  pack: ConnectionMapPack,
  slug: string,
): { outgoing: ConnectionNode[]; incoming: ConnectionNode[] } {
  const outSlugs = pack.edges
    .filter((e) => e.fromSlug === slug)
    .map((e) => e.toSlug);
  const inSlugs = pack.edges
    .filter((e) => e.toSlug === slug)
    .map((e) => e.fromSlug);
  return {
    outgoing: outSlugs
      .map((s) => getNodeBySlug(pack, s))
      .filter((n): n is ConnectionNode => Boolean(n)),
    incoming: inSlugs
      .map((s) => getNodeBySlug(pack, s))
      .filter((n): n is ConnectionNode => Boolean(n)),
  };
}

export function pathsForRoot(
  pack: ConnectionMapPack,
  rootSlug: string | null,
): ConnectionPath[] {
  if (!rootSlug) return pack.paths;
  return pack.paths.filter((p) => p.rootSlug === rootSlug);
}

export function pathNodes(
  pack: ConnectionMapPack,
  path: ConnectionPath,
): ConnectionNode[] {
  return path.nodeSlugs
    .map((s) => getNodeBySlug(pack, s))
    .filter((n): n is ConnectionNode => Boolean(n));
}

export type FillBlank = {
  index: number;
  correctSlug: string;
  choices: ConnectionNode[];
};

export type FillChallenge = {
  pathId: string;
  pathSlug: string;
  label: string;
  /** Full ordered slugs; null = blank to fill. */
  slots: Array<{ slug: string; hidden: boolean }>;
  blanks: FillBlank[];
};

function shuffleCopy<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/**
 * Hide intermediate nodes on a path; keep first (root) and last visible.
 * Student fills each blank from kind-matched distractors.
 */
export function buildFillChallenge(
  pack: ConnectionMapPack,
  path: ConnectionPath,
  opts?: { hideCount?: number; choicesPerBlank?: number },
): FillChallenge {
  const hideCount = opts?.hideCount ?? 2;
  const choicesPerBlank = opts?.choicesPerBlank ?? 4;
  const nodes = pathNodes(pack, path);
  const hideableIndexes = nodes
    .map((_, i) => i)
    .filter((i) => i > 0 && i < nodes.length - 1);

  const toHide = new Set(
    shuffleCopy(hideableIndexes).slice(
      0,
      Math.min(hideCount, hideableIndexes.length),
    ),
  );

  // Always hide at least one if path is long enough
  if (toHide.size === 0 && hideableIndexes.length > 0) {
    toHide.add(hideableIndexes[0]!);
  }

  const slots = path.nodeSlugs.map((slug, index) => ({
    slug,
    hidden: toHide.has(index),
  }));

  const blanks: FillBlank[] = [];
  for (const index of [...toHide].sort((a, b) => a - b)) {
    const correct = nodes[index]!;
    const distractors = pack.nodes.filter(
      (n) =>
        n.slug !== correct.slug &&
        n.kind === correct.kind &&
        !path.nodeSlugs.includes(n.slug),
    );
    const pool =
      distractors.length >= choicesPerBlank - 1
        ? distractors
        : pack.nodes.filter(
            (n) => n.slug !== correct.slug && !path.nodeSlugs.includes(n.slug),
          );
    const choices = shuffleCopy([
      correct,
      ...shuffleCopy(pool).slice(0, choicesPerBlank - 1),
    ]).slice(0, choicesPerBlank);
    blanks.push({ index, correctSlug: correct.slug, choices });
  }

  return {
    pathId: path.id,
    pathSlug: path.slug,
    label: path.label,
    slots,
    blanks,
  };
}

export function isFillComplete(
  challenge: FillChallenge,
  answers: Record<number, string>,
): boolean {
  return challenge.blanks.every((b) => answers[b.index] === b.correctSlug);
}

export function scoreFillAnswers(
  challenge: FillChallenge,
  answers: Record<number, string>,
): { correct: number; total: number } {
  const total = challenge.blanks.length;
  const correct = challenge.blanks.filter(
    (b) => answers[b.index] === b.correctSlug,
  ).length;
  return { correct, total };
}

export const nodeKindLabelsCs: Record<ConnectionNodeKind, string> = {
  movement: "Směr",
  region: "Oblast",
  author: "Autor",
  work: "Dílo",
  concept: "Pojem",
};
