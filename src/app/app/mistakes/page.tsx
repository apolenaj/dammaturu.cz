import type { Metadata } from "next";
import { MistakesHub } from "@/components/mistakes/mistakes-hub";
import { AppPageHeader } from "@/components/shell/app-screen";
import { EmptyState } from "@/components/ui/empty-state";
import { getMistakesHubAction } from "@/server/actions/error-memory";

export const metadata: Metadata = { title: "Moje chyby" };
export const dynamic = "force-dynamic";

export default async function MistakesPage() {
  const { book, summary, learnerId } = await getMistakesHubAction();

  if (!learnerId) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-3 pb-10">
        <AppPageHeader
          title="Moje chyby"
          purpose="Slabiny z testů a studia — opravuj je cíleně, historie zůstává."
        />
        <EmptyState
          title="Nejdřív onboarding"
          description="Bez profilu neumíme ukládat chyby."
          actionLabel="Dokončit onboarding"
          actionHref="/onboarding"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-3 pb-10 sm:px-0">
      <div className="mx-auto w-full max-w-3xl">
        <AppPageHeader
          title="Moje chyby"
          purpose="Jen reálné chyby z testů a studia. Procvič slabiny, historie zůstává."
          primaryAction={{
            label: "Zpět na Testy",
            href: "/app/tests",
          }}
        />
      </div>
      <MistakesHub
        initialBook={book}
        initialSummary={summary}
        learnerId={learnerId}
      />
    </div>
  );
}
