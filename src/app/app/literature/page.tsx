import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LiteratureMaturityHub } from "@/components/literature/literature-maturity-hub";
import { getLiteratureHubAction } from "@/server/actions/literature-maturity";

export const metadata: Metadata = { title: "Literatura" };
export const dynamic = "force-dynamic";

export default async function LiteraturePage() {
  const { view, learnerId } = await getLiteratureHubAction();
  if (!learnerId) redirect("/onboarding");
  if (!view) redirect("/onboarding");

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-3 pb-10 sm:px-0">
      <LiteratureMaturityHub initialView={view} />
    </div>
  );
}
