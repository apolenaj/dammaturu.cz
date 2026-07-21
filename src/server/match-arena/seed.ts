import { track } from "@/lib/analytics";
import { saveMatchArenaPack } from "@/server/match-arena/store";
import { buildLiterarniParyPack } from "@/server/match-arena/packs/literarni-pary";

export async function seedMatchArena(): Promise<{
  pack: Awaited<ReturnType<typeof buildLiterarniParyPack>>;
  count: number;
}> {
  const pack = buildLiterarniParyPack();
  await saveMatchArenaPack(pack);
  track("match_arena_seeded", {
    packSlug: pack.slug,
    pairs: pack.pairs.length,
    rounds: pack.rounds.length,
  });
  return { pack, count: 1 };
}
