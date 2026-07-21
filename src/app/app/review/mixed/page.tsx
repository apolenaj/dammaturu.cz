import type { Metadata } from "next";
import Link from "next/link";
import { MixedReviewPlayer } from "@/components/review/mixed-review-player";
import { Card, CardDescription } from "@/components/ui/card";
import { getMixedReviewHubAction } from "@/server/actions/spaced-repetition";

export const metadata: Metadata = { title: "Mixed review" };
export const dynamic = "force-dynamic";

export default async function MixedReviewPage() {
  const { pack, summary, learnerId } = await getMixedReviewHubAction();

  if (!pack) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-3 pb-10">
        <Link
          href="/app/review"
          className="text-body-sm font-semibold text-action hover:underline"
        >
          ← Opakovat
        </Link>
        <Card>
          <CardDescription>
Tento obsah zatím není k dispozici. Zkus jinou aktivitu nebo se vrať později.
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-3 pb-10 sm:px-0">
      <Link
        href="/app/review"
        className="mx-auto block w-full max-w-3xl text-body-sm font-semibold text-action hover:underline"
      >
        ← Opakovat
      </Link>
      {!learnerId ? (
        <Card className="mx-auto max-w-3xl">
          <CardDescription>
            Pro schedule{" "}
            <Link href="/onboarding" className="font-semibold text-action">
              dokonči onboarding
            </Link>
            .
          </CardDescription>
        </Card>
      ) : null}
      <MixedReviewPlayer
        pack={pack}
        initialSummary={summary}
        learnerId={learnerId}
      />
    </div>
  );
}
