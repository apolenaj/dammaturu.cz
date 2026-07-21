import type { Metadata } from "next";
import Link from "next/link";
import { MajExamPrepView } from "@/components/maj/maj-exam-prep-view";
import {
  Card,
  CardDescription,
} from "@/components/ui/card";
import { getMajExamPrepAction } from "@/server/actions/maj-exam-prep";

export const metadata: Metadata = { title: "Máj — exam prep" };
export const dynamic = "force-dynamic";

export default async function MajExamPrepPage() {
  const { pack } = await getMajExamPrepAction();

  if (!pack) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 px-3 pb-10">
        <h1 className="font-display text-display-md text-fg">Máj</h1>
        <Card>
          <CardDescription>
            Exam prep ještě není nasazený. Spusť{" "}
            <code className="text-body-sm">npm run seed:maj</code> (vyžaduje
            ingest Máj.docx).
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
      <MajExamPrepView pack={pack} />
    </div>
  );
}
