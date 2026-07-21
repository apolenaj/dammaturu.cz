import { buildCjlLiteraryWorks } from "@/server/literary-work/packs/cjl-rozbory";
import { saveLiteraryWork } from "@/server/literary-work/store";
import { track } from "@/lib/analytics";

export async function seedLiteraryWorks(): Promise<{
  count: number;
  slugs: string[];
}> {
  const works = buildCjlLiteraryWorks();
  for (const work of works) {
    await saveLiteraryWork(work);
  }
  track("literary_works_seeded", { count: works.length });
  return {
    count: works.length,
    slugs: works.map((w) => w.slug),
  };
}
