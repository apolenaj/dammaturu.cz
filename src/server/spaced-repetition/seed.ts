import { track } from "@/lib/analytics";
import { buildCjlSpacedPack } from "@/server/spaced-repetition/packs/cjl-spaced";
import { saveSpacedPack } from "@/server/spaced-repetition/store";

export async function seedSpacedRepetition(): Promise<{
  pack: ReturnType<typeof buildCjlSpacedPack>;
  count: number;
}> {
  const pack = buildCjlSpacedPack();
  await saveSpacedPack(pack);
  track("spaced_repetition_seeded", {
    packSlug: pack.slug,
    knowledge: pack.knowledge.length,
  });
  return { pack, count: 1 };
}
