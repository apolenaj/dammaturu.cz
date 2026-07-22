"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import {
  buildMaterialsOralReport,
  buildMaterialsOralSelectView,
  materialsOralModes,
  materialsOralPromptSchema,
  type MaterialsOralMode,
  type MaterialsOralPrompt,
  type MaterialsOralReport,
  type MaterialsOralSelectView,
  type MaterialsOralSession,
} from "@/domain/learning/materials-oral-training";
import { evaluateOpenAnswer } from "@/domain/learning/open-answer-eval";
import { listActiveMemories } from "@/domain/learning/error-memory";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  getLearnerMaterial,
  listLearnerMaterials,
} from "@/server/learner-materials/store";
import {
  buildMaterialsOralSession,
  collectOralTopics,
} from "@/server/learner-materials/materials-oral-build";
import { getErrorBook } from "@/server/error-memory/store";
import { ingestMeaningfulMistake } from "@/server/error-memory/ingest";

type Fail = { ok: false; error: string };

export async function getMaterialsOralSelectAction(): Promise<{
  view: MaterialsOralSelectView | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { view: null, learnerId: null };

  const [all, errorBook] = await Promise.all([
    listLearnerMaterials(learnerId),
    getErrorBook(learnerId),
  ]);
  const ready = all.filter(
    (m) => m.status === "ready" && (m.knowledgePointCount ?? 0) > 0,
  );
  const full = [];
  for (const item of ready.slice(0, 24)) {
    const m = await getLearnerMaterial(learnerId, item.id);
    if (m) full.push(m);
  }

  const active = errorBook ? listActiveMemories(errorBook) : [];
  return {
    learnerId,
    view: buildMaterialsOralSelectView({
      materials: ready.map((m) => ({
        id: m.id,
        title: m.title,
        knowledgePointCount: m.knowledgePointCount ?? 0,
        topicCount: m.topicCount ?? 0,
      })),
      topics: collectOralTopics(full),
      hasWeakSpots: active.length > 0,
    }),
  };
}

export async function startMaterialsOralSessionAction(input: {
  mode: MaterialsOralMode;
  materialIds: string[];
  topicCs?: string | null;
  hideHints?: boolean;
}): Promise<
  | { ok: true; session: MaterialsOralSession }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív se přihlas." };
    if (!(materialsOralModes as readonly string[]).includes(input.mode)) {
      return { ok: false, error: "Neplatný režim ústního tréninku." };
    }

    const ids = [...new Set(input.materialIds)].slice(0, 8);
    if (ids.length === 0) {
      return { ok: false, error: "Vyber aspoň jeden připravený materiál." };
    }

    const materials = [];
    for (const id of ids) {
      const m = await getLearnerMaterial(learnerId, id);
      if (!m) return { ok: false, error: "Materiál se nepodařilo načíst." };
      if (m.status !== "ready") {
        return {
          ok: false,
          error: `„${m.title}“ ještě není připravený.`,
        };
      }
      materials.push(m);
    }

    let weakKnowledgeUnitIds: string[] = [];
    if (input.mode === "weak_spots") {
      const book = await getErrorBook(learnerId);
      if (book) {
        weakKnowledgeUnitIds = listActiveMemories(book)
          .map((m) => m.knowledgeUnit.id)
          .filter((id): id is string => Boolean(id));
      }
    }

    const built = buildMaterialsOralSession({
      mode: input.mode,
      materials,
      topicCs: input.topicCs,
      weakKnowledgeUnitIds,
      hideHints: input.hideHints !== false,
    });
    if ("error" in built) return { ok: false, error: built.error };

    track("oral_simulation_started", {
      source: "materials_oral",
      mode: input.mode,
      prompts: built.prompts.length,
    });

    return { ok: true, session: built };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function scheduleWeakFromReport(input: {
  learnerId: string;
  prompt: MaterialsOralPrompt;
  studentAnswer: string;
  report: MaterialsOralReport;
}): Promise<number> {
  // Schedule missing/wrong points for incorrect or partial answers.
  // Low-confidence: still enqueue expected missing points for practice, without claiming a hard score.
  if (input.report.result === "correct" && input.report.missingKeyPoints.length === 0) {
    return 0;
  }

  let weakLabels = [
    ...input.report.missingKeyPoints.slice(0, 4),
    ...input.report.factualMistakes.slice(0, 2),
  ];
  if (weakLabels.length === 0 && input.report.lowConfidence) {
    weakLabels = [...input.report.expectedKeyPoints.slice(0, 3)];
  }
  if (weakLabels.length === 0) return 0;

  let scheduled = 0;
  const primaryKuId = input.prompt.knowledgeUnitIds[0];
  const title =
    input.prompt.topicCs ||
    input.prompt.materialTitle ||
    "Ústní materiál";

  for (const label of weakLabels) {
    const res = await ingestMeaningfulMistake({
      learnerId: input.learnerId,
      question: input.prompt.questionCs,
      studentAnswer: input.studentAnswer.slice(0, 500),
      correctConcept: label,
      knowledgeUnit: {
        id: primaryKuId,
        title: `${title}: ${label}`.slice(0, 160),
      },
      source: "materials_study",
      result:
        input.report.result === "partial" ? "partial" : "incorrect",
      coverage:
        input.report.openEvaluation?.coverage ??
        (input.report.result === "partial" ? 0.45 : 0.15),
      whatWasWrong: input.report.factualMistakes.slice(0, 3),
      whyWrong: input.report.lowConfidence
        ? "Nízká jistota hodnocení — doplň klíčové body ze zdroje."
        : "Chybějící / nepřesný bod při ústním tréninku z materiálu.",
      sourceLabel: input.prompt.materialTitle,
      sourceExcerpt:
        input.prompt.citations[0]?.sourceText?.slice(0, 400) ?? null,
      examValue: 4,
    });
    if (res?.created) scheduled += 1;
  }

  if (primaryKuId && (input.report.result !== "correct" || scheduled > 0)) {
    try {
      const { recordAdaptiveUnitAttempt } = await import(
        "@/server/adaptive-planner/store"
      );
      await recordAdaptiveUnitAttempt({
        learnerId: input.learnerId,
        knowledgeUnitId: primaryKuId,
        result:
          input.report.result === "partial" || input.report.lowConfidence
            ? "partial"
            : "incorrect",
        titleCs: title,
      });
    } catch {
      // non-fatal
    }
  }

  return scheduled;
}

export async function gradeMaterialsOralAnswerAction(input: {
  prompt: MaterialsOralPrompt;
  studentAnswer: string;
}): Promise<
  | { ok: true; report: MaterialsOralReport }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív se přihlas." };

    const parsed = materialsOralPromptSchema.safeParse(input.prompt);
    if (!parsed.success) {
      return { ok: false, error: "Neplatná otázka session." };
    }
    const prompt = parsed.data;
    const answer = input.studentAnswer.trim();
    if (!answer) {
      return { ok: false, error: "Napiš nebo nadiktuj odpověď." };
    }

    // Verify material still belongs to learner (anti-tamper)
    const material = await getLearnerMaterial(learnerId, prompt.materialId);
    if (!material || material.status !== "ready") {
      return { ok: false, error: "Materiál už není dostupný." };
    }

    const openEvaluation =
      prompt.keyPoints.length >= 1
        ? evaluateOpenAnswer({
            studentAnswer: answer,
            keyIdeas: prompt.keyPoints.map((k) => ({
              id: k.id,
              label: k.label,
              synonyms: [],
              required: k.required,
            })),
            idealAnswer: prompt.idealOutlineCs,
            sourceEvidence: prompt.citations[0]
              ? {
                  quote: prompt.citations[0].sourceText,
                  sourceLabel: prompt.citations[0].documentTitle,
                  pageStart: prompt.citations[0].pageStart,
                  pageEnd: prompt.citations[0].pageEnd,
                }
              : null,
          })
        : null;

    let report = buildMaterialsOralReport({
      prompt,
      studentAnswer: answer,
      openEvaluation,
      evaluationConfidence: prompt.confidence,
    });

    const scheduled = await scheduleWeakFromReport({
      learnerId,
      prompt,
      studentAnswer: answer,
      report,
    });
    report = { ...report, scheduledWeakConcepts: scheduled };

    track("oral_simulation_graded", {
      source: "materials_oral",
      result: report.result,
      lowConfidence: report.lowConfidence,
      scheduled,
    });

    revalidatePath("/app/mistakes");
    revalidatePath("/app/dashboard");
    return { ok: true, report };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Rebuild the same prompt for retry without revealing hints. */
export async function retryMaterialsOralWithoutHintsAction(input: {
  prompt: MaterialsOralPrompt;
}): Promise<
  | { ok: true; prompt: MaterialsOralPrompt }
  | Fail
> {
  const parsed = materialsOralPromptSchema.safeParse(input.prompt);
  if (!parsed.success) return { ok: false, error: "Neplatná otázka." };
  return {
    ok: true,
    prompt: {
      ...parsed.data,
      hideHints: true,
      id: parsed.data.id,
    },
  };
}
