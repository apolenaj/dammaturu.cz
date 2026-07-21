"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import { runContentQaPipeline } from "@/server/content-qa/pipeline";
import {
  applyReviewerDecision,
  type ReviewerDecision,
} from "@/server/content-qa/reviewer";
import {
  getQaLastRun,
  listQaItems,
} from "@/server/content-qa/store";
import type {
  ContentQaItem,
  ContentQaRunResult,
} from "@/server/content-qa/types";
import { assertAdmin } from "@/server/admin-auth";

export type ContentQaActionResult =
  | { ok: true; result: ContentQaRunResult }
  | { ok: false; error: string };

export type ContentQaReviewActionResult =
  | { ok: true; item: ContentQaItem }
  | { ok: false; error: string };

export async function runContentQaAction(): Promise<ContentQaActionResult> {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return gate;
    track("content_qa_started", { actor: "admin" });
    const result = await runContentQaPipeline({ actor: "admin" });
    revalidatePath("/admin/reviews");
    revalidatePath("/admin/content");
    return { ok: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    track("content_qa_failed", { reason: message });
    return { ok: false, error: message };
  }
}

export async function reviewQaItemAction(
  itemId: string,
  decision: ReviewerDecision,
): Promise<ContentQaReviewActionResult> {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return gate;
    const result = await applyReviewerDecision(itemId, decision);
    if (!result.ok) return result;
    revalidatePath("/admin/reviews");
    revalidatePath("/admin/content");
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

export async function getContentQaDashboardAction(): Promise<{
  items: ContentQaItem[];
  lastRun: ContentQaRunResult | null;
}> {
  const gate = await assertAdmin();
  if (!gate.ok) return { items: [], lastRun: null };
  const [items, lastRun] = await Promise.all([listQaItems(), getQaLastRun()]);
  return { items, lastRun };
}
