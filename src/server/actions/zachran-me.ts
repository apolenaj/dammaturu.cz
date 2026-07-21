"use server";

import {
  buildSignalsFromPack,
  buildZachranMePlan,
  estimateForgettingRisk,
  zachranMeConfig,
  zachranMeInputSchema,
  type ZachranMeInput,
  type ZachranMePlan,
} from "@/domain/learning/zachran-me";
import { dateKeyFromDate } from "@/domain/learning/daily-dashboard";
import { track } from "@/lib/analytics";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";
import { getDefaultCurriculumPack } from "@/server/curriculum/store";
import { getReadinessSnapshotForLearner } from "@/server/readiness/store";
import { getDueSummaryForLearner } from "@/server/spaced-repetition/store";

type Fail = { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function getZachranMeDefaultsAction(): Promise<{
  deadline: string;
  dailyMinutes: number;
  subjects: ZachranMeInput["subjects"];
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) {
    return {
      deadline: zachranMeConfig.betaTargetDate,
      dailyMinutes: 30,
      subjects: ["cjl"],
      learnerId: null,
    };
  }
  const learner = await getLearner(learnerId);
  if (!learner) {
    return {
      deadline: zachranMeConfig.betaTargetDate,
      dailyMinutes: 30,
      subjects: ["cjl"],
      learnerId,
    };
  }
  return {
    deadline: learner.profile.targetDate || zachranMeConfig.betaTargetDate,
    dailyMinutes: learner.profile.dailyMinutes,
    subjects:
      learner.profile.subjects.length > 0
        ? learner.profile.subjects
        : ["cjl"],
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
      error: "Zkontroluj deadline, čas denně a předměty.",
      fieldErrors,
    };
  }

  try {
    const pack = await getDefaultCurriculumPack();
    if (!pack) {
      return {
        ok: false,
        error: "Curriculum není nasazené. Spusť npm run seed:curriculum.",
      };
    }

    const learnerId = await getLearnerIdFromCookies();
    const [readiness, due] = learnerId
      ? await Promise.all([
          getReadinessSnapshotForLearner({ learnerId }),
          getDueSummaryForLearner({ learnerId }),
        ])
      : [null, null];

    const masteryByModule: Record<string, number> = {};
    if (readiness?.snapshot.areas) {
      for (const area of readiness.snapshot.areas) {
        masteryByModule[area.id] = area.pct;
        // aliases used by curriculum modules
        if (area.id === "rozbory") masteryByModule["rozbory-del"] = area.pct;
        if (area.id === "autori-dila") {
          masteryByModule["ceska-literatura-a-drama"] = area.pct;
          masteryByModule["svetovy-realismus"] = area.pct;
        }
        if (area.id === "literarni-smery") {
          masteryByModule["literarni-smery"] = area.pct;
          masteryByModule["narodni-obrozeni"] = Math.min(
            100,
            area.pct + 5,
          );
        }
      }
    }

    const masteryBySlug: Record<string, number> = {};
    if (readiness?.book.units) {
      for (const u of readiness.book.units) {
        // unit id may not equal topic slug — use title heuristic lightly skipped;
        // module-level mastery is the main signal for beta.
        void u;
      }
    }

    const forgettingBySlug: Record<string, number> = {};
    const todayKey = dateKeyFromDate(new Date());
    if (due?.summary) {
      // Flat due pressure applied to weak modules when we lack per-topic SR map
      const baseForget = estimateForgettingRisk({
        isDue: (due.summary.dueCount ?? 0) > 0,
        daysOverdue: Math.min(7, Math.floor((due.summary.dueCount ?? 0) / 5)),
        lapseCount: 0,
        stabilityDays: null,
        bandAtRisk: (due.summary.dueCount ?? 0) > 20,
      });
      for (const area of readiness?.snapshot.weakAreas ?? []) {
        forgettingBySlug[area.id] = Math.max(baseForget, 0.6);
      }
      void todayKey;
    }

    const signals = buildSignalsFromPack({
      pack,
      masteryBySlug,
      masteryByModule,
      forgettingBySlug,
      subject: "cjl",
    });

    // Boost forgetting on weak-area modules
    for (const s of signals) {
      const modForget = forgettingBySlug[s.moduleSlug];
      if (modForget != null) {
        s.forgettingRisk = Math.max(s.forgettingRisk, modForget);
      }
    }

    const plan = buildZachranMePlan({
      request: parsed.data,
      signals,
    });

    track("zachran_me_plan_generated", {
      daysRemaining: plan.daysRemaining,
      mustToday: plan.mustToday.length,
      dailyMinutes: plan.dailyMinutes,
      deadline: plan.deadline,
    });

    return { ok: true, plan };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
