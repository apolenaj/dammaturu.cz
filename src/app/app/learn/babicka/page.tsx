import type { Metadata } from "next";
import { BabickaExperienceLazy } from "@/components/learning/lazy-experiences";
import { ContentUnavailableState } from "@/components/shell/study-recovery";
import { getBabickaExperienceAction } from "@/server/actions/babicka-experience";

export const metadata: Metadata = { title: "Babička — příprava" };
export const dynamic = "force-dynamic";

export default async function BabickaExperiencePage() {
  const { pack } = await getBabickaExperienceAction();

  if (!pack) {
    return <ContentUnavailableState title="Babička" />;
  }

  return (
    <div className="px-3 pb-10 sm:px-0">
      <BabickaExperienceLazy pack={pack} />
    </div>
  );
}
