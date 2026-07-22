import type { Metadata } from "next";
import { KyticeExperienceLazy } from "@/components/learning/lazy-experiences";
import { ContentUnavailableState } from "@/components/shell/study-recovery";
import { getKyticeExperienceAction } from "@/server/actions/kytice-experience";

export const metadata: Metadata = { title: "Kytice — 13 balad" };
export const dynamic = "force-dynamic";

export default async function KyticeExperiencePage() {
  const { pack } = await getKyticeExperienceAction();

  if (!pack) {
    return <ContentUnavailableState title="Kytice" />;
  }

  return (
    <div className="px-3 pb-10 sm:px-0">
      <KyticeExperienceLazy pack={pack} />
    </div>
  );
}
