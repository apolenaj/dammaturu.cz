"use server";

import { revalidatePath } from "next/cache";
import type { ViewerSession } from "@/domain/viewer/types";
import { ensureGuestLearner } from "@/server/guest/ensure-guest-learner";
import { getViewerSession, requireViewerSession } from "@/server/viewer-session";

export type SyncGuestResult = {
  kind: ViewerSession["kind"];
  learnerId: string;
  guestId: string | null;
};

/**
 * Client bridge: sync localStorage guest id ↔ httpOnly cookie.
 * Call once on app shell mount so reloads / cookie clears restore progress.
 */
export async function syncGuestIdentityAction(input?: {
  localGuestId?: string | null;
}): Promise<SyncGuestResult> {
  const session = await requireViewerSession({
    preferredGuestId: input?.localGuestId ?? null,
  });

  if (session.kind === "authenticated") {
    return {
      kind: "authenticated",
      learnerId: session.learnerId,
      guestId: null,
    };
  }

  await ensureGuestLearner(session.learnerId);
  return {
    kind: "guest",
    learnerId: session.learnerId,
    guestId: session.learnerId,
  };
}

export async function getViewerSessionAction(): Promise<ViewerSession | null> {
  return getViewerSession({ createGuestIfMissing: false });
}

export async function ensureViewerReadyAction(): Promise<SyncGuestResult> {
  const session = await requireViewerSession();
  revalidatePath("/app", "layout");
  return {
    kind: session.kind,
    learnerId: session.learnerId,
    guestId: session.kind === "guest" ? session.learnerId : null,
  };
}
