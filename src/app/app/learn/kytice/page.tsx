import type { Metadata } from "next";
import Link from "next/link";
import { KyticeExperienceView } from "@/components/kytice/kytice-experience-view";
import {
  Card,
  CardDescription,
} from "@/components/ui/card";
import { getKyticeExperienceAction } from "@/server/actions/kytice-experience";

export const metadata: Metadata = { title: "Kytice — 13 balad" };
export const dynamic = "force-dynamic";

export default async function KyticeExperiencePage() {
  const { pack } = await getKyticeExperienceAction();

  if (!pack) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 px-3 pb-10">
        <h1 className="font-display text-display-md text-fg">Kytice</h1>
        <Card>
          <CardDescription>
            Experience ještě není nasazená. Spusť{" "}
            <code className="text-body-sm">npm run seed:kytice</code> (vyžaduje
            ingest Kytice.docx).
          </CardDescription>
        </Card>
        <Link href="/app/learn" className="text-body-sm font-semibold text-action">
          ← Učit se
        </Link>
      </div>
    );
  }

  return (
    <div className="px-3 pb-10 sm:px-0">
      <KyticeExperienceView pack={pack} />
    </div>
  );
}
