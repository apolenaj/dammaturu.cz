import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DynamicStudyPlanView } from "@/components/plan/dynamic-study-plan-view";
import { getDynamicStudyPlanAction } from "@/server/actions/deadline-planner";

export const metadata: Metadata = { title: "Plán" };
export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const { plan, learnerId } = await getDynamicStudyPlanAction();
  if (!learnerId) redirect("/onboarding");
  if (!plan) redirect("/onboarding");

  return (
    <div className="mx-auto w-full max-w-xl space-y-10 px-3 pb-10 sm:px-0">
      <DynamicStudyPlanView plan={plan} />
    </div>
  );
}
