"use server";

import type { CjlHomeView } from "@/domain/study-content/cjl-home";
import { buildCjlHomeView } from "@/server/study-content/cjl-home";
import { resolveLearnerIdForAction } from "@/server/viewer-session";

export async function getCjlHomeAction(): Promise<{
  learnerId: string | null;
  view: CjlHomeView;
}> {
  const learnerId = await resolveLearnerIdForAction();
  const view = await buildCjlHomeView(learnerId);
  return { learnerId, view };
}
