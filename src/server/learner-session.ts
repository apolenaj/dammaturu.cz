import { cookies } from "next/headers";
import {
  isSafeId,
  signLearnerId,
  verifyLearnerCookie,
} from "@/server/safe-id";

export const LEARNER_COOKIE = "dm_learner_id";

export async function getLearnerIdFromCookies(): Promise<string | undefined> {
  const jar = await cookies();
  const raw = jar.get(LEARNER_COOKIE)?.value;
  return verifyLearnerCookie(raw);
}

export async function setLearnerCookie(id: string): Promise<void> {
  if (!isSafeId(id)) {
    throw new Error("Neplatné learner id");
  }
  const jar = await cookies();
  jar.set(LEARNER_COOKIE, signLearnerId(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Ends browser session — does not delete learner FS record. */
export async function clearLearnerCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(LEARNER_COOKIE);
}
