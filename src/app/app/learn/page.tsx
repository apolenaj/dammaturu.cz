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
  // Bootstrap must not hard-fail the ČJL hub (layout may create the same guest
  // in parallel — races are coalesced in ensureGuestLearner / stores).
  let learner: Awaited<ReturnType<typeof getCurrentLearnerAction>> = null;
  try {
    learner = await getCurrentLearnerAction();
  } catch (error) {
    console.error("[learn] learner bootstrap failed", error);
  }
  if (learner?.id) {
    void recordProductEvent({
      learnerKey: learner.id,
      event: "czech_hub_view",
      featureId: "cjl_hub",
    });
  }

  let view: Awaited<ReturnType<typeof getCjlHomeAction>>["view"];
  try {
    ({ view } = await getCjlHomeAction());
  } catch (error) {
    console.error("[learn] home view failed", error);
    const { buildCjlHomeView } = await import("@/server/study-content/cjl-home");
    // Null learner skips progress / error-book writes — hub still renders.
    view = await buildCjlHomeView(null);
  }

  return (
    <div className="px-3 sm:px-0">
      <CjlStudyHome view={view} />
    </div>
  );
}
