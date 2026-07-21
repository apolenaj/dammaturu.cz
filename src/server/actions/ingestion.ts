"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import { runIngestionPipeline } from "@/server/ingestion/pipeline";
import {
  getLastRun,
  listDocuments,
  readAuditLog,
} from "@/server/ingestion/store";
import type {
  AuditLogEntry,
  IngestedSourceDocument,
  IngestionRunResult,
} from "@/server/ingestion/types";
import { assertAdmin } from "@/server/admin-auth";

export type IngestionActionResult =
  | { ok: true; result: IngestionRunResult }
  | { ok: false; error: string };

export async function runIngestionAction(): Promise<IngestionActionResult> {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return gate;
    track("ingestion_started", { actor: "admin" });
    const result = await runIngestionPipeline({ actor: "admin" });
    revalidatePath("/admin/sources");
    revalidatePath("/admin/content");
    revalidatePath("/admin/reviews");
    return { ok: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    track("ingestion_failed", { reason: message });
    return { ok: false, error: message };
  }
}

export async function getIngestionDashboardAction(): Promise<{
  documents: IngestedSourceDocument[];
  lastRun: IngestionRunResult | null;
  audit: AuditLogEntry[];
}> {
  const gate = await assertAdmin();
  if (!gate.ok) return { documents: [], lastRun: null, audit: [] };
  const [documents, lastRun, audit] = await Promise.all([
    listDocuments(),
    getLastRun(),
    readAuditLog(40),
  ]);
  return { documents, lastRun, audit };
}
