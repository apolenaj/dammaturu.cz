import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOneMinuteStudyAction } from "@/server/actions/one-minute-study";
import { getCurrentLearnerAction } from "@/server/actions/onboarding";

export const metadata: Metadata = {
  title: "1 minuta",
};
export const dynamic = "force-dynamic";

/**
 * Bus-friendly entry: pick one micro-activity and go.
 * No decision tree — one CTA.
 */
export default async function OneMinutePage() {
  const learner = await getCurrentLearnerAction();
  if (!learner) {
    redirect("/onboarding");
  }

  const { plan } = await getOneMinuteStudyAction();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-1 pb-8">
      <header className="space-y-2">
        <p className="text-overline text-action">Na cestu</p>
        <h1 className="font-display text-display-md tracking-tight text-fg text-balance">
          {plan.titleCs}
        </h1>
        <p className="text-body-md text-fg-secondary">{plan.reasonCs}</p>
        <p className="text-caption text-fg-muted">
          ~{plan.estimatedSeconds} s · bez výběru režimu
        </p>
      </header>

      <Link
        href={plan.href}
        className="inline-flex min-h-14 w-full touch-manipulation items-center justify-center rounded-xl bg-action px-5 text-body-md font-semibold tracking-wide text-fg-on-brand shadow-sm transition duration-fast ease-out hover:bg-action-hover active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
      >
        {plan.ctaLabelCs}
      </Link>

      <p className="text-center text-caption text-fg-muted">
        Nebo{" "}
        <Link
          href="/app/dashboard"
          className="font-semibold text-action underline-offset-2 hover:underline"
        >
          zpět na Dnes
        </Link>
      </p>
    </div>
  );
}
