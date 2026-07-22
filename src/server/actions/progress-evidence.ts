"use server";

import { buildProgressEvidenceView, type ProgressEvidenceView } from "@/domain/learning/progress-evidence";
import { getOrCreateErrorBook } from "@/server/error-memory/store";
import { getReadinessBook } from "@/server/readiness/store";
import { resolveLearnerIdForAction } from "@/server/viewer-session";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ScheduleEntry } from "@/domain/learning/scheduler";

async function loadScheduleEntries(
  learnerId: string,
): Promise<ScheduleEntry[]> {
  const files = [
    path.join(process.cwd(), "data", "learning-session-schedule", `${learnerId}.json`),
    path.join(process.cwd(), "data", "spaced-repetition", `${learnerId}.json`),
  ];
  const out: ScheduleEntry[] = [];
  for (const file of files) {
    try {
      const raw = JSON.parse(await fs.readFile(file, "utf8")) as {
        entries?: Record<string, ScheduleEntry>;
        cards?: ScheduleEntry[];
      };
      if (raw.entries) {
        out.push(...Object.values(raw.entries));
      }
      if (Array.isArray(raw.cards)) {
        out.push(...raw.cards);
      }
    } catch {
      // missing ok
    }
  }
  return out;
}

export async function getProgressEvidenceAction(): Promise<{
  view: ProgressEvidenceView | null;
  learnerId: string | null;
}> {
  const learnerId = await resolveLearnerIdForAction();
  if (!learnerId) return { view: null, learnerId: null };

  const [readiness, errorBook, scheduleEntries] = await Promise.all([
    getReadinessBook(learnerId),
    getOrCreateErrorBook(learnerId),
    loadScheduleEntries(learnerId),
  ]);

  const units = (readiness?.units ?? []).map((u) => ({
    id: u.id,
    title: u.title,
    topic: u.areaId,
    examWeight: u.examWeight,
    state: u.state,
  }));

  const view = buildProgressEvidenceView({
    units,
    errorBook,
    scheduleEntries,
  });

  return { view, learnerId };
}
