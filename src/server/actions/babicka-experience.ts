"use server";

import type { BabickaExperiencePack } from "@/domain/learning/babicka-experience";
import { getBabickaExperiencePack } from "@/server/babicka-experience/store";
import { track } from "@/lib/analytics";

export async function getBabickaExperienceAction(): Promise<{
  pack: BabickaExperiencePack | null;
}> {
  const pack = await getBabickaExperiencePack();
  if (pack) {
    track("babicka_experience_opened", {
      kus: pack.knowledgeUnits.length,
    });
  }
  return { pack };
}
