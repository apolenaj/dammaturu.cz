import { buildRealismusQuickGrasp } from "@/server/quick-grasp/packs/realismus";
import {
  listQuickGraspPacks,
  saveQuickGraspPack,
} from "@/server/quick-grasp/store";
import { track } from "@/lib/analytics";

export async function seedQuickGrasp() {
  const pack = buildRealismusQuickGrasp();
  await saveQuickGraspPack(pack);
  const all = await listQuickGraspPacks();
  track("quick_grasp_seeded", {
    packs: all.length,
    slug: pack.slug,
    steps: pack.steps.length,
  });
  return { pack, count: all.length };
}
