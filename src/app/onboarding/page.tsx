import type { Metadata } from "next";
import Link from "next/link";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { BrandMark } from "@/components/brand/BrandMark";
import { GuestPersistenceBridge } from "@/components/guest/guest-persistence-bridge";
import {
  getCurrentLearnerAction,
  requireOnboardingAccessAction,
} from "@/server/actions/onboarding";

export const metadata: Metadata = {
  title: "Onboarding",
  description:
    "Volitelně nastav jméno, datum maturity a denní plán — nebo rovnou začni učit.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function OnboardingPage({ searchParams }: PageProps) {
  const access = await requireOnboardingAccessAction();
  const params = await searchParams;
  const edit = params.edit === "1" || params.edit === "true";
  const learner = await getCurrentLearnerAction();

  return (
    <div className="min-h-dvh bg-paper-wash text-fg">
      <GuestPersistenceBridge />
      <header className="border-b border-border bg-surface/90 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <BrandMark href="/" size="sm" />
          <Link
            href="/app/learn"
            className="text-body-sm font-medium text-fg-secondary hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Přeskočit a začít se učit
          </Link>
        </div>
      </header>
      <main id="main-content" className="px-4 py-8 sm:px-6 sm:py-10">
        {access.kind === "guest" ? (
          <p className="mx-auto mb-6 max-w-lg text-body-sm text-fg-secondary">
            Osobní nastavení je volitelné. Na každém kroku můžeš přeskočit a
            rovnou se učit.
          </p>
        ) : access.email ? (
          <p className="mx-auto mb-4 max-w-lg truncate text-caption text-fg-muted">
            {access.email}
          </p>
        ) : null}
        <OnboardingWizard
          mode={edit && learner ? "edit" : "create"}
          initial={learner?.profile}
          allowSkip
        />
      </main>
    </div>
  );
}
