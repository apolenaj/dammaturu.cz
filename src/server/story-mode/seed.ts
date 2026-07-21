import { buildNarodniObrozeniStory } from "@/server/story-mode/packs/narodni-obrozeni";
import { listStoryPacks, saveStoryPack } from "@/server/story-mode/store";
import { track } from "@/lib/analytics";

export async function seedStoryMode() {
  const pack = await buildNarodniObrozeniStory();
  await saveStoryPack(pack);
  const all = await listStoryPacks();
  track("story_mode_seeded", {
    packs: all.length,
    slug: pack.slug,
    beats: pack.beats.length,
    evidence: Object.keys(pack.evidence).length,
  });
  return { pack, count: all.length };
}
