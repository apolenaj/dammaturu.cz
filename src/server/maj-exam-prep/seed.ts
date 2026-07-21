import { buildMajExamPrepPack } from "@/server/maj-exam-prep/build";
import { saveMajExamPrepPack } from "@/server/maj-exam-prep/store";
import { track } from "@/lib/analytics";

export async function seedMajExamPrep(): Promise<{
  kuCount: number;
  activityCount: number;
}> {
  const pack = await buildMajExamPrepPack();
  await saveMajExamPrepPack(pack);
  track("maj_exam_prep_seeded", {
    kus: pack.knowledgeUnits.length,
    storyMap: pack.storyMap.length,
    quotes: pack.quoteDevices.length,
  });
  return {
    kuCount: pack.knowledgeUnits.length,
    activityCount: 7,
  };
}
