import type { Metadata } from "next";
import Link from "next/link";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { BrandMark } from "@/components/brand/BrandMark";
import { getCurrentLearnerAction } from "@/server/actions/onboarding";

export const metadata: Metadata = {
  title: "Onboarding",
  description:
    "Nastav si profil, cílové datum a denní plán přípravy k maturitě.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function OnboardingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const edit = params.edit === "1" || params.edit === "true";
  const learner = await getCurrentLearnerAction();

  return (
    <div className="min-h-dvh bg-paper-wash text-fg">
      <header className="border-b border-border bg-surface/90 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <BrandMark href="/" size="sm" />
          {learner ? (
            <Link
              href="/app/dashboard"
              className="text-body-sm font-medium text-fg-secondary hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Zpět do appky
            </Link>
          ) : (
            <Link
              href="/"
              className="text-body-sm font-medium text-fg-secondary hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Domů
            </Link>
          )}
        </div>
      </header>
      <main id="main-content" className="px-4 py-8 sm:px-6 sm:py-10">
        <OnboardingWizard
          mode={edit && learner ? "edit" : "create"}
          initial={learner?.profile}
        />
      </main>
    </div>
  );
}
