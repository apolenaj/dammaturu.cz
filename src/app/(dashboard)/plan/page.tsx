import type { Metadata } from "next";
import { DashboardPlaceholder } from "@/components/dashboard/dashboard-placeholder";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildPublicMetadata({
    title: "Plán",
    description: "Tvůj studijní plán do maturity.",
    path: "/plan",
  }),
  robots: { index: false, follow: false },
};

export default function PlanPage() {
  return (
    <DashboardPlaceholder
      title="Plán"
      description="Přehledný plán na dny a týdny — kolik se učit a co máš ještě stihnout."
    />
  );
}
