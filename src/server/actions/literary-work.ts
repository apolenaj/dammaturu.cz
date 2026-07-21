"use server";

import {
  toLiteraryWorkListItem,
  type LiteraryWork,
  type LiteraryWorkListItem,
} from "@/domain/learning/literary-work";
import {
  getLiteraryWorkBySlug,
  listLiteraryWorks,
} from "@/server/literary-work/store";
import { track } from "@/lib/analytics";

export async function listLiteraryWorksAction(): Promise<{
  items: LiteraryWorkListItem[];
}> {
  const works = await listLiteraryWorks();
  return { items: works.map(toLiteraryWorkListItem) };
}

export async function getLiteraryWorkAction(
  slug: string,
): Promise<{ work: LiteraryWork | null }> {
  const work = await getLiteraryWorkBySlug(slug);
  if (work) {
    track("literary_work_opened", {
      slug: work.slug,
      title: work.title,
    });
  }
  return { work };
}
