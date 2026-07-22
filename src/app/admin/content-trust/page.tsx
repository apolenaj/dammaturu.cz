import type { Metadata } from "next";
import { ContentTrustDashboard } from "@/components/admin/content-trust-dashboard";
import { buildContentTrustReportFromStores } from "@/server/content-trust/build-report";

export const metadata: Metadata = { title: "Admin · Content Trust" };
export const dynamic = "force-dynamic";

export default async function AdminContentTrustPage() {
  const report = await buildContentTrustReportFromStores();

  return <ContentTrustDashboard report={report} />;
}
