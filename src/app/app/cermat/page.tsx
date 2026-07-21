import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EntitlementGate } from "@/components/billing/entitlement-gate";
import { CermatPrepHub } from "@/components/cermat/cermat-prep-hub";
import { Card, CardDescription } from "@/components/ui/card";
import { getCermatHubAction } from "@/server/actions/cermat-prep";

export const metadata: Metadata = { title: "CERMAT ČJL" };
export const dynamic = "force-dynamic";

export default async function CermatPrepPage() {
  const { view, learnerId } = await getCermatHubAction();
  if (!learnerId) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-3 pb-10">
        <Card>
          <CardDescription>
            Pro CERMAT trénink se{" "}
            <Link href="/prihlaseni" className="font-semibold text-action">
              přihlas
            </Link>
            .
          </CardDescription>
        </Card>
      </div>
    );
  }
  if (!view) redirect("/onboarding");

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-3 pb-10 sm:px-0">
      <EntitlementGate feature="cermat_prep">
        <CermatPrepHub initialView={view} />
      </EntitlementGate>
    </div>
  );
}
