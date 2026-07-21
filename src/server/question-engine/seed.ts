import { buildCjlOtazkyPack } from "@/server/question-engine/packs/cjl-otazky";
import {
  listQuestionPacks,
  saveQuestionPack,
} from "@/server/question-engine/store";
import { track } from "@/lib/analytics";

export async function seedQuestionEngine() {
  const pack = buildCjlOtazkyPack();
  await saveQuestionPack(pack);
  const all = await listQuestionPacks();
  track("question_engine_seeded", {
    packs: all.length,
    slug: pack.slug,
    questions: pack.questions.length,
    kinds: new Set(pack.questions.map((q) => q.kind)).size,
  });
  return { pack, count: all.length };
}
