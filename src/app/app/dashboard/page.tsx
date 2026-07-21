import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DailyDashboard } from "@/components/dashboard/daily-dashboard";
import { StudentBetaPulsePanel } from "@/components/dashboard/student-beta-pulse";
import { ProgressMotivationPanel } from "@/components/progress/progress-motivation-panel";
import { getCurrentLearnerAction } from "@/server/actions/onboarding";
import { getDailyDashboardAction } from "@/server/actions/daily-dashboard";
import { getStudentBetaPulseAction } from "@/server/actions/beta-profile";
import { getProgressMotivationAction } from "@/server/actions/progress-gamification";

export const metadata: Metadata = {
  title: "Dnes",
};
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const learner = await getCurrentLearnerAction();
  if (!learner) {
    redirect("/onboarding");
  }

  const [{ view }, { pulse }, { view: progressView }] = await Promise.all([
    getDailyDashboardAction(),
    getStudentBetaPulseAction(),
    getProgressMotivationAction(),
  ]);
  if (!view) {
    redirect("/onboarding");
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-8 px-3 pb-10 sm:px-0">
      <DailyDashboard initialView={view} />
      {progressView ? (
        <ProgressMotivationPanel view={progressView} compact />
      ) : null}
      {pulse ? <StudentBetaPulsePanel pulse={pulse} /> : null}
    </div>
  );
}
