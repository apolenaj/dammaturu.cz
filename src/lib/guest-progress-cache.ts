/**
 * Client-side mirror of guest progress hints (backup when server FS is wiped).
 * Does not replace server stores — supplements them for reload resilience.
 */

import { GUEST_LOCAL_STORAGE_KEY } from "@/domain/viewer/types";

const PROGRESS_KEY = "dammaturu-guest-progress-v1";

export type GuestProgressSnapshot = {
  guestId: string;
  updatedAt: string;
  completedQuestionIds: string[];
  mistakeCount: number;
  reviewDueHint: number;
  lastPackSlug: string | null;
  lastLearnHref: string | null;
};

function readRaw(): GuestProgressSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GuestProgressSnapshot;
  } catch {
    return null;
  }
}

export function readGuestProgressSnapshot(): GuestProgressSnapshot | null {
  return readRaw();
}

export function writeGuestProgressSnapshot(
  patch: Partial<GuestProgressSnapshot> & { guestId: string },
): void {
  if (typeof window === "undefined") return;
  const prev = readRaw();
  const next: GuestProgressSnapshot = {
    guestId: patch.guestId,
    updatedAt: new Date().toISOString(),
    completedQuestionIds:
      patch.completedQuestionIds ?? prev?.completedQuestionIds ?? [],
    mistakeCount: patch.mistakeCount ?? prev?.mistakeCount ?? 0,
    reviewDueHint: patch.reviewDueHint ?? prev?.reviewDueHint ?? 0,
    lastPackSlug: patch.lastPackSlug ?? prev?.lastPackSlug ?? null,
    lastLearnHref: patch.lastLearnHref ?? prev?.lastLearnHref ?? null,
  };
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
    window.localStorage.setItem(GUEST_LOCAL_STORAGE_KEY, patch.guestId);
  } catch {
    // ignore
  }
}

export function noteGuestQuestionCompleted(input: {
  guestId: string;
  questionId: string;
  packSlug: string;
}): void {
  const prev = readRaw();
  const ids = new Set(prev?.completedQuestionIds ?? []);
  ids.add(input.questionId);
  writeGuestProgressSnapshot({
    guestId: input.guestId,
    completedQuestionIds: [...ids],
    lastPackSlug: input.packSlug,
  });
}

export function noteGuestMistake(guestId: string): void {
  const prev = readRaw();
  writeGuestProgressSnapshot({
    guestId,
    mistakeCount: (prev?.mistakeCount ?? 0) + 1,
  });
}
