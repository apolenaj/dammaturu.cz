"use server";

import type { MajExamPrepPack } from "@/domain/learning/maj-exam-prep";
import { getMajExamPrepPack } from "@/server/maj-exam-prep/store";
import { track } from "@/lib/analytics";

export async function getMajExamPrepAction(): Promise<{
  pack: MajExamPrepPack | null;
}> {
  const pack = await getMajExamPrepPack();
  if (pack) {
    track("maj_exam_prep_opened", {
      kus: pack.knowledgeUnits.length,
    });
  }
  return { pack };
}
