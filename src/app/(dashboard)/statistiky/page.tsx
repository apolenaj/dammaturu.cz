import type { Metadata } from "next";
import { DashboardPlaceholder } from "@/components/dashboard/dashboard-placeholder";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildPublicMetadata({
    title: "Statistiky",
    description: "Statistiky připravenosti a pokroku na DámMaturu.",
    path: "/statistiky",
  }),
  robots: { index: false, follow: false },
};

export default function StatistikyPage() {
  return (
    <DashboardPlaceholder
      title="Statistiky"
      description="Grafy, série a připravenost podle předmětů — abys viděl, kam se posouváš."
    />
  );
}
