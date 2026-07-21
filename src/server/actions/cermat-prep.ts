"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import {
  buildCermatHubView,
  type CermatCategory,
  type CermatGradeResult,
  type CermatHubView,
  type CermatItem,
  type CermatLearnerProgress,
  type CermatSessionMode,
} from "@/domain/learning/cermat-prep";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  getCermatPack,
  getCermatProgress,
  recordCermatAttempt,
  startCermatSession,
} from "@/server/cermat-prep/store";

type Fail = { ok: false; error: string };

export async function getCermatHubAction(): Promise<{
  view: CermatHubView | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { view: null, learnerId: null };
  const [pack, progress] = await Promise.all([
    getCermatPack(),
    getCermatProgress(learnerId),
  ]);
  return { view: buildCermatHubView({ pack, progress }), learnerId };
}

export async function startCermatSessionAction(input: {
  mode: CermatSessionMode;
  categoryFilter?: CermatCategory | null;
}): Promise<
  | {
      ok: true;
      items: CermatItem[];
      timedSeconds: number | null;
      mode: CermatSessionMode;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const session = await startCermatSession({
      learnerId,
      mode: input.mode,
      categoryFilter: input.categoryFilter,
    });
    if (session.items.length === 0) {
      return { ok: false, error: "V této kategorii zatím nejsou položky." };
    }
    track("cermat_session_started", {
      mode: input.mode,
      items: session.items.length,
      timed: Boolean(session.timedSeconds),
    });
    return {
      ok: true,
      items: session.items,
      timedSeconds: session.timedSeconds,
      mode: input.mode,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function submitCermatAnswerAction(input: {
  itemId: string;
  answer: string | string[];
  mode: CermatSessionMode;
}): Promise<
  | {
      ok: true;
      result: CermatGradeResult;
      explanationCs: string;
      provenanceLabelCs: string;
      progress: CermatLearnerProgress;
      category: CermatCategory;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const res = await recordCermatAttempt({
      learnerId,
      itemId: input.itemId,
      answer: input.answer,
      mode: input.mode,
    });
    track("cermat_item_answered", {
      category: res.item.category,
      result: res.result,
      mode: input.mode,
    });
    revalidatePath("/app/cermat");
    return {
      ok: true,
      result: res.result,
      explanationCs: res.explanationCs,
      provenanceLabelCs: res.provenanceLabelCs,
      progress: res.progress,
      category: res.item.category,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
