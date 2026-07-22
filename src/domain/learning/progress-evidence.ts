/**
 * Progress views from real mastery + mistake + schedule evidence.
 * Never invents a Maturita Score here — readiness stays gated separately.
 */

import {
  MASTERY_TRANSPARENCY_DISCLAIMER_CS,
  normalizeMasteryState,
  toTransparentMasteryState,
  transparentMasteryStateLabelsCs,
  type MasteryState,
  type TransparentMasteryState,
} from "@/domain/learning/mastery-engine";
import type { ErrorMemoryBook } from "@/domain/learning/error-memory";
import { listActiveMemories } from "@/domain/learning/error-memory";
import type { ScheduleEntry } from "@/domain/learning/scheduler";

export type ProgressUnitRow = {
  knowledgeUnitId: string;
  title: string;
  topic: string;
  transparent: TransparentMasteryState;
  transparentLabel: string;
  score: number;
  evidenceCount: number;
  retrievalEvidenceCount: number;
  lastEvidenceAt: string | null;
  dueAt: string | null;
};

export type ProgressTopicRow = {
  topic: string;
  unitCount: number;
  avgScore: number;
  byState: Record<TransparentMasteryState, number>;
  dominant: TransparentMasteryState;
};

export type ProgressEvidenceView = {
  disclaimerCs: string;
  byTopic: ProgressTopicRow[];
  byKnowledgeUnit: ProgressUnitRow[];
  last7Days: {
    unitsTouched: number;
    gradedEvidenceApprox: number;
    newMistakes: number;
  };
  dueToday: ProgressUnitRow[];
  strongest: ProgressUnitRow[];
  weakest: ProgressUnitRow[];
  totalUnits: number;
  evidenceReady: boolean;
  /** Minimum graded evidence across units before claiming readiness-ready. */
  minEvidenceHintCs: string;
};

export type ProgressUnitInput = {
  id: string;
  title: string;
  topic?: string;
  examWeight?: number;
  state: MasteryState;
};

const MIN_UNITS_FOR_PROGRESS = 3;
const MIN_EVIDENCE_EVENTS = 8;

export function buildProgressEvidenceView(input: {
  units: ProgressUnitInput[];
  errorBook?: ErrorMemoryBook | null;
  scheduleEntries?: ScheduleEntry[];
  nowIso?: string;
}): ProgressEvidenceView {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const now = new Date(nowIso).getTime();
  const weekAgo = now - 7 * 24 * 3600_000;

  const dueById = new Map<string, string>();
  for (const e of input.scheduleEntries ?? []) {
    dueById.set(e.cardId, e.dueAt);
  }

  const rows: ProgressUnitRow[] = input.units.map((u) => {
    const state = normalizeMasteryState(u.state);
    const transparent = toTransparentMasteryState(state);
    return {
      knowledgeUnitId: u.id,
      title: u.title,
      topic: u.topic ?? "Obecné",
      transparent,
      transparentLabel: transparentMasteryStateLabelsCs[transparent],
      score: state.score,
      evidenceCount: state.evidenceCount,
      retrievalEvidenceCount: state.retrievalEvidenceCount ?? 0,
      lastEvidenceAt: state.lastEvidenceAt,
      dueAt: dueById.get(u.id) ?? null,
    };
  });

  const byTopicMap = new Map<string, ProgressUnitRow[]>();
  for (const r of rows) {
    const list = byTopicMap.get(r.topic) ?? [];
    list.push(r);
    byTopicMap.set(r.topic, list);
  }

  const byTopic: ProgressTopicRow[] = [...byTopicMap.entries()]
    .map(([topic, list]) => {
      const byState = {
        new: 0,
        learning: 0,
        fragile: 0,
        stable: 0,
        mastered: 0,
      } as Record<TransparentMasteryState, number>;
      let sum = 0;
      for (const r of list) {
        byState[r.transparent] += 1;
        sum += r.score;
      }
      const dominant = (
        Object.entries(byState) as [TransparentMasteryState, number][]
      ).sort((a, b) => b[1] - a[1])[0]![0];
      return {
        topic,
        unitCount: list.length,
        avgScore: list.length ? Math.round((sum / list.length) * 10) / 10 : 0,
        byState,
        dominant,
      };
    })
    .sort((a, b) => b.unitCount - a.unitCount);

  const last7Touched = rows.filter((r) => {
    if (!r.lastEvidenceAt) return false;
    return new Date(r.lastEvidenceAt).getTime() >= weekAgo;
  });
  const gradedEvidenceApprox = last7Touched.reduce(
    (n, r) => n + Math.min(r.evidenceCount, 5),
    0,
  );
  const emptyBook: ErrorMemoryBook = {
    learnerId: "anon",
    memories: [],
    updatedAt: nowIso,
  };
  const newMistakes = listActiveMemories(input.errorBook ?? emptyBook).filter(
    (m) => new Date(m.lastOccurredAt).getTime() >= weekAgo,
  ).length;

  const dueToday = rows
    .filter((r) => r.dueAt && new Date(r.dueAt).getTime() <= now)
    .sort(
      (a, b) =>
        new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime(),
    )
    .slice(0, 12);

  const withEvidence = rows.filter((r) => r.retrievalEvidenceCount > 0);
  const strongest = [...withEvidence]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const weakest = [...withEvidence]
    .sort((a, b) => a.score - b.score)
    .slice(0, 8);

  const totalEvidence = rows.reduce((n, r) => n + r.evidenceCount, 0);
  const evidenceReady =
    rows.length >= MIN_UNITS_FOR_PROGRESS &&
    totalEvidence >= MIN_EVIDENCE_EVENTS;

  return {
    disclaimerCs: MASTERY_TRANSPARENCY_DISCLAIMER_CS,
    byTopic,
    byKnowledgeUnit: [...rows].sort((a, b) => a.score - b.score),
    last7Days: {
      unitsTouched: last7Touched.length,
      gradedEvidenceApprox,
      newMistakes,
    },
    dueToday,
    strongest,
    weakest,
    totalUnits: rows.length,
    evidenceReady,
    minEvidenceHintCs: evidenceReady
      ? "Máš dost cvičení na přehled zvládnutí."
      : `Na spolehlivý přehled potřebuješ aspoň ${MIN_UNITS_FOR_PROGRESS} témat a ${MIN_EVIDENCE_EVENTS} hodnocených pokusů (teď ${rows.length} / ${totalEvidence}).`,
  };
}
