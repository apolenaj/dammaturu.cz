import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { LessonDocument } from "@/domain/learning/lesson";
import {
  lessonInteractionSchema,
  lessonProgressSchema,
  type LessonInteraction,
  type LessonInteractionKind,
  type LessonProgress,
} from "@/domain/learning/interactions";
import {
  applyInteractionToMastery,
  type MasterySnapshot,
} from "@/domain/learning/mastery";

const ROOT = path.join(process.cwd(), "data", "lesson-engine");
const INTERACTIONS_PATH = path.join(ROOT, "interactions.jsonl");
const PROGRESS_DIR = path.join(ROOT, "progress");
const MASTERY_DIR = path.join(ROOT, "mastery");

async function ensureDirs() {
  await fs.mkdir(PROGRESS_DIR, { recursive: true });
  await fs.mkdir(MASTERY_DIR, { recursive: true });
}

function progressPath(learnerId: string, lessonId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) throw new Error("Neplatné learner id");
  if (!/^[a-f0-9-]{36}$/i.test(lessonId)) throw new Error("Neplatné lesson id");
  return path.join(PROGRESS_DIR, `${learnerId}__${lessonId}.json`);
}

function masteryPath(learnerId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) throw new Error("Neplatné learner id");
  return path.join(MASTERY_DIR, `${learnerId}.json`);
}

export async function appendInteraction(
  entry: Omit<LessonInteraction, "id" | "at"> & { at?: string },
): Promise<LessonInteraction> {
  await ensureDirs();
  const full = lessonInteractionSchema.parse({
    ...entry,
    id: randomUUID(),
    at: entry.at ?? new Date().toISOString(),
  });
  await fs.appendFile(INTERACTIONS_PATH, `${JSON.stringify(full)}\n`, "utf8");
  return full;
}

export async function getProgress(
  learnerId: string,
  lessonId: string,
): Promise<LessonProgress | null> {
  try {
    const raw = await fs.readFile(progressPath(learnerId, lessonId), "utf8");
    return lessonProgressSchema.parse(JSON.parse(raw));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveProgress(progress: LessonProgress): Promise<void> {
  await ensureDirs();
  const validated = lessonProgressSchema.parse(progress);
  const file = progressPath(validated.learnerId, validated.lessonId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function getMasteryMap(
  learnerId: string,
): Promise<Record<string, MasterySnapshot>> {
  try {
    const raw = await fs.readFile(masteryPath(learnerId), "utf8");
    return JSON.parse(raw) as Record<string, MasterySnapshot>;
  } catch {
    return {};
  }
}

async function saveMasteryMap(
  learnerId: string,
  map: Record<string, MasterySnapshot>,
): Promise<void> {
  await ensureDirs();
  const file = masteryPath(learnerId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(map, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export type RecordLessonActionInput = {
  learnerId: string;
  lesson: LessonDocument;
  blockId: string | null;
  kind: LessonInteractionKind;
  payload?: LessonInteraction["payload"];
  /** For graded actions */
  success?: boolean | null;
  /** Move player index */
  nextBlockIndex?: number;
};

export async function recordLessonAction(
  input: RecordLessonActionInput,
): Promise<{
  interaction: LessonInteraction;
  progress: LessonProgress;
  mastery: Record<string, MasterySnapshot>;
}> {
  const now = new Date().toISOString();
  const block = input.blockId
    ? input.lesson.blocks.find((b) => b.id === input.blockId)
    : null;

  const kuIds = [
    ...new Set([
      ...(block?.knowledgeUnitIds ?? []),
      ...input.lesson.knowledgeUnitIds,
    ]),
  ];

  const interaction = await appendInteraction({
    learnerId: input.learnerId,
    lessonId: input.lesson.id,
    lessonSlug: input.lesson.slug,
    blockId: input.blockId,
    blockType: block?.type ?? null,
    kind: input.kind,
    knowledgeUnitIds: kuIds,
    payload: input.payload,
    at: now,
  });

  const progress =
    (await getProgress(input.learnerId, input.lesson.id)) ??
    ({
      learnerId: input.learnerId,
      lessonId: input.lesson.id,
      lessonSlug: input.lesson.slug,
      currentBlockIndex: 0,
      completedBlockIds: [],
      understoodBlockIds: [],
      unknownBlockIds: [],
      status: "in_progress",
      savedAt: now,
      updatedAt: now,
    } satisfies LessonProgress);

  if (typeof input.nextBlockIndex === "number") {
    progress.currentBlockIndex = Math.max(
      0,
      Math.min(input.nextBlockIndex, input.lesson.blocks.length - 1),
    );
  }

  if (input.blockId && input.kind === "continue") {
    if (!progress.completedBlockIds.includes(input.blockId)) {
      progress.completedBlockIds = [...progress.completedBlockIds, input.blockId];
    }
  }
  if (input.blockId && input.kind === "understand") {
    progress.understoodBlockIds = [
      ...new Set([...progress.understoodBlockIds, input.blockId]),
    ];
    progress.unknownBlockIds = progress.unknownBlockIds.filter(
      (id) => id !== input.blockId,
    );
  }
  if (input.blockId && input.kind === "dont_know") {
    progress.unknownBlockIds = [
      ...new Set([...progress.unknownBlockIds, input.blockId]),
    ];
  }
  if (input.kind === "save") {
    progress.savedAt = now;
  }
  if (input.kind === "lesson_completed") {
    progress.status = "completed";
    progress.currentBlockIndex = input.lesson.blocks.length - 1;
  }

  progress.updatedAt = now;
  await saveProgress(progress);

  const masteryMap = await getMasteryMap(input.learnerId);
  const targetKus =
    kuIds.length > 0 ? kuIds : input.lesson.knowledgeUnitIds.slice(0, 1);

  for (const kuId of targetKus) {
    masteryMap[kuId] = applyInteractionToMastery(masteryMap[kuId] ?? null, {
      knowledgeUnitId: kuId,
      kind: input.kind,
      at: now,
      success: input.success,
    });
  }
  await saveMasteryMap(input.learnerId, masteryMap);

  return { interaction, progress, mastery: masteryMap };
}
