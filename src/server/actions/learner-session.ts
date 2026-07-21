"use server";

import {
  getSessionResumeAction as getSessionResumeFromAuth,
  logoutLearnerAction as logoutFromAuth,
} from "@/server/actions/auth";

/** Ends Auth session (Supabase or local-dev) and redirects home. */
export async function logoutLearnerAction(): Promise<void> {
  await logoutFromAuth();
}

export async function getSessionResumeAction() {
  return getSessionResumeFromAuth();
}
