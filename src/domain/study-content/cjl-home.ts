/**
 * ČJL study entry — view model helpers.
 * Progress/mastery only from real evidence; never invent percentages.
 */

import type {
  StudyContentEntry,
  StudyContentProgress,
} from "@/domain/study-content/registry";

export type MasteryEvidence =
  | {
      kind: "insufficient";
      labelCs: "Ještě nemáme dost výsledků";
    }
  | {
      kind: "supported";
      /** Raw counts only — no fabricated %. */
      correct: number;
      attempts: number;
      labelCs: string;
    };

export type TopicCardModel = {
  topicId: string;
  topicName: string;
  materialCount: number;
  studyUnitCount: number;
  chunkCount: number;
  completedChunks: number;
  completedUnits: number;
  /** Materials with some study progress but no quick-test evidence yet. */
  dueForReviewCount: number;
  mastery: MasteryEvidence;
  primaryCta: { label: string; href: string };
  /** First catalog material in this topic (for deep links). */
  leadSourceId: string;
};

export type CjlNowAction = {
  kind: "continue" | "start";
  href: string;
  titleCs: string;
  detailCs: string;
  ctaLabel: "Pokračovat v učení" | "Začni tady";
  sourceId: string;
};

export type CjlFastAction = {
  id: string;
  label: string;
  href: string;
};

export type CjlHomeView = {
  subject: "Český jazyk a literatura";
  materialsAvailable: number;
  /** Factual completion: chunks read across catalog. */
  completedChunks: number;
  totalChunks: number;
  completedUnits: number;
  totalUnits: number;
  weakLabelCs: string;
  weakHref: string | null;
  now: CjlNowAction;
  fastActions: CjlFastAction[];
  topics: TopicCardModel[];
  isFirstTime: boolean;
};

const MIN_TEST_ATTEMPTS_FOR_MASTERY = 5;

export function slugifyTopic(topic: string): string {
  return topic
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export function buildMasteryEvidence(
  correct: number,
  attempts: number,
): MasteryEvidence {
  if (attempts < MIN_TEST_ATTEMPTS_FOR_MASTERY) {
    return {
      kind: "insufficient",
      labelCs: "Ještě nemáme dost výsledků",
    };
  }
  return {
    kind: "supported",
    correct,
    attempts,
    labelCs: `V testech: ${correct} správně z ${attempts}`,
  };
}

export function progressDetailCs(
  completedChunks: number,
  totalChunks: number,
): string {
  if (totalChunks <= 0) return "Bez načtených úseků";
  if (completedChunks <= 0) return "Ještě jsi nezačal/a";
  if (completedChunks >= totalChunks) return `Hotovo ${completedChunks} úseků`;
  return `Přečteno ${completedChunks} z ${totalChunks} úseků`;
}

type TopicBucket = {
  topicName: string;
  entries: StudyContentEntry[];
};

export function groupCatalogByTopic(
  entries: StudyContentEntry[],
): TopicBucket[] {
  const map = new Map<string, TopicBucket>();
  for (const e of entries) {
    const key = e.topic;
    const bucket = map.get(key) ?? { topicName: key, entries: [] };
    bucket.entries.push(e);
    map.set(key, bucket);
  }
  return [...map.values()].sort((a, b) =>
    a.topicName.localeCompare(b.topicName, "cs"),
  );
}

export function buildTopicCard(
  bucket: TopicBucket,
  progressBySource: Map<string, StudyContentProgress>,
): TopicCardModel {
  const entries = bucket.entries;
  let studyUnitCount = 0;
  let chunkCount = 0;
  let completedChunks = 0;
  let completedUnits = 0;
  let testCorrect = 0;
  let testAttempts = 0;
  let dueForReviewCount = 0;

  for (const e of entries) {
    studyUnitCount += e.knowledgeUnits.length;
    chunkCount += e.chunks.length;
    const p = progressBySource.get(e.sourceId);
    if (p) {
      completedChunks += p.completedChunkIds.length;
      completedUnits += p.completedUnitIds.length;
      testCorrect += p.quickTestCorrect;
      testAttempts += p.quickTestAttempts;
      const started =
        p.completedChunkIds.length > 0 || p.completedUnitIds.length > 0;
      if (started && p.quickTestAttempts === 0) {
        dueForReviewCount += 1;
      }
    }
  }

  const lead =
    entries.find((e) => {
      const p = progressBySource.get(e.sourceId);
      if (!p) return true;
      return p.completedChunkIds.length < e.chunks.length;
    }) ?? entries[0]!;

  const leadProgress = progressBySource.get(lead.sourceId);
  const leadStarted = Boolean(
    leadProgress &&
      (leadProgress.completedChunkIds.length > 0 ||
        leadProgress.completedUnitIds.length > 0),
  );

  const primaryCta = {
    label: leadStarted ? "Pokračovat" : "Začít",
    href: leadStarted
      ? `/app/materials/katalog/${lead.sourceId}?continue=1&mode=learn`
      : `/app/materials/katalog/${lead.sourceId}?mode=learn`,
  };

  return {
    topicId: slugifyTopic(bucket.topicName),
    topicName: bucket.topicName,
    materialCount: entries.length,
    studyUnitCount,
    chunkCount,
    completedChunks,
    completedUnits,
    dueForReviewCount,
    mastery: buildMasteryEvidence(testCorrect, testAttempts),
    primaryCta,
    leadSourceId: lead.sourceId,
  };
}

export function pickNowAction(
  entries: StudyContentEntry[],
  progressBySource: Map<string, StudyContentProgress>,
): { now: CjlNowAction; isFirstTime: boolean } {
  const withProgress = entries
    .map((e) => ({ entry: e, progress: progressBySource.get(e.sourceId) }))
    .filter((x) => x.progress)
    .sort(
      (a, b) =>
        (b.progress!.lastOpenedAt || "").localeCompare(
          a.progress!.lastOpenedAt || "",
        ),
    );

  for (const { entry, progress } of withProgress) {
    if (!progress) continue;
    const incomplete =
      progress.completedChunkIds.length < entry.chunks.length ||
      progress.completedUnitIds.length < entry.knowledgeUnits.length;
    if (incomplete || progress.completedChunkIds.length > 0) {
      return {
        isFirstTime: false,
        now: {
          kind: "continue",
          sourceId: entry.sourceId,
          href: `/app/materials/katalog/${entry.sourceId}?continue=1&mode=learn`,
          titleCs: entry.title,
          detailCs: progressDetailCs(
            progress.completedChunkIds.length,
            entry.chunks.length,
          ),
          ctaLabel: "Pokračovat v učení",
        },
      };
    }
  }

  // First-time: curriculum-friendly order — first available catalog entry.
  const first =
    entries.find((e) => e.parseComplete && e.chunks.length > 0) ?? entries[0]!;

  return {
    isFirstTime: true,
    now: {
      kind: "start",
      sourceId: first.sourceId,
      href: `/app/materials/katalog/${first.sourceId}?mode=learn`,
      titleCs: first.title,
      detailCs: "Nejvhodnější první materiál z katalogu ČJL.",
      ctaLabel: "Začni tady",
    },
  };
}
