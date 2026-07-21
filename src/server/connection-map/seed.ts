import { buildLiterarniSouvislostiMap } from "@/server/connection-map/packs/literarni-souvislosti";
import {
  listConnectionMapPacks,
  saveConnectionMapPack,
} from "@/server/connection-map/store";
import { track } from "@/lib/analytics";

export async function seedConnectionMap() {
  const pack = buildLiterarniSouvislostiMap();
  await saveConnectionMapPack(pack);
  const all = await listConnectionMapPacks();
  track("connection_map_seeded", {
    packs: all.length,
    slug: pack.slug,
    nodes: pack.nodes.length,
    paths: pack.paths.length,
  });
  return { pack, count: all.length };
}
