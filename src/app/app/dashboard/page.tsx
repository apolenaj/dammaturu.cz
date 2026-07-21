import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DailyDashboard } from "@/components/dashboard/daily-dashboard";
import { getCurrentLearnerAction } from "@/server/actions/onboarding";
import { getDailyDashboardAction } from "@/server/actions/daily-dashboard";

export const metadata: Metadata = {
  title: "Dnes",
};
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const learner = await getCurrentLearnerAction();
  if (!learner) {
    redirect("/onboarding");
  }

  const { view, motivation } = await getDailyDashboardAction();
  if (!view) {
    redirect("/onboarding");
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 pb-4 sm:space-y-8">
      <DailyDashboard
        initialView={view}
        initialMotivation={motivation}
        initialCelebrations={motivation?.celebrations ?? []}
      />
    </div>
  );
}
