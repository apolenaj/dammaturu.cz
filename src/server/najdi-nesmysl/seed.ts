import { track } from "@/lib/analytics";
import { buildCjlNesmyslPack } from "@/server/najdi-nesmysl/packs/cjl-nesmysl";
import { saveNonsensePack } from "@/server/najdi-nesmysl/store";

export async function seedNajdiNesmysl(): Promise<{
  pack: ReturnType<typeof buildCjlNesmyslPack>;
  count: number;
}> {
  const pack = buildCjlNesmyslPack();
  await saveNonsensePack(pack);
  track("najdi_nesmysl_seeded", {
    packSlug: pack.slug,
    rounds: pack.rounds.length,
  });
  return { pack, count: 1 };
}
