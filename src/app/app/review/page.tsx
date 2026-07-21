import type { Metadata } from "next";
import Link from "next/link";
import { FlashcardReviewHub } from "@/components/flashcards/flashcard-session";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getReviewHubAction } from "@/server/actions/flashcards";
import { getMixedReviewHubAction } from "@/server/actions/spaced-repetition";

export const metadata: Metadata = { title: "Opakovat" };
export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const [{ decks, learnerId, stats }, mixed] = await Promise.all([
    getReviewHubAction(),
    getMixedReviewHubAction(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-3 pb-10 sm:px-0">
      <section className="space-y-3">
        <h1 className="font-display text-display-md text-fg">Opakovat</h1>
        {mixed.summary ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warning">Spaced · mixed</Badge>
              </div>
              <CardTitle className="mt-2">{mixed.summary.headlineCs}</CardTitle>
              <CardDescription>
                Flashcards + free recall + matching + otázky. Po chybě kratší
                interval, po jisté odpovědi delší. Stejný formát se neopakuje
                donekonečna.
              </CardDescription>
            </CardHeader>
            <Link
              href="/app/review/mixed"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-action px-4 text-body-sm font-semibold text-fg-on-brand shadow-xs hover:bg-action-hover"
            >
              Spustit mixed review
            </Link>
          </Card>
        ) : (
          <Card>
            <CardDescription>
              Spaced pack chybí.{" "}
              <code className="text-body-sm">
                npm run seed:spaced-repetition
              </code>
            </CardDescription>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Flashcards (SM-2)
        </h2>
        {!learnerId ? (
          <Card>
            <CardDescription>
              Pro SM-2 schedule{" "}
              <Link href="/onboarding" className="font-semibold text-action">
                dokonči onboarding
              </Link>
              .
            </CardDescription>
          </Card>
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
