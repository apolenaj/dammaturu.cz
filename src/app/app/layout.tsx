import { redirect } from "next/navigation";
import { LearnerAppShell } from "@/components/shell/LearnerAppShell";
import { getAuthIdentity } from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";
import { recordProductEvent } from "@/server/product-analytics/store";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getAuthIdentity();
  if (!identity) {
    redirect("/prihlaseni?next=/app/dashboard&reason=session");
  }

  const learner = await getLearner(identity.learnerId);
  if (!learner) {
    redirect("/onboarding");
  }

  // Retention funnel: day-2 / day-7 return (no content logged).
  void recordProductEvent({
    learnerKey: identity.learnerId,
    event: "app_opened",
  });

  return <LearnerAppShell>{children}</LearnerAppShell>;
}
