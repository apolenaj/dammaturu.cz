"use server";

import { revalidatePath } from "next/cache";
import {
  isAllowedStudyMaterialFile,
  STUDY_MATERIALS_BUCKET,
  titleFromFileName,
  type StudyMaterial,
} from "@/domain/dashboard/study-materials";
import { createClient } from "@/lib/supabase/server";
import {
  listSystemStudyMaterials,
  listUserStudyMaterials,
} from "@/server/dashboard/study-materials";

export type StudyMaterialsPageData = {
  systemMaterials: StudyMaterial[];
  userMaterials: StudyMaterial[];
};

export type UploadStudyMaterialResult =
  | { ok: true; material: StudyMaterial }
  | { ok: false; error: string };

function sanitizeStorageFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "material";
}

export async function getStudyMaterialsPageDataAction(): Promise<StudyMaterialsPageData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { systemMaterials: [], userMaterials: [] };
  }

  const [systemMaterials, userMaterials] = await Promise.all([
    listSystemStudyMaterials(supabase),
    listUserStudyMaterials(supabase, user.id),
  ]);

  return { systemMaterials, userMaterials };
}

export async function uploadStudyMaterialAction(
  formData: FormData,
): Promise<UploadStudyMaterialResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Pro nahrání se musíš přihlásit." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Vyber soubor PDF, DOCX nebo TXT." };
  }

  const validation = isAllowedStudyMaterialFile(file);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const subjectRaw = formData.get("subject");
  const subject =
    typeof subjectRaw === "string" && subjectRaw.trim()
      ? subjectRaw.trim().slice(0, 120)
      : "Vlastní materiály";

  const titleRaw = formData.get("title");
  const title =
    typeof titleRaw === "string" && titleRaw.trim()
      ? titleRaw.trim().slice(0, 200)
      : titleFromFileName(file.name);

  const safeName = sanitizeStorageFileName(file.name);
  const objectPath = `${user.id}/${crypto.randomUUID()}-${safeName}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(STUDY_MATERIALS_BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("[study_materials] storage upload failed", uploadError.message);
    return {
      ok: false,
      error:
        "Soubor se nepodařilo nahrát do úložiště. Ověř bucket user_materials a RLS pravidla.",
    };
  }

  const { data: publicData } = supabase.storage
    .from(STUDY_MATERIALS_BUCKET)
    .getPublicUrl(objectPath);

  // Bucket je privátní — do DB ukládáme storage path (stabilní identifikátor).
  // Veřejná URL slouží jen jako doplněk, když bucket někdy otevřete.
  const fileUrl = objectPath || publicData.publicUrl;

  const { data: inserted, error: insertError } = await supabase
    .from("study_materials")
    .insert({
      title,
      subject,
      type: "user",
      file_url: fileUrl,
      user_id: user.id,
    })
    .select("id, title, subject, type, file_url, user_id, created_at")
    .single();

  if (insertError || !inserted) {
    console.error(
      "[study_materials] insert failed",
      insertError?.message ?? "no row",
    );
    await supabase.storage.from(STUDY_MATERIALS_BUCKET).remove([objectPath]);
    return {
      ok: false,
      error:
        "Soubor se nahrál, ale záznam do databáze se neuložil. Zkus to prosím znovu.",
    };
  }

  if (inserted.type !== "system" && inserted.type !== "user") {
    return { ok: false, error: "Neplatný typ materiálu v databázi." };
  }

  const material: StudyMaterial = {
    id: inserted.id,
    title: inserted.title,
    subject: inserted.subject,
    type: inserted.type,
    file_url: inserted.file_url,
    user_id: inserted.user_id,
    created_at: inserted.created_at,
  };

  revalidatePath("/materialy");
  revalidatePath("/uceni");

  return { ok: true, material };
}

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
