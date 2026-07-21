import type { Metadata } from "next";
import { AdminBetaDashboardView } from "@/components/admin/admin-beta-dashboard";
import { AdminBetaExperimentGlance } from "@/components/admin/admin-beta-experiment";
import { AdminLearningAnalyticsView } from "@/components/admin/admin-learning-analytics";
import { getAdminBetaDashboardAction } from "@/server/actions/beta-profile";
import { getLearningAnalyticsDashboardAction } from "@/server/actions/learning-analytics";

export const metadata: Metadata = { title: "Admin · Learning analytics" };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const [beta, learning] = await Promise.all([
    getAdminBetaDashboardAction(),
    getLearningAnalyticsDashboardAction(),
  ]);

  return (
    <div className="space-y-16">
      <AdminLearningAnalyticsView dash={learning} />
      <div className="border-t border-border pt-12">
        <AdminBetaExperimentGlance />
      </div>
      <div className="border-t border-border pt-12">
        <AdminBetaDashboardView dash={beta} />
      </div>
    </div>
  );
}
