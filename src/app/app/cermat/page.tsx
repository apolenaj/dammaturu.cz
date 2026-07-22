import type { Metadata } from "next";
import Link from "next/link";
import { EntitlementGate } from "@/components/billing/entitlement-gate";
import { CermatPrepHub } from "@/components/cermat/cermat-prep-hub";
import { AppPageHeader } from "@/components/shell/app-screen";
import { Alert } from "@/components/ui/alert";
import { Card, CardDescription } from "@/components/ui/card";
import {
  CERMAT_CURRICULUM_TITLE_CS,
  CERMAT_HONEST_SCOPE_CS,
  productLaneHintsCs,
  productLaneLabelsCs,
} from "@/domain/cermat-curriculum/requirements";
import { getCermatHubAction } from "@/server/actions/cermat-prep";

export const metadata: Metadata = {
  title: "CERMAT příprava",
};
export const dynamic = "force-dynamic";

export default async function CermatPrepPage() {
  const { view, learnerId } = await getCermatHubAction();

  if (!learnerId || !view) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-3 pb-10">
        <AppPageHeader
          title={CERMAT_CURRICULUM_TITLE_CS}
          purpose={productLaneHintsCs.cermat_priprava}
        />
        <Card>
          <CardDescription>
            Session se připravuje — obnov stránku. Tento režim je{" "}
            <strong>{productLaneLabelsCs.cermat_priprava}</strong>, ne{" "}
            <Link href="/app/materials" className="font-semibold text-action">
              {productLaneLabelsCs.moje_materialy}
            </Link>
            .
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-3 pb-10 sm:px-0">
      <AppPageHeader
        title={CERMAT_CURRICULUM_TITLE_CS}
        purpose="Společná část maturity — didaktický test podle katalogu CERMAT 2025/2026."
        primaryAction={{
          label: "Moje materiály",
          href: "/app/materials",
        }}
        secondaryAction={{
          label: "Profil maturity",
          href: "/app/exam-profile",
        }}
      />
      <Alert title="Oddělené režimy" tone="info">
        <p>
          <strong>{productLaneLabelsCs.cermat_priprava}</strong> = národní
          didaktický test.{" "}
          <strong>{productLaneLabelsCs.moje_materialy}</strong> = tvoje / školní
          podklady. Školní ústní seznam sem nepatří.
        </p>
        <p className="mt-2 text-caption text-fg-muted">{CERMAT_HONEST_SCOPE_CS}</p>
      </Alert>
      <EntitlementGate feature="cermat_prep">
        <CermatPrepHub initialView={view} />
      </EntitlementGate>
    </div>
  );
}
