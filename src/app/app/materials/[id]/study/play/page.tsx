import type { Metadata } from "next";
import { MaterialsStudyPlayClient } from "@/components/materials/materials-study-play-client";

export const metadata: Metadata = { title: "Studijní sesit" };
export const dynamic = "force-dynamic";

export default async function MaterialsStudyPlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MaterialsStudyPlayClient materialId={id} />;
}
