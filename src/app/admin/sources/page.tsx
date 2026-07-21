import type { Metadata } from "next";
import { IngestionPanel } from "@/components/admin/ingestion-panel";
import { getIngestionDashboardAction } from "@/server/actions/ingestion";

export const metadata: Metadata = {
  title: "Admin · Zdroje",
};

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  const { documents, lastRun, audit } = await getIngestionDashboardAction();

  return (
    <IngestionPanel
      documents={documents}
      lastRun={lastRun}
      audit={audit}
    />
  );
}
