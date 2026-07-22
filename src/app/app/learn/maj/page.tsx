import type { Metadata } from "next";
import { MajExamPrepLazy } from "@/components/learning/lazy-experiences";
import { ContentUnavailableState } from "@/components/shell/study-recovery";
import { getMajExamPrepAction } from "@/server/actions/maj-exam-prep";

export const metadata: Metadata = { title: "Máj — příprava" };
export const dynamic = "force-dynamic";

export default async function MajExamPrepPage() {
  const { pack } = await getMajExamPrepAction();

  if (!pack) {
    return <ContentUnavailableState title="Máj" />;
  }

  return (
    <div className="px-3 pb-10 sm:px-0">
      <MajExamPrepLazy pack={pack} />
    </div>
  );
}
