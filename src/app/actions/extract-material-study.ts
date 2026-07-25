"use server";

import { z } from "zod";
import type { ResolvedMaterialStudy } from "@/server/dashboard/resolve-material-study";
import { resolveMaterialStudyPack } from "@/server/dashboard/resolve-material-study";
import { createClient } from "@/lib/supabase/server";
import { getStudyMaterialById } from "@/server/dashboard/study-materials";

const inputSchema = z.object({
  materialId: z.string().uuid(),
});

/**
 * Server Action: extrahuje text z uživatelského PDF/DOCX/TXT a vrátí studijní balíček.
 */
export async function extractAndBuildStudyPackAction(
  materialId: string,
): Promise<ResolvedMaterialStudy | { ok: false; error: string }> {
  const parsed = inputSchema.safeParse({ materialId });
  if (!parsed.success) {
    return { ok: false, error: "Neplatné ID materiálu." };
  }

  const supabase = await createClient();
  const material = await getStudyMaterialById(supabase, parsed.data.materialId);
  if (!material) {
    return { ok: false, error: "Materiál nebyl nalezen." };
  }

  return resolveMaterialStudyPack(material);
}
