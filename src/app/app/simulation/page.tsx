import type { Metadata } from "next";
import Link from "next/link";
import { EntitlementGate } from "@/components/billing/entitlement-gate";
import { MockExamView } from "@/components/mock-exam/mock-exam-view";
import { OralMaturitySimulationView } from "@/components/oral/oral-maturity-simulation-view";
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
        <div className="mx-auto w-full max-w-2xl space-y-4 px-3 pb-10">
          <h1 className="font-display text-display-md text-fg">
            Zkouška nanečisto
          </h1>
          <Card>
            <CardDescription>
              Simulace ještě není připravená. Vrať se po doplnění literatury, nebo
              otevři{" "}
              <Link href="/app/literature" className="font-semibold text-action">
                Literaturu
              </Link>
              .
            </CardDescription>
          </Card>
          <Link
            href="/app/simulation"
            className="text-body-sm font-semibold text-action"
          >
            ← Ústní maturita (evidence)
          </Link>
        </div>
      );
    }
    return (
      <div className="px-3 pb-10 sm:px-0">
        <EntitlementGate feature="mock_exam">
          <MockExamView pack={pack} />
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
            .
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-3 pb-10 sm:px-0">
      <EntitlementGate feature="oral_simulation">
        <OralMaturitySimulationView selectView={view} />
      </EntitlementGate>
    </div>
  );
}
