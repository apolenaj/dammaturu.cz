import { track } from "@/lib/analytics";
import { buildLiterarniDejPack } from "@/server/story-reconstruction/packs/literarni-dej";
import { saveStoryReconstructionPack } from "@/server/story-reconstruction/store";

export async function seedStoryReconstruction(): Promise<{
  pack: Awaited<ReturnType<typeof buildLiterarniDejPack>>;
  count: number;
}> {
  const pack = await buildLiterarniDejPack();
  await saveStoryReconstructionPack(pack);
  track("story_reconstruction_seeded", {
    packSlug: pack.slug,
    stories: pack.stories.length,
    evidence: Object.keys(pack.evidence).length,
  });
  return { pack, count: 1 };
}
