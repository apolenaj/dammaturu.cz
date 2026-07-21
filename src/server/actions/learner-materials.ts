"use server";

import { revalidatePath } from "next/cache";
import {
  isSupportedFormat,
  materialsConfig,
  toListItem,
  type LearnerMaterialListItem,
} from "@/domain/learning/learner-materials";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { processLearnerMaterial } from "@/server/learner-materials/process";
import {
  deleteLearnerMaterial,
  getLearnerMaterial,
  listLearnerMaterials,
  renameLearnerMaterial,
} from "@/server/learner-materials/store";

export type MaterialsActionResult =
  | { ok: true; material?: LearnerMaterialListItem }
  | { ok: false; error: string };

export async function listMyMaterialsAction(): Promise<{
  learnerId: string | null;
  materials: LearnerMaterialListItem[];
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { learnerId: null, materials: [] };
  const materials = await listLearnerMaterials(learnerId);
  return { learnerId, materials };
}

export async function renameMaterialAction(input: {
  id: string;
  title: string;
}): Promise<MaterialsActionResult> {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) {
    return { ok: false, error: "Nejdřív se přihlas." };
  }
  const title = input.title.trim();
  if (!title) {
    return { ok: false, error: "Název nesmí být prázdný." };
  }
  const updated = await renameLearnerMaterial(learnerId, input.id, title);
  if (!updated) {
    return { ok: false, error: "Materiál se nepodařilo přejmenovat." };
  }
  revalidatePath("/app/materials");
  revalidatePath("/app/plan");
  return { ok: true, material: toListItem(updated) };
}

export async function deleteMaterialAction(input: {
  id: string;
}): Promise<MaterialsActionResult> {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) {
    return { ok: false, error: "Nejdřív se přihlas." };
  }
  const ok = await deleteLearnerMaterial(learnerId, input.id);
  if (!ok) {
    return { ok: false, error: "Materiál se nepodařilo smazat." };
  }
  revalidatePath("/app/materials");
  revalidatePath("/app/plan");
  return { ok: true };
}

export async function retryMaterialProcessingAction(input: {
  id: string;
}): Promise<MaterialsActionResult> {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) {
    return { ok: false, error: "Nejdřív se přihlas." };
  }
  const existing = await getLearnerMaterial(learnerId, input.id);
  if (!existing) {
    return { ok: false, error: "Materiál neexistuje." };
  }
  if (!isSupportedFormat(existing.format)) {
    return {
      ok: false,
      error: "Tento formát zatím neumíme zpracovat.",
    };
  }
  if (existing.byteSize > materialsConfig.maxFileBytes) {
    return { ok: false, error: "Soubor je příliš velký." };
  }

  const processed = await processLearnerMaterial(existing);
  revalidatePath("/app/materials");
  revalidatePath("/app/plan");
  return { ok: true, material: toListItem(processed) };
}
