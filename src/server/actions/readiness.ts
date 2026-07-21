"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import type { ReadinessSnapshot } from "@/domain/learning/readiness";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  getReadinessBook,
  getReadinessSnapshotForLearner,
  saveReadinessBook,
} from "@/server/readiness/store";
import { buildDemoReadinessBook } from "@/server/readiness/seed";

type Fail = { ok: false; error: string };

export async function getReadinessHubAction(): Promise<{
  snapshot: ReadinessSnapshot | null;
  learnerId: string | null;
  hasBook: boolean;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) {
    return { snapshot: null, learnerId: null, hasBook: false };
  }
  const result = await getReadinessSnapshotForLearner({
    learnerId,
    persistHistory: true,
  });
  if (!result) {
    return { snapshot: null, learnerId, hasBook: false };
  }
  return {
    snapshot: result.snapshot,
    learnerId,
    hasBook: true,
  };
}

/** Load demo mastery — development / private QA only (not production). */
export async function loadDemoReadinessAction(): Promise<
  | { ok: true; snapshot: ReadinessSnapshot }
  | Fail
> {
  try {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        error: "Ukázková připravenost není v produkci dostupná.",
      };
    }
    if (process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA !== "1") {
      return {
        ok: false,
        error: "Ukázková data jsou vypnutá (beta tester režim).",
      };
    }
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const existing = await getReadinessBook(learnerId);
    if (existing && existing.units.length >= 8) {
      const snap = await getReadinessSnapshotForLearner({ learnerId });
      return {
        ok: true,
        snapshot: snap!.snapshot,
      };
    }
    const book = buildDemoReadinessBook(learnerId);
    await saveReadinessBook(book);
    const { buildReadinessSnapshot } = await import(
      "@/domain/learning/readiness"
    );
    const snapshot = buildReadinessSnapshot(book, new Date().toISOString());
    track("readiness_demo_loaded", { overallPct: snapshot.overallPct });
    revalidatePath("/app/progress");
    revalidatePath("/app/dashboard");
    return { ok: true, snapshot };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
