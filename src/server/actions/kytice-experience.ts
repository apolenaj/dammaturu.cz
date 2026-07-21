"use server";

import type { KyticeExperiencePack } from "@/domain/learning/kytice-experience";
import { getKyticeExperiencePack } from "@/server/kytice-experience/store";
import { track } from "@/lib/analytics";

export async function getKyticeExperienceAction(): Promise<{
  pack: KyticeExperiencePack | null;
}> {
  const pack = await getKyticeExperiencePack();
  if (pack) {
    track("kytice_experience_opened", { ballads: pack.ballads.length });
  }
  return { pack };
}
