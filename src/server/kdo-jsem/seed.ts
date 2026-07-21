import { buildLiterarniOsobnostiKdoJsem } from "@/server/kdo-jsem/packs/literarni-osobnosti";
import { listKdoJsemPacks, saveKdoJsemPack } from "@/server/kdo-jsem/store";
import { track } from "@/lib/analytics";

export async function seedKdoJsem() {
  const pack = await buildLiterarniOsobnostiKdoJsem();
  await saveKdoJsemPack(pack);
  const all = await listKdoJsemPacks();
  track("kdo_jsem_seeded", {
    packs: all.length,
    slug: pack.slug,
    mysteries: pack.mysteries.length,
    evidence: Object.keys(pack.evidence).length,
  });
  return { pack, count: all.length };
}
