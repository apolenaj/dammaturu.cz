import type { Metadata } from "next";
import Link from "next/link";
import { ReadinessHub } from "@/components/readiness/readiness-hub";
import { ProgressMotivationPanel } from "@/components/progress/progress-motivation-panel";
import { Card, CardDescription } from "@/components/ui/card";
import { getReadinessHubAction } from "@/server/actions/readiness";
import { getProgressMotivationAction } from "@/server/actions/progress-gamification";

export const metadata: Metadata = { title: "Připravenost" };
export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const [{ snapshot, learnerId, hasBook }, { view: progressView }] =
    await Promise.all([
      getReadinessHubAction(),
      getProgressMotivationAction(),
    ]);

  return (
    <div className="space-y-6 px-3 pb-10 sm:px-0">
      <Link
        href="/app/dashboard"
        className="mx-auto block w-full max-w-3xl text-body-sm font-semibold text-action hover:underline"
      >
        ← Dnes
      </Link>
      {!learnerId ? (
        <Card className="mx-auto max-w-3xl">
          <CardDescription>
            Pro Připravenost{" "}
            <Link href="/onboarding" className="font-semibold text-action">
              dokonči onboarding
            </Link>
            .
          </CardDescription>
        </Card>
      ) : null}
      {progressView ? (
        <div className="mx-auto w-full max-w-3xl space-y-3">
          <ProgressMotivationPanel view={progressView} />
          <p className="text-body-sm text-fg-secondary">
            <Link
              href="/app/progress/experiment"
              className="font-semibold text-action hover:underline"
            >
              N=1 Beta experiment report
            </Link>
            {" · "}
            <Link
              href="/app/progress/beta-report"
              className="font-semibold text-action hover:underline"
            >
              Before / After (legacy)
            </Link>
          </p>
        </div>
      ) : null}
      <ReadinessHub
        initialSnapshot={snapshot}
        learnerId={learnerId}
        hasBook={hasBook}
      />
    </div>
  );
}
