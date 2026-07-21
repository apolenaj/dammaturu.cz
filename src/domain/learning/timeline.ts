import { z } from "zod";

/**
 * Interactive literary-history timeline.
 * Events are typed (author/work/event/movement) and year-bounded for zoom/filter.
 */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const timelineEventKinds = [
  "author",
  "work",
  "event",
  "movement",
] as const;

export type TimelineEventKind = (typeof timelineEventKinds)[number];

export const timelineEventKindSchema = z.enum(timelineEventKinds);

export const timelineEventSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  kind: timelineEventKindSchema,
  title: z.string().min(1).max(160),
  /** Inclusive start year (CE). */
  yearStart: z.number().int().min(1400).max(2100),
  /** Inclusive end year; same as start for point events. */
  yearEnd: z.number().int().min(1400).max(2100),
  summary: z.string().min(1).max(400),
  detail: z.string().min(1).max(900),
  /** Era tags for zoom presets. */
  eras: z.array(z.string().min(1).max(40)).min(1).max(4),
  relatedSlugs: z.array(slugSchema).default([]),
  sourceHint: z.string().max(200).optional(),
});

export type TimelineEvent = z.infer<typeof timelineEventSchema>;

export const timelineZoomPresetSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  yearStart: z.number().int(),
  yearEnd: z.number().int(),
});

export type TimelineZoomPreset = z.infer<typeof timelineZoomPresetSchema>;

export const timelinePackSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  events: z.array(timelineEventSchema).min(6).max(80),
  zoomPresets: z.array(timelineZoomPresetSchema).min(2).max(12),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TimelinePack = z.infer<typeof timelinePackSchema>;

export const timelineModes = ["learn", "reorder"] as const;
export type TimelineMode = (typeof timelineModes)[number];

export const timelineProgressSchema = z.object({
  learnerId: z.string().min(1).max(64),
  packId: z.string().uuid(),
  packSlug: z.string().min(1).max(120),
  mode: z.enum(timelineModes),
  quizAnswered: z.number().int().min(0),
  quizCorrect: z.number().int().min(0),
  reorderAttempts: z.number().int().min(0),
  reorderSuccesses: z.number().int().min(0),
  viewedEventIds: z.array(z.string().uuid()),
  updatedAt: z.string().datetime(),
});

export type TimelineProgress = z.infer<typeof timelineProgressSchema>;

export function parseTimelinePack(raw: unknown): TimelinePack {
  const pack = timelinePackSchema.parse(raw);
  for (const ev of pack.events) {
    if (ev.yearEnd < ev.yearStart) {
      throw new Error(`Event ${ev.slug}: yearEnd < yearStart`);
    }
  }
  return pack;
}

export function filterEventsByRange(
  events: TimelineEvent[],
  yearStart: number,
  yearEnd: number,
): TimelineEvent[] {
  return events.filter(
    (e) => e.yearStart <= yearEnd && e.yearEnd >= yearStart,
  );
}

export function filterEventsByKinds(
  events: TimelineEvent[],
  kinds: TimelineEventKind[],
): TimelineEvent[] {
  if (kinds.length === 0) return events;
  const set = new Set(kinds);
  return events.filter((e) => set.has(e.kind));
}

export function sortEventsChronologically(
  events: TimelineEvent[],
): TimelineEvent[] {
  return [...events].sort((a, b) => {
    if (a.yearStart !== b.yearStart) return a.yearStart - b.yearStart;
    if (a.yearEnd !== b.yearEnd) return a.yearEnd - b.yearEnd;
    return a.title.localeCompare(b.title, "cs");
  });
}

/** Fisher–Yates shuffle copy. */
export function shuffleEvents(events: TimelineEvent[]): TimelineEvent[] {
  const arr = [...events];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function isChronologicalOrder(ids: string[], correctIds: string[]): boolean {
  if (ids.length !== correctIds.length) return false;
  return ids.every((id, i) => id === correctIds[i]);
}

export type ChronoQuizItem = {
  earlierId: string;
  laterId: string;
  prompt: string;
};

/** Pairwise chronology questions from a chronologically sorted list. */
export function pickChronoQuizPairs(
  sorted: TimelineEvent[],
  count = 5,
): ChronoQuizItem[] {
  const candidates: ChronoQuizItem[] = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    for (let j = i + 1; j < Math.min(i + 4, sorted.length); j += 1) {
      const a = sorted[i]!;
      const b = sorted[j]!;
      if (a.yearStart >= b.yearStart) continue;
      candidates.push({
        earlierId: a.id,
        laterId: b.id,
        prompt: "Která položka patří dřív na časové ose?",
      });
    }
  }
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, count);
}

export const kindLabelsCs: Record<TimelineEventKind, string> = {
  author: "Autor",
  work: "Dílo",
  event: "Událost",
  movement: "Směr",
};
