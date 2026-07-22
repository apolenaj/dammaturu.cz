import type { ViewerSession } from "@/domain/viewer/types";
import { ensureGuestLearner } from "@/server/guest/ensure-guest-learner";
import {
  readGuestIdFromCookies,
  resolveOrCreateGuestId,
} from "@/server/guest/guest-session";
import { getAuthIdentity } from "@/server/learner-session";

/**
 * Unified viewer: authenticated profile wins; otherwise anonymous guest.
 * Guarantees a persisted LearnerRecord for guests.
 */
export async function getViewerSession(options?: {
  /** When true, mint guest id if missing (Server Action / Route Handler only). */
  createGuestIfMissing?: boolean;
  /** Prefer this guest id (localStorage restore). */
  preferredGuestId?: string | null;
}): Promise<ViewerSession | null> {
  const auth = await getAuthIdentity();
  if (auth) {
    return {
      kind: "authenticated",
      learnerId: auth.learnerId,
      userId: auth.userId,
      email: auth.email,
      provider: auth.provider,
    };
  }

  let guestId = await readGuestIdFromCookies();
  if (!guestId && options?.createGuestIfMissing) {
    guestId = await resolveOrCreateGuestId(options.preferredGuestId);
  } else if (
    guestId &&
    options?.preferredGuestId &&
    options.preferredGuestId !== guestId
  ) {
    guestId = await resolveOrCreateGuestId(options.preferredGuestId);
  }

  if (!guestId) return null;

  await ensureGuestLearner(guestId);

  return {
    kind: "guest",
    learnerId: guestId,
    userId: guestId,
    email: null,
    provider: "guest",
  };
}

export async function requireViewerSession(options?: {
  preferredGuestId?: string | null;
}): Promise<ViewerSession> {
  const session = await getViewerSession({
    createGuestIfMissing: true,
    preferredGuestId: options?.preferredGuestId,
  });
  if (!session) {
    throw new Error("VIEWER_UNAVAILABLE");
  }
  return session;
}

/**
 * Resolve learnerId for Server Actions — auth or guest, ensuring guest profile.
 */
export async function resolveLearnerIdForAction(): Promise<string | null> {
  const { getLearnerIdFromCookies } = await import("@/server/learner-session");
  const { isGuestLearnerId } = await import("@/server/guest/guest-id");
  let id = (await getLearnerIdFromCookies()) ?? null;
  if (!id) {
    try {
      id = (await requireViewerSession()).learnerId;
    } catch {
      return null;
    }
  }
  if (isGuestLearnerId(id)) {
    await ensureGuestLearner(id);
  }
  return id;
}
