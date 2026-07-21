"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearLearnerCookie,
  getLearnerIdFromCookies,
} from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";

/**
 * Soft session end — clears signed learner cookie.
 * Does not delete FS learner record (can resume only with same cookie / device).
 */
export async function logoutLearnerAction(): Promise<void> {
  await clearLearnerCookie();
  revalidatePath("/", "layout");
  redirect("/");
}

/** Resume if cookie still valid; otherwise null (no email Auth). */
export async function getSessionResumeAction(): Promise<{
  hasSession: boolean;
  displayName: string | null;
} | null> {
  const id = await getLearnerIdFromCookies();
  if (!id) return { hasSession: false, displayName: null };
  const learner = await getLearner(id);
  if (!learner) return { hasSession: false, displayName: null };
  return {
    hasSession: true,
    displayName: learner.profile.displayName,
  };
}
