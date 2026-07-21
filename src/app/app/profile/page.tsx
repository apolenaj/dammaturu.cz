import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/profile/logout-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  preferredStudyTimeLabels,
  readinessFeelingLabels,
  schoolTypeLabels,
  subjectLabels,
  studyModeLabels,
} from "@/domain/onboarding/schema";
import { getCurrentLearnerAction } from "@/server/actions/onboarding";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const learner = await getCurrentLearnerAction();
  if (!learner) redirect("/onboarding");

  const { profile, studyPlan, updatedAt } = learner;

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-display-md text-fg">Profil</h1>
        <p className="mt-2 text-body-md text-fg-secondary">
          Personalizovaný profil z onboardingu. Můžeš ho kdykoli upravit.
        </p>
      </div>

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
        <dl className="space-y-3 text-body-sm">
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
            <dt className="text-fg-muted">Diagnostika</dt>
            <dd className="font-semibold text-fg">
              {profile.wantsDiagnostic ? "Chci udělat" : "Zatím ne"}
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
          href="/onboarding?edit=1"
          className="inline-flex min-h-11 items-center rounded-md bg-action px-4 text-body-sm font-semibold text-fg-on-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Upravit onboarding
        </Link>
        <Link
          href="/app/plan"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-body-sm font-semibold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Zobrazit plán
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
