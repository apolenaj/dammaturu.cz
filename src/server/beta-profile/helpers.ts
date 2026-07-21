import { promises as fs } from "node:fs";
import path from "node:path";
import {
  betaConfig,
  createBetaEnrollment,
  daysBetweenKeys,
  type BetaEnrollment,
  type NeglectedTopicRow,
} from "@/domain/learning/beta-profile";
import { dateKeyFromDate } from "@/domain/learning/daily-dashboard";
import type { LearnerRecord } from "@/server/learner-store";
import { assertSafeId } from "@/server/safe-id";

const LEARNERS_DIR = path.join(process.cwd(), "data", "learners");
const DAYS_DIR = path.join(process.cwd(), "data", "daily-dashboard", "days");

export async function listLearnerRecords(): Promise<LearnerRecord[]> {
  try {
    const files = await fs.readdir(LEARNERS_DIR);
    const out: LearnerRecord[] = [];
    for (const f of files) {
      if (!f.endsWith(".json") || f.endsWith(".tmp")) continue;
      try {
        const raw = JSON.parse(
          await fs.readFile(path.join(LEARNERS_DIR, f), "utf8"),
        ) as LearnerRecord;
        if (raw?.id) out.push(raw);
      } catch {
        // skip
      }
    }
    return out;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw error;
  }
}

export function resolveBetaEnrollment(
  record: LearnerRecord,
  nowIso = new Date().toISOString(),
): BetaEnrollment | null {
  const existing = (record as LearnerRecord & { beta?: BetaEnrollment }).beta;
  if (existing?.mode) return existing;
  if (record.profile.targetDate === betaConfig.targetDate) {
    return createBetaEnrollment(record.onboardingCompletedAt || nowIso);
  }
  return null;
}

export async function countCompletedMissionDays(input: {
  learnerId: string;
  windowDays: number;
  now?: Date;
}): Promise<{ completed: number; expected: number }> {
  const learnerId = assertSafeId(input.learnerId, "learner id");
  const now = input.now ?? new Date();
  let completed = 0;
  for (let i = 0; i < input.windowDays; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dateKeyFromDate(d);
    try {
      const raw = JSON.parse(
        await fs.readFile(
          path.join(DAYS_DIR, `${learnerId}__${key}.json`),
          "utf8",
        ),
      ) as { completedAt?: string | null };
      if (raw.completedAt) completed += 1;
    } catch {
      // missing day
    }
  }
  return { completed, expected: input.windowDays };
}

export function buildNeglectedTopics(input: {
  topicSlugs: string[];
  lastSeenBySlug: Record<string, string | null>;
  todayKey: string;
  neglectDays: number;
}): NeglectedTopicRow[] {
  const rows: NeglectedTopicRow[] = [];
  for (const topicSlug of input.topicSlugs) {
    const last = input.lastSeenBySlug[topicSlug] ?? null;
    const daysSince = last ? daysBetweenKeys(last, input.todayKey) : null;
    if (daysSince == null || daysSince >= input.neglectDays) {
      rows.push({
        topicSlug,
        lastSeenDateKey: last,
        daysSince,
      });
    }
  }
  return rows.sort((a, b) => (b.daysSince ?? 999) - (a.daysSince ?? 999));
}

export function lastSeenFromEvents(
  events: Array<{ topicSlug?: string; dateKey: string }>,
): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const e of events) {
    if (!e.topicSlug) continue;
    const prev = map[e.topicSlug];
    if (!prev || e.dateKey > prev) map[e.topicSlug] = e.dateKey;
  }
  return map;
}
