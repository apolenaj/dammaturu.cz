import type { Metadata } from "next";
import { LearnerAppShell } from "@/components/shell/LearnerAppShell";
import { GuestPersistenceBridge } from "@/components/guest/guest-persistence-bridge";
import { GuestStudyBanner } from "@/components/guest/guest-study-banner";
import { ensureGuestLearner } from "@/server/guest/ensure-guest-learner";
import { getViewerSession } from "@/server/viewer-session";
import { recordProductEvent } from "@/server/product-analytics/store";

/** Student app — never index private / personalized surfaces. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewerSession({ createGuestIfMissing: false });

  // Middleware should have set the guest cookie; if somehow missing, shell still
  // mounts and GuestPersistenceBridge mints via server action.
  if (viewer) {
    if (viewer.kind === "guest") {
      try {
        await ensureGuestLearner(viewer.learnerId);
      } catch (error) {
        console.error("[app-layout] guest bootstrap failed", error);
      }
      void recordProductEvent({
        learnerKey: viewer.learnerId,
        event: "guest_start",
        funnelStep: "start",
      });
    }
    void recordProductEvent({
      learnerKey: viewer.learnerId,
      event: "app_opened",
    });
  }

  return (
    <LearnerAppShell>
      <GuestPersistenceBridge />
      {viewer?.kind === "guest" ? <GuestStudyBanner /> : null}
      {children}
    </LearnerAppShell>
  );
}
