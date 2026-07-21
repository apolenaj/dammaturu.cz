import { promises as fs } from "node:fs";
import path from "node:path";
import {
  materialsStudyScheduleSchema,
  type MaterialsStudySchedule,
} from "@/domain/learning/materials-study-session";
import { createScheduleEntry } from "@/domain/learning/scheduler";
import type { ReviewGrade } from "@/domain/learning/scheduler";
import { applySm2 } from "@/domain/learning/scheduler";

export const MATERIALS_STUDY_DIR = path.join(
  process.cwd(),
  "data",
  "materials-study",
);
const SCHEDULES_DIR = path.join(MATERIALS_STUDY_DIR, "schedules");

async function ensureDirs() {
  await fs.mkdir(SCHEDULES_DIR, { recursive: true });
}

function schedulePath(learnerId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) {
    throw new Error("Neplatné learner id");
  }
  return path.join(SCHEDULES_DIR, `${learnerId}.json`);
}

export async function getMaterialsStudySchedule(
  learnerId: string,
): Promise<MaterialsStudySchedule> {
  try {
    return materialsStudyScheduleSchema.parse(
      JSON.parse(await fs.readFile(schedulePath(learnerId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return {
        learnerId,
        byItemKey: {},
        updatedAt: new Date().toISOString(),
      };
    }
    throw error;
  }
}

export async function saveMaterialsStudySchedule(
  schedule: MaterialsStudySchedule,
): Promise<void> {
  const validated = materialsStudyScheduleSchema.parse(schedule);
  await ensureDirs();
  const file = schedulePath(validated.learnerId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

/** Schedule key = knowledge unit id (stable across sessions). */
export async function applyMaterialsReviewSchedule(params: {
  learnerId: string;
  knowledgeUnitId: string;
  grade: ReviewGrade;
  nowIso?: string;
}): Promise<{ dueAt: string; intervalDays: number }> {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const schedule = await getMaterialsStudySchedule(params.learnerId);
  const prev =
    schedule.byItemKey[params.knowledgeUnitId] ??
    createScheduleEntry(params.knowledgeUnitId, nowIso);
  const { entry } = applySm2(prev, params.grade, nowIso);
  const next: MaterialsStudySchedule = {
    learnerId: params.learnerId,
    byItemKey: { ...schedule.byItemKey, [params.knowledgeUnitId]: entry },
    updatedAt: nowIso,
  };
  await saveMaterialsStudySchedule(next);
  return { dueAt: entry.dueAt, intervalDays: entry.intervalDays };
}
