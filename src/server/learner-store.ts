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
  await ensureDir();
  const tmp = `${filePath(record.id)}.tmp`;
  const payload = `${JSON.stringify(record, null, 2)}\n`;
  await fs.writeFile(tmp, payload, "utf8");
  await fs.rename(tmp, filePath(record.id));
}

export async function getLearner(
  id: string,
): Promise<LearnerRecord | null> {
  try {
    const raw = await fs.readFile(filePath(id), "utf8");
    return JSON.parse(raw) as LearnerRecord;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
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
