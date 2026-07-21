import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/profile/logout-button";
import { BillingPanel } from "@/components/billing/billing-panel";
import { AppPageHeader } from "@/components/shell/app-screen";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  preferredStudyTimeLabels,
  readinessFeelingLabels,
  schoolTypeLabels,
  subjectLabels,
  studyModeLabels,
} from "@/domain/onboarding/schema";
import { getBillingOverviewAction } from "@/server/actions/billing";
import { getCurrentLearnerAction } from "@/server/actions/onboarding";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const learner = await getCurrentLearnerAction();
  if (!learner) redirect("/onboarding");

  const { profile, studyPlan, updatedAt } = learner;
  const billing = await getBillingOverviewAction();

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <AppPageHeader
        title="Profil"
        purpose="Účet, předplatné a nastavení studia. Maturitní dokumenty patří do Profilu maturity."
        primaryAction={{
          label: "Profil maturity",
          href: "/app/exam-profile",
        }}
        secondaryAction={{
          label: "Upravit onboarding",
          href: "/onboarding?edit=1",
        }}
      />

      {billing ? <BillingPanel overview={billing} /> : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{profile.displayName}</CardTitle>
            <Badge tone="brand">{studyModeLabels[profile.studyMode]}</Badge>
          </div>
          <CardDescription>
            Naposledy upraveno{" "}
            {new Date(updatedAt).toLocaleString("cs-CZ")}
          </CardDescription>
        </CardHeader>
        <dl className="space-y-3 px-6 pb-6 text-body-sm">
          <div>
            <dt className="text-fg-muted">Cílové datum</dt>
            <dd className="font-semibold text-fg">{profile.targetDate}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Škola</dt>
            <dd className="font-semibold text-fg">
              {schoolTypeLabels[profile.schoolType]}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted">Předměty</dt>
            <dd className="font-semibold text-fg">
              {profile.subjects.map((s) => subjectLabels[s]).join(", ")}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted">Pocit připravenosti</dt>
            <dd className="font-semibold text-fg">
              {readinessFeelingLabels[profile.readinessFeeling]}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted">Čas</dt>
            <dd className="font-semibold text-fg">
              {profile.dailyMinutes} min/den ·{" "}
              {preferredStudyTimeLabels[profile.preferredStudyTime]}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted">Study plan</dt>
            <dd className="font-semibold text-fg">
              {studyPlan.daysRemaining} dní do cíle · první mise:{" "}
              {studyPlan.firstMission.title}
            </dd>
          </div>
        </dl>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/app/plan"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-body-sm font-semibold text-fg"
        >
          Zobrazit plán
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
