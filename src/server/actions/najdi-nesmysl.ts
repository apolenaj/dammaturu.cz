"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import type {
  NonsenseGrade,
  NonsensePack,
  NonsenseProgress,
} from "@/domain/learning/najdi-nesmysl";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  getNonsensePackBySlug,
  getNonsenseProgress,
  listNonsensePacks,
  submitNonsense,
} from "@/server/najdi-nesmysl/store";

export async function listNonsensePacksAction(): Promise<NonsensePack[]> {
  return listNonsensePacks();
}

export async function getNonsenseSessionAction(slug: string): Promise<{
  pack: NonsensePack | null;
  progress: NonsenseProgress | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const pack = await getNonsensePackBySlug(slug);
  const progress =
    learnerId && pack ? await getNonsenseProgress(learnerId, pack.id) : null;
  return { pack, progress, learnerId };
}

type Fail = { ok: false; error: string };

export async function submitNonsenseAction(input: {
  packSlug: string;
  roundId: string;
  selectedStatementId: string;
  studentReason: string;
}): Promise<
  | { ok: true; progress: NonsenseProgress; grade: NonsenseGrade }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getNonsensePackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Balíček nenalezen." };
    const result = await submitNonsense({
      learnerId,
      pack,
      roundId: input.roundId,
      selectedStatementId: input.selectedStatementId,
      studentReason: input.studentReason,
    });
    track("najdi_nesmysl_attempt", {
      packSlug: input.packSlug,
      pickCorrect: result.grade.pickCorrect,
      reasonQuality: result.grade.reasonQuality,
    });
    revalidatePath(`/app/learn/najdi-nesmysl/${input.packSlug}`);
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
