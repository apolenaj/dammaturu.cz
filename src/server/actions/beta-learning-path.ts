"use server";

import {
  buildBetaLearningPath,
  diagnosticFromAreaScores,
  emptyDiagnosticSnapshot,
  type BetaLearningPath,
  type DiagnosticSnapshot,
} from "@/domain/learning/beta-learning-path";
import { betaConfig } from "@/domain/learning/beta-profile";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";
import { getDefaultCurriculumPack } from "@/server/curriculum/store";
import { getReadinessSnapshotForLearner } from "@/server/readiness/store";
import { track } from "@/lib/analytics";

/**
 * Optional persisted diagnostic override (future). For now derive from readiness
 * when learner has evidence, else empty → default curriculum order.
 */
export async function getBetaLearningPathAction(): Promise<{
  path: BetaLearningPath | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { path: null, learnerId: null };

  const [learner, pack, readiness] = await Promise.all([
    getLearner(learnerId),
    getDefaultCurriculumPack(),
    getReadinessSnapshotForLearner({ learnerId }),
  ]);

  if (!learner || !pack) return { path: null, learnerId };

  const diagnostic = buildDiagnosticFromLearner({
    wantsDiagnostic: learner.profile.wantsDiagnostic,
    readinessOverall: readiness?.snapshot.overallPct ?? null,
    areas: readiness?.snapshot.areas ?? [],
    lowEvidence: readiness?.snapshot.lowEvidence ?? true,
    weekDelta: readiness?.snapshot.weekDeltaPct ?? null,
    baselineCompleted: Boolean(learner.diagnosticBaseline),
    baselineAccuracy: learner.diagnosticBaseline?.accuracyPct ?? null,
  });

  const path = buildBetaLearningPath({
    pack,
    diagnostic,
    targetDate: learner.profile.targetDate || betaConfig.targetDate,
  });

  track("beta_learning_path_generated", {
    curriculumSlug: path.curriculumSlug,
    diagnosticApplied: path.diagnosticApplied,
    currentPhase: path.currentPhaseId,
    topicCount: path.phases.reduce((n, p) => n + p.topics.length, 0),
  });

  return { path, learnerId };
}

function buildDiagnosticFromLearner(input: {
  wantsDiagnostic: boolean;
  readinessOverall: number | null;
  areas: Array<{ id: string; pct: number }>;
  lowEvidence: boolean;
  weekDelta: number | null;
  baselineCompleted: boolean;
  baselineAccuracy: number | null;
}): DiagnosticSnapshot {
  // Real diagnostic session completed → adapted path
  if (input.baselineCompleted) {
    if (input.areas.length > 0) {
      return diagnosticFromAreaScores({
        completed: true,
        areaScores: input.areas.map((a) => ({ id: a.id, pct: a.pct })),
        completedAt: new Date().toISOString(),
      });
    }
    const pct = input.baselineAccuracy ?? 50;
    return diagnosticFromAreaScores({
      completed: true,
      areaScores: [
        { id: "literarni-smery", pct },
        { id: "autori-dila", pct },
        { id: "rozbory", pct },
        { id: "jazyk", pct },
      ],
      completedAt: new Date().toISOString(),
    });
  }

  const hasSignal =
    input.areas.length > 0 &&
    !input.lowEvidence &&
    input.readinessOverall != null;

  if (input.wantsDiagnostic && !input.baselineCompleted) {
    return emptyDiagnosticSnapshot();
  }
  if (!hasSignal) {
    return emptyDiagnosticSnapshot();
  }

  return diagnosticFromAreaScores({
    completed: true,
    areaScores: input.areas.map((a) => ({ id: a.id, pct: a.pct })),
    completedAt: new Date().toISOString(),
  });
}
