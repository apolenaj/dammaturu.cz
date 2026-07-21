import { normalizeStatement } from "@/server/content-qa/normalize";
import {
  auditQaChange,
  getQaItem,
  saveQaItem,
} from "@/server/content-qa/store";
import type { ContentQaItem } from "@/server/content-qa/types";
import { track } from "@/lib/analytics";

export type ReviewerDecision =
  | {
      action: "verify";
      /** Optional polish; defaults to normalized. Must not invent facts silently. */
      publishedStatement?: string;
      reviewerNote: string;
      reviewedBy?: string;
    }
  | {
      action: "correct";
      publishedStatement: string;
      reviewerNote: string;
      reviewedBy?: string;
    }
  | {
      action: "reject";
      reviewerNote: string;
      reviewedBy?: string;
    }
  | {
      action: "reopen";
      reviewerNote: string;
      reviewedBy?: string;
    };

export type ReviewResult =
  | { ok: true; item: ContentQaItem }
  | { ok: false; error: string };

function requireNote(note: string | undefined): string | null {
  const trimmed = note?.trim() ?? "";
  if (trimmed.length < 8) {
    return "Reviewer note je povinná (min. 8 znaků) — auditovatelná poznámka.";
  }
  return null;
}

/**
 * Human-only status transitions.
 * Never auto-corrects historical facts — correct requires explicit note + FINAL text.
 */
export async function applyReviewerDecision(
  itemId: string,
  decision: ReviewerDecision,
): Promise<ReviewResult> {
  const item = await getQaItem(itemId);
  if (!item) return { ok: false, error: "QA položka nenalezena." };

  const noteError = requireNote(decision.reviewerNote);
  if (noteError) return { ok: false, error: noteError };

  const now = new Date().toISOString();
  const reviewedBy = decision.reviewedBy?.trim() || "admin";
  let next: ContentQaItem;

  switch (decision.action) {
    case "verify": {
      const published = normalizeStatement(
        decision.publishedStatement?.trim() || item.normalizedStatement,
      );
      const sourceNorm = item.normalizedStatement;
      // Verify may only publish SOURCE/NORMALIZED (or identical). Fact changes → correct.
      if (published !== sourceNorm && published !== normalizeStatement(item.sourceStatement)) {
        return {
          ok: false,
          error:
            "Změna faktu vyžaduje akci „Opravit“ (corrected) s auditovatelnou poznámkou — ne verify.",
        };
      }
      next = {
        ...item,
        validationStatus: "verified_from_source",
        publishedStatement: published,
        reviewerNote: decision.reviewerNote.trim(),
        reviewedAt: now,
        reviewedBy,
        updatedAt: now,
      };
      break;
    }
    case "correct": {
      const published = normalizeStatement(decision.publishedStatement);
      if (!published) {
        return { ok: false, error: "FINAL (opravené) tvrzení je povinné." };
      }
      if (published === item.normalizedStatement) {
        return {
          ok: false,
          error:
            "Oprava musí změnit tvrzení. Pro potvrzení zdroje použij „Ověřit ze zdroje“.",
        };
      }
      next = {
        ...item,
        validationStatus: "corrected",
        publishedStatement: published,
        reviewerNote: decision.reviewerNote.trim(),
        reviewedAt: now,
        reviewedBy,
        updatedAt: now,
      };
      break;
    }
    case "reject": {
      next = {
        ...item,
        validationStatus: "rejected",
        publishedStatement: null,
        reviewerNote: decision.reviewerNote.trim(),
        reviewedAt: now,
        reviewedBy,
        updatedAt: now,
      };
      break;
    }
    case "reopen": {
      next = {
        ...item,
        validationStatus: "needs_fact_check",
        publishedStatement: null,
        reviewerNote: decision.reviewerNote.trim(),
        reviewedAt: now,
        reviewedBy,
        updatedAt: now,
      };
      break;
    }
    default:
      return { ok: false, error: "Neznámá akce." };
  }

  await saveQaItem(next);
  await auditQaChange(
    `content_qa_${decision.action}`,
    next,
    `${decision.action}: ${next.validationStatus} — ${decision.reviewerNote.trim().slice(0, 200)}`,
    "admin",
  );
  track("content_qa_reviewed", {
    action: decision.action,
    status: next.validationStatus,
    qaItemId: next.id,
  });

  return { ok: true, item: next };
}
