"use server";

import { revalidatePath } from "next/cache";
import { STUDY_MATERIALS_BUCKET } from "@/domain/dashboard/study-materials";
import { createClient } from "@/lib/supabase/server";

export async function deleteUserStudyMaterialAction(
  materialId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Pro smazání se musíš přihlásit." };
  }

  const { data: existing, error: loadError } = await supabase
    .from("study_materials")
    .select("id, type, file_url, user_id")
    .eq("id", materialId)
    .maybeSingle();

  if (loadError || !existing) {
    return { ok: false, error: "Materiál se nepodařilo najít." };
  }

  if (existing.type !== "user" || existing.user_id !== user.id) {
    return { ok: false, error: "Tento materiál nemůžeš smazat." };
  }

  if (existing.file_url && !existing.file_url.startsWith("http")) {
    await supabase.storage
      .from(STUDY_MATERIALS_BUCKET)
      .remove([existing.file_url]);
  }

  const { error: deleteError } = await supabase
    .from("study_materials")
    .delete()
    .eq("id", materialId)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("[study_materials] delete failed", deleteError.message);
    return { ok: false, error: "Materiál se nepodařilo smazat." };
  }

  revalidatePath("/materialy");
  return { ok: true };
}
