"use server";

import type { MockExamPack } from "@/domain/learning/mock-exam";
import { getMockExamPack } from "@/server/mock-exam/store";
import { track } from "@/lib/analytics";

export async function getMockExamAction(): Promise<{
  pack: MockExamPack | null;
}> {
  const pack = await getMockExamPack();
  if (pack) {
    track("mock_exam_opened", { topics: pack.topics.length });
  }
  return { pack };
}
