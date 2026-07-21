import { buildKyticeExperiencePack } from "@/server/kytice-experience/build";
import { saveKyticeExperiencePack } from "@/server/kytice-experience/store";
import { track } from "@/lib/analytics";

export async function seedKyticeExperience(): Promise<{
  balladCount: number;
  gameCounts: { recognize: number; match: number; which: number };
}> {
  const pack = await buildKyticeExperiencePack();
  await saveKyticeExperiencePack(pack);
  track("kytice_experience_seeded", {
    ballads: pack.ballads.length,
    recognize: pack.games.recognizeByStory.length,
  });
  return {
    balladCount: pack.ballads.length,
    gameCounts: {
      recognize: pack.games.recognizeByStory.length,
      match: pack.games.matchGuiltConsequence.length,
      which: pack.games.whichBallad.length,
    },
  };
}
