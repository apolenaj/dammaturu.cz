import { buildLiterarniHistorieTimeline } from "@/server/timeline/packs/literarni-historie";
import { listTimelinePacks, saveTimelinePack } from "@/server/timeline/store";
import { track } from "@/lib/analytics";

export async function seedTimeline() {
  const pack = buildLiterarniHistorieTimeline();
  await saveTimelinePack(pack);
  const all = await listTimelinePacks();
  track("timeline_seeded", {
    packs: all.length,
    slug: pack.slug,
    events: pack.events.length,
  });
  return { pack, count: all.length };
}
