import { buildBabickaExperiencePack } from "@/server/babicka-experience/build";
import { saveBabickaExperiencePack } from "@/server/babicka-experience/store";
import { track } from "@/lib/analytics";

export async function seedBabickaExperience(): Promise<{
  kuCount: number;
  activityCount: number;
}> {
  const pack = await buildBabickaExperiencePack();
  await saveBabickaExperiencePack(pack);
  track("babicka_experience_seeded", {
    kus: pack.knowledgeUnits.length,
    cards: pack.characterCards.length,
  });
  return {
    kuCount: pack.knowledgeUnits.length,
    activityCount: 6,
  };
}
