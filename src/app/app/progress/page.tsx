import type { Metadata } from "next";
import Link from "next/link";
import { ReadinessHub } from "@/components/readiness/readiness-hub";
import { ProgressMotivationPanel } from "@/components/progress/progress-motivation-panel";
import { LearningCelebrationQueue } from "@/components/progress/learning-celebration-queue";
import { AppPageHeader } from "@/components/shell/app-screen";
import { EmptyState } from "@/components/ui/empty-state";
import { getReadinessHubAction } from "@/server/actions/readiness";
import { getProgressMotivationAction } from "@/server/actions/progress-gamification";

export const metadata: Metadata = { title: "Pokrok" };
export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const [
    { snapshot, learnerId, hasBook },
    { view: progressView, celebrations },
  ] = await Promise.all([
    getReadinessHubAction(),
    getProgressMotivationAction(),
  ]);

  return (
    <div className="space-y-6 pb-4">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <AppPageHeader
          title="Pokrok"
          purpose="Kde stojíš podle mastery — ne predikce, že maturitu dáš. Oslavujeme reálný postup; XP nepřidává do připravenosti."
          primaryAction={{
            label: "1 minuta",
            href: "/app/minute",
          }}
          secondaryAction={{
            label: "Zpět na Dnes",
            href: "/app/dashboard",
          }}
        />
        {!learnerId ? (
          <EmptyState
            title="Nejdřív onboarding"
            description="Bez profilu neumíme spočítat připravenost."
            actionLabel="Dokončit onboarding"
            actionHref="/onboarding"
          />
        ) : null}
        {celebrations.length > 0 ? (
          <LearningCelebrationQueue initial={celebrations} />
        ) : null}
        {progressView ? (
          <div className="space-y-3">
            <ProgressMotivationPanel view={progressView} />
            <p className="text-body-sm text-fg-secondary">
              <Link
                href="/app/progress/experiment"
                className="font-semibold text-action hover:underline"
              >
                N=1 Beta experiment
              </Link>
            </p>
          </div>
        ) : null}
      </div>
      <ReadinessHub
        initialSnapshot={snapshot}
        learnerId={learnerId}
        hasBook={hasBook}
      />
    </div>
  );
}
