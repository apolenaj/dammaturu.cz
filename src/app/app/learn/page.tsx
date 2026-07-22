import type { Metadata } from "next";
import { CjlStudyHome } from "@/components/study/cjl-study-home";
import { getCjlHomeAction } from "@/server/actions/cjl-home";
import { getCurrentLearnerAction } from "@/server/actions/onboarding";

export const metadata: Metadata = {
  title: "Český jazyk a literatura",
  description:
    "Co teď studovat z ČJL — materiály, slabiny a pokrok bez falešných procent.",
};
export const dynamic = "force-dynamic";

export default async function LearnPage() {
  // Ensure guest/auth learner profile exists for progress writes.
  await getCurrentLearnerAction();
  const { view } = await getCjlHomeAction();

  return (
    <div className="px-3 sm:px-0">
      <CjlStudyHome view={view} />
    </div>
  );
}
