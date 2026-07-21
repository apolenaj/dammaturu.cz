import type { Metadata } from "next";
import Link from "next/link";
import { BabickaExperienceView } from "@/components/babicka/babicka-experience-view";
import {
  Card,
  CardDescription,
} from "@/components/ui/card";
import { getBabickaExperienceAction } from "@/server/actions/babicka-experience";

export const metadata: Metadata = { title: "Babička — experience" };
export const dynamic = "force-dynamic";

export default async function BabickaExperiencePage() {
  const { pack } = await getBabickaExperienceAction();

  if (!pack) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 px-3 pb-10">
        <h1 className="font-display text-display-md text-fg">Babička</h1>
        <Card>
          <CardDescription>
Tento obsah zatím není k dispozici. Zkus jinou aktivitu nebo se vrať později.
            ingest Babička.docx).
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
      <BabickaExperienceView pack={pack} />
    </div>
  );
}
