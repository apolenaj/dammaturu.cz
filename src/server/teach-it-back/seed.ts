import { buildCjlTeachBackPack } from "@/server/teach-it-back/packs/cjl-teach-back";
import { listTeachPacks, saveTeachPack } from "@/server/teach-it-back/store";
import { track } from "@/lib/analytics";

export async function seedTeachItBack() {
  const pack = buildCjlTeachBackPack();
  await saveTeachPack(pack);
  const all = await listTeachPacks();
  track("teach_it_back_seeded", {
    packs: all.length,
    slug: pack.slug,
    prompts: pack.prompts.length,
  });
  return { pack, count: all.length };
}
