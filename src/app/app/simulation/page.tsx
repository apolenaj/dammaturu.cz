import type { Metadata } from "next";
import Link from "next/link";
import { MockExamView } from "@/components/mock-exam/mock-exam-view";
import {
  Card,
  CardDescription,
} from "@/components/ui/card";
import { getMockExamAction } from "@/server/actions/mock-exam";

export const metadata: Metadata = { title: "Zkouška nanečisto" };
export const dynamic = "force-dynamic";

export default async function SimulationPage() {
  const { pack } = await getMockExamAction();

  if (!pack) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 px-3 pb-10">
        <h1 className="font-display text-display-md text-fg">
          Zkouška nanečisto
        </h1>
        <Card>
          <CardDescription>
            Režim ještě není nasazený. Spusť{" "}
            <code className="text-body-sm">npm run seed:mock-exam</code>.
          </CardDescription>
        </Card>
        <Link href="/app/dashboard" className="text-body-sm font-semibold text-action">
          ← Dnes
        </Link>
      </div>
    );
  }

  return (
    <div className="px-3 pb-10 sm:px-0">
      <MockExamView pack={pack} />
    </div>
  );
}
