import type { Metadata } from "next";
import { MaterialsPageContent } from "@/components/dashboard/materials-page-content";
import { buildPublicMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import {
  listSystemStudyMaterials,
  listUserStudyMaterials,
} from "@/server/dashboard/study-materials";
import type { StudyMaterial } from "@/domain/dashboard/study-materials";

export const metadata: Metadata = {
  ...buildPublicMetadata({
    title: "Materiály",
    description: "Vlastní materiály a maturitní předměty na DámMaturu.",
    path: "/materialy",
  }),
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MaterialyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let systemMaterials: StudyMaterial[] = [];
  let userMaterials: StudyMaterial[] = [];
  let loadError: string | null = null;

  try {
    systemMaterials = await listSystemStudyMaterials(supabase);
    if (user) {
      userMaterials = await listUserStudyMaterials(supabase, user.id);
    }
  } catch (error) {
    console.error("[materialy] load failed", error);
    loadError =
      error instanceof Error
        ? error.message
        : "Nepodařilo se načíst materiály z databáze.";
  }

  return (
    <MaterialsPageContent
      initialSystemMaterials={systemMaterials}
      initialUserMaterials={userMaterials}
      loadError={loadError}
    />
  );
}
