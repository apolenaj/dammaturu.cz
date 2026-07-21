import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authUserIdToLearnerId } from "@/server/auth/learner-id";
import {
  getLocalAuthIdentity,
  isLocalDevAuthEnabled,
} from "@/server/auth/local-dev-auth";

export type AuthIdentity = {
  userId: string;
  learnerId: string;
  email: string | null;
  user: User | null;
  provider: "supabase" | "local-dev";
};

/**
 * Stable learner id from Auth session (Supabase or local-dev).
 */
export async function getLearnerIdFromCookies(): Promise<string | undefined> {
  const identity = await getAuthIdentity();
  return identity?.learnerId;
}

export async function getAuthIdentity(): Promise<AuthIdentity | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!error && user) {
        return {
          userId: user.id,
          learnerId: authUserIdToLearnerId(user.id),
          email: user.email ?? null,
          user,
          provider: "supabase",
        };
      }
    } catch {
      // fall through to local-dev if enabled
    }
  }

  if (isLocalDevAuthEnabled()) {
    const local = await getLocalAuthIdentity();
    if (local) {
      return {
        userId: local.userId,
        learnerId: local.learnerId,
        email: local.email,
        user: null,
        provider: "local-dev",
      };
    }
  }

  return null;
}

export async function requireAuthIdentity(): Promise<AuthIdentity> {
  const identity = await getAuthIdentity();
  if (!identity) {
    throw new Error("UNAUTHORIZED");
  }
  return identity;
}

/** @deprecated Soft cookie removed — Auth session is source of truth. */
export async function setLearnerCookie(_unused?: string): Promise<void> {
  void _unused;
}

/** @deprecated Use signOut via auth actions. */
export async function clearLearnerCookie(): Promise<void> {}

export const LEARNER_COOKIE = "dm_learner_id";
