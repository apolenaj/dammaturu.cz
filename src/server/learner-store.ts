import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { OnboardingInput } from "@/domain/onboarding/schema";
import type { StudyPlan } from "@/domain/onboarding/study-plan";
import {
  createBetaEnrollment,
  isBetaTargetDate,
  type BetaEnrollment,
} from "@/domain/learning/beta-profile";
import type { DiagnosticBaseline } from "@/domain/learning/beta-feedback";
import { canPersistLocalFs } from "@/server/runtime/local-fs";

export type LearnerRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  onboardingCompletedAt: string;
  profile: OnboardingInput;
  studyPlan: StudyPlan;
  /** Private beta enrollment — set when target is beta deadline. */
  beta?: BetaEnrollment;
  /** Set after real diagnostic session (not demo). */
  diagnosticBaseline?: DiagnosticBaseline;
};

const DATA_DIR = path.join(process.cwd(), "data", "learners");

/** Process-local cache — used on Vercel (no durable FS) and as write-through locally. */
const memoryLearners = new Map<string, LearnerRecord>();

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function filePath(id: string) {
  // Prevent path traversal
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error("Neplatné ID profilu");
  }
  return path.join(DATA_DIR, `${id}.json`);
}

export async function createLearnerId(): Promise<string> {
  return randomUUID().replace(/-/g, "");
}

export async function saveLearner(record: LearnerRecord): Promise<void> {
  memoryLearners.set(record.id, record);
  if (!canPersistLocalFs()) return;

  await ensureDir();
  const dest = filePath(record.id);
  // Unique tmp avoids parallel upsert races (same .tmp path → ENOENT on rename).
  const tmp = `${dest}.${process.pid}.${Date.now()}.${Math.random()
    .toString(16)
    .slice(2)}.tmp`;
  const payload = `${JSON.stringify(record, null, 2)}\n`;
  await fs.writeFile(tmp, payload, "utf8");
  try {
    await fs.rename(tmp, dest);
  } catch (error) {
    await fs.unlink(tmp).catch(() => undefined);
    throw error;
  }
}

export async function getLearner(
  id: string,
): Promise<LearnerRecord | null> {
  const cached = memoryLearners.get(id);
  if (cached) return cached;

  if (!canPersistLocalFs()) return null;

  try {
    const raw = await fs.readFile(filePath(id), "utf8");
    const record = JSON.parse(raw) as LearnerRecord;
    memoryLearners.set(id, record);
    return record;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT" || err.code === "EROFS" || err.code === "EACCES") {
      return null;
    }
    throw error;
  }
}

export async function upsertLearner(params: {
  id?: string;
  profile: OnboardingInput;
  studyPlan: StudyPlan;
}): Promise<LearnerRecord> {
  const now = new Date().toISOString();
  const existing = params.id ? await getLearner(params.id) : null;
  const id = existing?.id ?? params.id ?? (await createLearnerId());

  const record: LearnerRecord = {
    id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    onboardingCompletedAt: existing?.onboardingCompletedAt ?? now,
    profile: params.profile,
    studyPlan: params.studyPlan,
    beta:
      existing?.beta ??
      (isBetaTargetDate(params.profile.targetDate)
        ? createBetaEnrollment(now)
        : undefined),
    diagnosticBaseline: existing?.diagnosticBaseline,
  };

  await saveLearner(record);
  return record;
}

export async function patchLearnerDiagnosticBaseline(
  learnerId: string,
  baseline: DiagnosticBaseline,
): Promise<LearnerRecord | null> {
  const existing = await getLearner(learnerId);
  if (!existing) return null;
  const next: LearnerRecord = {
    ...existing,
    diagnosticBaseline: baseline,
    updatedAt: new Date().toISOString(),
  };
  await saveLearner(next);
  return next;
}

/** Test helper — clear process-local cache. */
export function clearLearnerMemoryForTests(): void {
  memoryLearners.clear();
}
