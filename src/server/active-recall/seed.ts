import { buildLiterarniVybavovaniPack } from "@/server/active-recall/packs/literarni-vybavovani";
import { listRecallPacks, saveRecallPack } from "@/server/active-recall/store";
import { track } from "@/lib/analytics";

export async function seedActiveRecall() {
  const pack = buildLiterarniVybavovaniPack();
  await saveRecallPack(pack);
  const all = await listRecallPacks();
  track("active_recall_seeded", {
    packs: all.length,
    slug: pack.slug,
    prompts: pack.prompts.length,
  });
  return { pack, count: all.length };
}
