import { track } from "@/lib/analytics";
import { buildCjlSpeedPack } from "@/server/speed-round/packs/cjl-speed";
import { saveSpeedRoundPack } from "@/server/speed-round/store";

export async function seedSpeedRound(): Promise<{
  pack: ReturnType<typeof buildCjlSpeedPack>;
  count: number;
}> {
  const pack = buildCjlSpeedPack();
  await saveSpeedRoundPack(pack);
  track("speed_round_seeded", {
    packSlug: pack.slug,
    questions: pack.questions.length,
  });
  return { pack, count: 1 };
}
