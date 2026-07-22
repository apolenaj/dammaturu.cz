import type { Metadata } from "next";
import Link from "next/link";
import { ReadinessHub } from "@/components/readiness/readiness-hub";
import { ProgressMotivationPanel } from "@/components/progress/progress-motivation-panel";
import { LearningCelebrationQueue } from "@/components/progress/learning-celebration-queue";
import { ProgressEvidencePanel } from "@/components/progress/progress-evidence-panel";
import { AppPageHeader } from "@/components/shell/app-screen";
import { EmptyState } from "@/components/ui/empty-state";
import { getReadinessHubAction } from "@/server/actions/readiness";
import { getProgressMotivationAction } from "@/server/actions/progress-gamification";
import { getProgressEvidenceAction } from "@/server/actions/progress-evidence";

export const metadata: Metadata = { title: "Pokrok" };
export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const [
    { snapshot, learnerId, hasBook },
    { view: progressView, celebrations },
    { view: evidenceView },
  ] = await Promise.all([
    getReadinessHubAction(),
    getProgressMotivationAction(),
    getProgressEvidenceAction(),
  ]);

  return (
    <div className="space-y-6 pb-4">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <AppPageHeader
          title="Pokrok"
          purpose="Jak dobře to umíš — podle toho, co opravdu vybavíš. Ne předpověď maturity. Body XP nepřidávají do připravenosti."
          primaryAction={{
            label: "Procvičit chyby",
            href: "/app/mistakes",
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
        {evidenceView ? <ProgressEvidencePanel view={evidenceView} /> : null}
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
