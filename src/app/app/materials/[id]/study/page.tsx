import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Studium materiálu" };
export const dynamic = "force-dynamic";

/** Shortcut: /app/materials/[id]/study → picker with material preselected. */
export default async function MaterialStudyRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/app/materials/study?material=${encodeURIComponent(id)}`);
}
