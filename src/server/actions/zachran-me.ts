"use server";

import {
  buildCermatTriageCandidates,
  buildMaterialsTriageCandidates,
  buildMistakeTriageCandidates,
  buildOverdueTriageCandidate,
  buildZachranMePlan,
  zachranMeConfig,
  zachranMeInputSchema,
  type TriageCandidate,
  type ZachranMeInput,
  type ZachranMePlan,
  type ZachranMeScope,
} from "@/domain/learning/zachran-me";
import { listActiveMemories } from "@/domain/learning/error-memory";
import { track } from "@/lib/analytics";
import { clientSafeError } from "@/lib/security/hardening";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";
import { getDueSummaryForLearner } from "@/server/spaced-repetition/store";
import { getCermatProgress } from "@/server/cermat-prep/store";
import { listLearnerMaterials } from "@/server/learner-materials/store";
import { getErrorBook } from "@/server/error-memory/store";
import { countDueLearningAtoms } from "@/server/learning-session/schedule-store";

type Fail = { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function getZachranMeDefaultsAction(): Promise<{
  examDate: string;
  dailyMinutes: number;
  scope: ZachranMeScope;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) {
    return {
      examDate: zachranMeConfig.betaTargetDate,
      dailyMinutes: zachranMeConfig.defaultDailyMinutes,
      scope: "both",
      learnerId: null,
    };
  }
  const learner = await getLearner(learnerId);
  if (!learner) {
    return {
      examDate: zachranMeConfig.betaTargetDate,
      dailyMinutes: zachranMeConfig.defaultDailyMinutes,
      scope: "both",
      learnerId,
    };
  }
  return {
    examDate: learner.profile.targetDate || zachranMeConfig.betaTargetDate,
    dailyMinutes: Math.min(
      zachranMeConfig.maxDailyMinutes,
      Math.max(
        zachranMeConfig.minDailyMinutes,
        learner.profile.dailyMinutes || zachranMeConfig.defaultDailyMinutes,
      ),
    ),
    scope: "both",
    learnerId,
  };
}

export async function buildZachranMePlanAction(
  raw: unknown,
): Promise<{ ok: true; plan: ZachranMePlan } | Fail> {
  const parsed = zachranMeInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_form";
      fieldErrors[key] = fieldErrors[key] ?? [];
      fieldErrors[key].push(issue.message);
    }
    return {
      ok: false,
      error: "Zkontroluj termín, minuty denně a rozsah studia.",
      fieldErrors,
    };
  }

  try {
    const learnerId = await getLearnerIdFromCookies();
    const scope = parsed.data.scope;
    const candidates: TriageCandidate[] = [];
    let totalAttemptsHint = 0;

    const [due, errorBook, learningDue] = learnerId
      ? await Promise.all([
          getDueSummaryForLearner({ learnerId }),
          getErrorBook(learnerId),
          countDueLearningAtoms(learnerId),
        ])
      : [null, null, 0];

    const dueCount = Math.max(
      due?.summary.dueCount ?? 0,
      learningDue ?? 0,
    );

    const activeMistakes = errorBook
      ? listActiveMemories(errorBook).map((m) => ({
          id: m.id,
          titleCs: m.knowledgeUnit.title || m.question || "Chyba",
          occurrenceCount: m.occurrenceCount,
          examValue: m.examValue,
          source: m.source,
        }))
      : [];

    if (scope === "materials" || scope === "both") {
      const materials = learnerId
        ? await listLearnerMaterials(learnerId)
        : [];
      candidates.push(
        ...buildMaterialsTriageCandidates({
          materials: materials.map((m) => ({
            id: m.id,
            title: m.title,
            status: m.status,
            knowledgePointCount: m.knowledgePointCount ?? 0,
            topicCount: m.topicCount ?? 0,
          })),
        }),
      );
    }

    if (scope === "cermat" || scope === "both") {
      const progress = learnerId
        ? await getCermatProgress(learnerId)
        : null;
      const byCategory = progress?.byCategory ?? [];
      totalAttemptsHint += byCategory.reduce(
        (s, r) => s + (r.attempts ?? 0),
        0,
      );
      candidates.push(
        ...buildCermatTriageCandidates({ byCategory }),
      );
    }

    candidates.push(
      ...buildMistakeTriageCandidates({
        scope,
        activeMistakes,
      }),
    );

    const overdue = buildOverdueTriageCandidate({ scope, dueCount });
    if (overdue) candidates.push(overdue);

    totalAttemptsHint += activeMistakes.reduce(
      (s, m) => s + m.occurrenceCount,
      0,
    );

    const plan = buildZachranMePlan({
      request: parsed.data,
      candidates,
      totalAttemptsHint,
    });

    track("zachran_me_plan_generated", {
      daysRemaining: plan.daysRemaining,
      dailyMinutes: plan.dailyMinutes,
      mustKnow: plan.mustKnow.length,
      important: plan.important.length,
      todaySteps: plan.horizon.today.steps.length,
      examDate: plan.examDate,
      scope: plan.scope,
      evidenceLevel: plan.analysis.evidenceLevel,
    });

    return { ok: true, plan };
  } catch (error) {
    return {
      ok: false,
      error: clientSafeError(
        error,
        "Plán teď nejde sestavit. Pokračuj denní misí nebo materiály.",
      ),
    };
  }
}

export type { ZachranMeInput };
