import type { Metadata } from "next";
import { AdminBetaDashboardView } from "@/components/admin/admin-beta-dashboard";
import { AdminBetaExperimentGlance } from "@/components/admin/admin-beta-experiment";
import { AdminLearningAnalyticsView } from "@/components/admin/admin-learning-analytics";
import { AdminProductAnalyticsView } from "@/components/admin/admin-product-analytics";
import { getAdminBetaDashboardAction } from "@/server/actions/beta-profile";
import { getFeatureFlagsAdminAction } from "@/server/actions/feature-flags";
import { getLearningAnalyticsDashboardAction } from "@/server/actions/learning-analytics";
import { getProductAnalyticsDashboardAction } from "@/server/actions/product-analytics";

export const metadata: Metadata = { title: "Admin · Analytics" };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const [product, flags, beta, learning] = await Promise.all([
    getProductAnalyticsDashboardAction(),
    getFeatureFlagsAdminAction(),
    getAdminBetaDashboardAction(),
    getLearningAnalyticsDashboardAction(),
  ]);

  return (
    <div className="space-y-16">
      <AdminProductAnalyticsView dash={product} flags={flags} />
      <div className="border-t border-border pt-12">
        <AdminLearningAnalyticsView dash={learning} />
      </div>
      <div className="border-t border-border pt-12">
        <AdminBetaExperimentGlance />
      </div>
      <div className="border-t border-border pt-12">
        <AdminBetaDashboardView dash={beta} />
      </div>
    </div>
  );
}
