"use server";

import { assertAdmin } from "@/server/admin-auth";
import { buildContentTrustReportFromStores } from "@/server/content-trust/build-report";
import type { ContentTrustReport } from "@/domain/content/content-trust-report";

export async function getContentTrustReportAction(): Promise<
  { ok: true; report: ContentTrustReport } | { ok: false; error: string }
> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  try {
    const report = await buildContentTrustReportFromStores();
    return { ok: true, report };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Nepodařilo se sestavit report.",
    };
  }
}
