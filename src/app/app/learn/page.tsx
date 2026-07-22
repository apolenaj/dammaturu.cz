import type { Metadata } from "next";
import { CjlStudyHome } from "@/components/study/cjl-study-home";
import { getCjlHomeAction } from "@/server/actions/cjl-home";
import { getCurrentLearnerAction } from "@/server/actions/onboarding";
import { recordProductEvent } from "@/server/product-analytics/store";

export const metadata: Metadata = {
  title: "Český jazyk a literatura",
  description:
    "Co teď studovat z ČJL — materiály, slabiny a pokrok bez falešných procent.",
};
export const dynamic = "force-dynamic";

export default async function LearnPage() {
  // Ensure guest/auth learner profile exists for progress writes.
  const learner = await getCurrentLearnerAction();
  if (learner?.id) {
    void recordProductEvent({
      learnerKey: learner.id,
      event: "czech_hub_view",
      featureId: "cjl_hub",
    });
  }
  const { view } = await getCjlHomeAction();

  return (
    <div className="px-3 sm:px-0">
      <CjlStudyHome view={view} />
    </div>
  );
}
