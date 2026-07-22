"use server";

import {
  vysvetliRequestSchema,
  type VysvetliRequest,
  type VysvetliResponse,
} from "@/domain/learning/vysvetli-mi-to";
import { track } from "@/lib/analytics";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  getLearnerMaterial,
  listLearnerMaterials,
} from "@/server/learner-materials/store";
import {
  resolveVysvetliAiStatus,
  runVysvetliAssistant,
} from "@/server/learner-materials/vysvetli-engine";
import { getStudyContentRegistry } from "@/server/study-content/registry";
import { getLearnerEntitlements } from "@/server/billing/entitlements";
import type { LearnerMaterialListItem } from "@/domain/learning/learner-materials";

type Fail = { ok: false; error: string };

export async function getVysvetliDefaultsAction(): Promise<{
  learnerId: string | null;
  materials: LearnerMaterialListItem[];
  aiExplanationsEntitled: boolean;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) {
    return { learnerId: null, materials: [], aiExplanationsEntitled: false };
  }
  const all = await listLearnerMaterials(learnerId);
  const materials = all.filter(
    (m) => m.status === "ready" && (m.knowledgePointCount ?? 0) > 0,
  );

  let aiExplanationsEntitled = false;
  try {
    const ent = await getLearnerEntitlements(learnerId);
    aiExplanationsEntitled = ent.features.has("ai_explanations");
  } catch {
    aiExplanationsEntitled = false;
  }

  return { learnerId, materials, aiExplanationsEntitled };
}

export async function runVysvetliMiToAction(
  raw: unknown,
): Promise<{ ok: true; response: VysvetliResponse } | Fail> {
  const parsed = vysvetliRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Zkontroluj úkol a text dotazu.",
    };
  }

  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív se přihlas." };

    const req: VysvetliRequest = parsed.data;
    const materials = [];
    const ids =
      req.materialIds.length > 0
        ? req.materialIds
        : (await listLearnerMaterials(learnerId))
            .filter((m) => m.status === "ready")
            .slice(0, 8)
            .map((m) => m.id);

    for (const id of [...new Set(ids)].slice(0, 8)) {
      const m = await getLearnerMaterial(learnerId, id);
      if (m && m.status === "ready") materials.push(m);
    }

    let catalogEntries: Awaited<ReturnType<typeof getStudyContentRegistry>> =
      [];
    if (req.includeApprovedCatalog !== false) {
      try {
        const registry = await getStudyContentRegistry();
        catalogEntries = registry.filter(
          (e) =>
            e.parseComplete &&
            (e.contentStatus === "available" ||
              e.contentStatus === "available_with_warning"),
        );
      } catch {
        catalogEntries = [];
      }
    }

    let aiExplanationsEntitled = false;
    try {
      const ent = await getLearnerEntitlements(learnerId);
      aiExplanationsEntitled = ent.features.has("ai_explanations");
    } catch {
      aiExplanationsEntitled = false;
    }

    const aiStatus = resolveVysvetliAiStatus({
      aiExplanationsEntitled,
      aiProviderAvailable: false,
    });

    const response = runVysvetliAssistant({
      request: req,
      materials,
      catalogEntries,
      aiStatus,
    });

    track("study_plan_generated", {
      feature: "vysvetli_mi_to",
      task: req.task,
      insufficient: response.insufficient,
      aiStatus: response.aiStatus,
      citations: response.citations.length,
    });

    return { ok: true, response };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
