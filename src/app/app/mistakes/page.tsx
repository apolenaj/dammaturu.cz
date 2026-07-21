import type { Metadata } from "next";
import Link from "next/link";
import { MistakesHub } from "@/components/mistakes/mistakes-hub";
import { Card, CardDescription } from "@/components/ui/card";
import { getMistakesHubAction } from "@/server/actions/error-memory";

export const metadata: Metadata = { title: "Moje chyby" };
export const dynamic = "force-dynamic";

export default async function MistakesPage() {
  const { book, summary, learnerId } = await getMistakesHubAction();

  if (!learnerId) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-3 pb-10">
        <Link
          href="/app/dashboard"
          className="text-body-sm font-semibold text-action hover:underline"
        >
          ← Dnes
        </Link>
        <Card>
          <CardDescription>
            Pro Moje chyby{" "}
            <Link href="/onboarding" className="font-semibold text-action">
              dokonči onboarding
            </Link>
            .
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-3 pb-10 sm:px-0">
      <Link
        href="/app/dashboard"
        className="mx-auto block w-full max-w-3xl text-body-sm font-semibold text-action hover:underline"
      >
        ← Dnes
      </Link>
      <MistakesHub
        initialBook={book}
        initialSummary={summary}
        learnerId={learnerId}
      />
    </div>
  );
}
