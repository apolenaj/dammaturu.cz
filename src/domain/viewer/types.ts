/**
 * Unified viewer/session — authenticated learner or anonymous guest.
 * Both share the same learnerId-keyed learning stores.
 */

export type ViewerKind = "authenticated" | "guest";

export type ViewerSession = {
  kind: ViewerKind;
  /** Stable id used by all learning stores (FS keys). */
  learnerId: string;
  /** Auth subject or guest id (same as learnerId for guests). */
  userId: string;
  email: string | null;
  provider: "supabase" | "local-dev" | "guest";
};

export const GUEST_DISPLAY_NAME_DEFAULT = "Host";
export const GUEST_LOCAL_STORAGE_KEY = "dammaturu-guest-id";
export const GUEST_COOKIE_NAME = "dm_guest_id";
