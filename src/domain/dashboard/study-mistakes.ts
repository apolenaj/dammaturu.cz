/**
 * LocalStorage úložiště chyb pro Opakovačku (kartičky „Ještě ne“ + špatné testy).
 */

export type StudyMistakeItem = {
  id: string;
  materialId: string;
  kind: "flashcard" | "quiz";
  prompt: string;
  answer: string;
  createdAt: string;
};

const STORAGE_KEY = "dm_study_mistakes_v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): StudyMistakeItem[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StudyMistakeItem =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as StudyMistakeItem).id === "string" &&
        typeof (item as StudyMistakeItem).materialId === "string" &&
        typeof (item as StudyMistakeItem).prompt === "string" &&
        typeof (item as StudyMistakeItem).answer === "string",
    );
  } catch {
    return [];
  }
}

function writeAll(items: StudyMistakeItem[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 200)));
}

export function listMistakesForMaterial(materialId: string): StudyMistakeItem[] {
  return readAll()
    .filter((m) => m.materialId === materialId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addStudyMistake(input: {
  materialId: string;
  kind: "flashcard" | "quiz";
  prompt: string;
  answer: string;
  sourceId?: string;
}): StudyMistakeItem {
  const items = readAll();
  const dedupeKey = `${input.materialId}::${input.kind}::${input.prompt.slice(0, 80)}`;
  const withoutDup = items.filter(
    (m) => `${m.materialId}::${m.kind}::${m.prompt.slice(0, 80)}` !== dedupeKey,
  );
  const next: StudyMistakeItem = {
    id: input.sourceId
      ? `m-${input.sourceId}`
      : `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    materialId: input.materialId,
    kind: input.kind,
    prompt: input.prompt.trim(),
    answer: input.answer.trim(),
    createdAt: new Date().toISOString(),
  };
  writeAll([next, ...withoutDup]);
  return next;
}

export function removeStudyMistake(id: string): void {
  writeAll(readAll().filter((m) => m.id !== id));
}

export function clearMistakesForMaterial(materialId: string): void {
  writeAll(readAll().filter((m) => m.materialId !== materialId));
}
