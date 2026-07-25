import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StudyDashboard } from "@/components/prehled/study-dashboard";
import { createClient } from "@/lib/supabase/server";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildPublicMetadata({
    title: "Přehled",
    description: "Tvůj studijní přehled na DámMaturu.",
    path: "/prehled",
  }),
  robots: { index: false, follow: false },
};

export default async function PrehledPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email?.trim() || "student";

  return <StudyDashboard email={email} />;
}
