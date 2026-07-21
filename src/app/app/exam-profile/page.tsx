import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SchoolExamProfileViewPanel } from "@/components/exam-profile/school-exam-profile-view";
import { getSchoolExamProfileAction } from "@/server/actions/school-exam-profile";

export const metadata: Metadata = { title: "Profil maturity" };
export const dynamic = "force-dynamic";

export default async function ExamProfilePage() {
  const { view, learnerId } = await getSchoolExamProfileAction();
  if (!learnerId) redirect("/onboarding");
  if (!view) redirect("/onboarding");

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-3 pb-10 sm:px-0">
      <Link
        href="/app/profile"
        className="text-body-sm font-semibold text-action hover:underline"
      >
        ← Profil
      </Link>
      <SchoolExamProfileViewPanel initialView={view} />
    </div>
  );
}
