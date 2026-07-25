import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudyMaterial } from "@/domain/dashboard/study-materials";

type StudyMaterialRow = {
  id: string;
  title: string;
  subject: string;
  type: string;
  file_url: string | null;
  user_id: string | null;
  created_at: string;
};

function mapRow(row: StudyMaterialRow): StudyMaterial | null {
  if (row.type !== "system" && row.type !== "user") return null;
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    type: row.type,
    file_url: row.file_url,
    user_id: row.user_id,
    created_at: row.created_at,
  };
}

export async function listSystemStudyMaterials(
  supabase: SupabaseClient,
): Promise<StudyMaterial[]> {
  const { data, error } = await supabase
    .from("study_materials")
    .select("id, title, subject, type, file_url, user_id, created_at")
    .eq("type", "system")
    .order("subject", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    console.error("[study_materials] list system failed", error.message);
    throw new Error(
      "Nepodařilo se načíst systémové materiály. Zkontroluj, že je v Supabase spuštěná migrace study_materials.",
    );
  }

  return (data as StudyMaterialRow[] | null)
    ?.map(mapRow)
    .filter((row): row is StudyMaterial => row !== null) ?? [];
}

export async function listUserStudyMaterials(
  supabase: SupabaseClient,
  userId: string,
): Promise<StudyMaterial[]> {
  const { data, error } = await supabase
    .from("study_materials")
    .select("id, title, subject, type, file_url, user_id, created_at")
    .eq("type", "user")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[study_materials] list user failed", error.message);
    throw new Error(
      "Nepodařilo se načíst tvé materiály. Zkus obnovit stránku.",
    );
  }

  return (data as StudyMaterialRow[] | null)
    ?.map(mapRow)
    .filter((row): row is StudyMaterial => row !== null) ?? [];
}

export async function getStudyMaterialById(
  supabase: SupabaseClient,
  materialId: string,
): Promise<StudyMaterial | null> {
  const { data, error } = await supabase
    .from("study_materials")
    .select("id, title, subject, type, file_url, user_id, created_at")
    .eq("id", materialId)
    .maybeSingle();

  if (error) {
    console.error("[study_materials] get by id failed", error.message);
    return null;
  }
  if (!data) return null;
  return mapRow(data as StudyMaterialRow);
}
