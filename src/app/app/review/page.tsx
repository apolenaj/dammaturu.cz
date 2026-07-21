import type { Metadata } from "next";
import Link from "next/link";
import { FlashcardReviewHub } from "@/components/flashcards/flashcard-session";
import { AppPageHeader } from "@/components/shell/app-screen";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getReviewHubAction } from "@/server/actions/flashcards";
import { getMixedReviewHubAction } from "@/server/actions/spaced-repetition";

export const metadata: Metadata = { title: "Opakování" };
export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const [{ decks, learnerId, stats }, mixed] = await Promise.all([
    getReviewHubAction(),
    getMixedReviewHubAction(),
  ]);

  const totalDue =
    (mixed.summary?.dueCount ?? 0) +
    (mixed.summary?.newCount ?? 0) +
    stats.reduce((s, st) => s + st.due + st.newCount, 0);

  const mixedHref = "/app/review/mixed";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-3 pb-10 sm:px-0">
      <AppPageHeader
        title="Opakování"
        purpose="Nejdřív to, na čem začínáš zapomínat. Pak nové body — bez zbytečné omáčky."
        primaryAction={{
          label:
            totalDue > 0 ? `Zopakovat dnes (${totalDue})` : "Otevřít frontu",
          href: mixedHref,
        }}
      />

      <section className="space-y-3">
        {mixed.summary ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warning">Dnešní fronta</Badge>
                {totalDue > 0 ? (
                  <Badge tone="brand">{totalDue} položek</Badge>
                ) : null}
              </div>
              <CardTitle className="mt-2">{mixed.summary.headlineCs}</CardTitle>
              <CardDescription>{mixed.summary.supportingCs}</CardDescription>
            </CardHeader>
            <div className="space-y-3 px-6 pb-6">
              <Link
                href={mixedHref}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-action px-4 text-body-sm font-semibold text-fg-on-brand"
              >
                Spustit opakování
              </Link>
            </div>
          </Card>
        ) : (
          <EmptyState
            title="Fronta není připravená"
            description="Po onboardingu a prvním učení se opakovací balíček objeví sám."
            actionLabel="Učit se"
            actionHref="/app/learn"
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Kartičky
        </h2>
        {!learnerId ? (
          <EmptyState
            title="Nejdřív onboarding"
            description="Bez profilu neumíme vést opakovací frontu."
            actionLabel="Dokončit onboarding"
            actionHref="/onboarding"
          />
        ) : null}
        <FlashcardReviewHub
          decks={decks}
          stats={stats}
          learnerId={learnerId}
        />
      </section>
    </div>
  );
}
