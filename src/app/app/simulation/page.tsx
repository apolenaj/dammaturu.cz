import type { Metadata } from "next";
import Link from "next/link";
import { EntitlementGate } from "@/components/billing/entitlement-gate";
import {
  LazyMockExamView,
  LazyOralMaturitySimulationView,
} from "@/components/learning/lazy-heavy-features";
import { ContentUnavailableState } from "@/components/shell/study-recovery";
import { Card, CardDescription } from "@/components/ui/card";
import { getMockExamAction } from "@/server/actions/mock-exam";
import { getOralSimulationSelectAction } from "@/server/actions/oral-maturity-simulation";

export const metadata: Metadata = { title: "Zkouška nanečisto" };
export const dynamic = "force-dynamic";

export default async function SimulationPage({
  searchParams,
}: {
  searchParams?: Promise<{ pack?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const usePack = sp.pack === "1";

  if (usePack) {
    const { pack } = await getMockExamAction();
    if (!pack) {
      return (
        <ContentUnavailableState
          title="Zkouška nanečisto"
          description="Simulace ještě není připravená. Vrať se k literatuře nebo materiálům a pokračuj v přípravě."
        />
      );
    }
    return (
      <div className="px-3 pb-10 sm:px-0">
        <EntitlementGate feature="mock_exam">
          <LazyMockExamView pack={pack} />
        </EntitlementGate>
      </div>
    );
  }

  const { view, learnerId } = await getOralSimulationSelectAction();
  if (!learnerId || !view) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 px-3 pb-10">
        <Card>
          <CardDescription>
            Pro simulaci se{" "}
            <Link href="/prihlaseni" className="font-semibold text-action">
              přihlas
            </Link>
            , nebo pokračuj v{" "}
            <Link href="/app/learn" className="font-semibold text-action">
              učení
            </Link>
            .
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-3 pb-10 sm:px-0">
      <EntitlementGate feature="oral_simulation">
        <LazyOralMaturitySimulationView selectView={view} />
      </EntitlementGate>
    </div>
  );
}
