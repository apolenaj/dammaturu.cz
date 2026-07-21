"use server";

import {
  buildCermatCandidates,
  buildLanguageTopicCandidates,
  buildOralLiteratureCandidates,
  buildZachranMePlan,
  estimateForgettingRisk,
  zachranMeComponents,
  zachranMeConfig,
  zachranMeInputSchema,
  type EmergencyCandidate,
  type ZachranMeInput,
  type ZachranMePlan,
} from "@/domain/learning/zachran-me";
import { track } from "@/lib/analytics";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";
import { getDefaultCurriculumPack } from "@/server/curriculum/store";
import { getReadinessSnapshotForLearner } from "@/server/readiness/store";
import { getDueSummaryForLearner } from "@/server/spaced-repetition/store";
import { getCermatProgress } from "@/server/cermat-prep/store";
import { getOrCreateLiteratureList } from "@/server/literature-maturity/store";

type Fail = { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function getZachranMeDefaultsAction(): Promise<{
  examDate: string;
  availableHours: number;
  components: ZachranMeInput["components"];
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const allComponents = [...zachranMeComponents];
  if (!learnerId) {
    return {
      examDate: zachranMeConfig.betaTargetDate,
      availableHours: 1,
      components: allComponents,
      learnerId: null,
    };
  }
  const learner = await getLearner(learnerId);
  if (!learner) {
    return {
      examDate: zachranMeConfig.betaTargetDate,
      availableHours: 1,
      components: allComponents,
      learnerId,
    };
  }
  return {
    examDate: learner.profile.targetDate || zachranMeConfig.betaTargetDate,
    availableHours: Math.min(
      zachranMeConfig.maxAvailableHours,
      Math.max(
        zachranMeConfig.minAvailableHours,
        Math.round((learner.profile.dailyMinutes / 60) * 10) / 10 || 1,
      ),
    ),
    components: allComponents,
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
      error: "Zkontroluj termín, dostupné hodiny a složky maturity.",
      fieldErrors,
    };
  }

  try {
    const learnerId = await getLearnerIdFromCookies();
    const selected = new Set(parsed.data.components);
    const candidates: EmergencyCandidate[] = [];

    const [readiness, due] = learnerId
      ? await Promise.all([
          getReadinessSnapshotForLearner({ learnerId }),
          getDueSummaryForLearner({ learnerId }),
        ])
      : [null, null];

    const forgettingBase = due?.summary
      ? estimateForgettingRisk({
          isDue: (due.summary.dueCount ?? 0) > 0,
          daysOverdue: Math.min(7, Math.floor((due.summary.dueCount ?? 0) / 5)),
          lapseCount: 0,
          stabilityDays: null,
          bandAtRisk: (due.summary.dueCount ?? 0) > 20,
        })
      : 0.22;

    if (selected.has("cermat_didactic")) {
      const progress = learnerId
        ? await getCermatProgress(learnerId)
        : null;
      candidates.push(
        ...buildCermatCandidates({
          byCategory: progress?.byCategory ?? [],
          forgettingBase,
        }),
      );
    }

    if (selected.has("oral_literature")) {
      const list = learnerId
        ? await getOrCreateLiteratureList(learnerId)
        : null;
      candidates.push(
        ...buildOralLiteratureCandidates({
          books: list?.books ?? [],
          forgettingBase,
        }),
      );
    }

    if (selected.has("language_topics")) {
      const pack = await getDefaultCurriculumPack();
      if (pack) {
        const masteryByModule: Record<string, number> = {};
        if (readiness?.snapshot.areas) {
          for (const area of readiness.snapshot.areas) {
            masteryByModule[area.id] = area.pct;
            if (area.id === "rozbory") masteryByModule["rozbory-del"] = area.pct;
            if (area.id === "autori-dila") {
              masteryByModule["ceska-literatura-a-drama"] = area.pct;
              masteryByModule["svetovy-realismus"] = area.pct;
            }
            if (area.id === "literarni-smery") {
              masteryByModule["literarni-smery"] = area.pct;
              masteryByModule["narodni-obrozeni"] = Math.min(100, area.pct + 5);
            }
          }
        }
        const forgettingBySlug: Record<string, number> = {};
        const weakModuleIds = new Set(
          (readiness?.snapshot.weakAreas ?? []).map((a) => String(a.id)),
        );
        for (const mod of pack.modules) {
          if (
            weakModuleIds.has(mod.slug) ||
            (mod.slug === "rozbory-del" && weakModuleIds.has("rozbory"))
          ) {
            for (const t of mod.topics) {
              forgettingBySlug[t.slug] = Math.max(forgettingBase, 0.6);
            }
          }
        }
        candidates.push(
          ...buildLanguageTopicCandidates({
            pack,
            masteryByModule,
            forgettingBySlug,
          }),
        );
      }
    }

    const overall =
      readiness?.snapshot.overall.scorePct ??
      readiness?.snapshot.overall.provisionalPct ??
      null;

    const plan = buildZachranMePlan({
      request: parsed.data,
      candidates,
      overallReadinessPct: overall,
    });

    track("zachran_me_plan_generated", {
      daysRemaining: plan.daysRemaining,
      availableHours: plan.availableHours,
      mustKnow: plan.mustKnow.length,
      sessionSteps: plan.nextSession.steps.length,
      examDate: plan.examDate,
    });

    return { ok: true, plan };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
