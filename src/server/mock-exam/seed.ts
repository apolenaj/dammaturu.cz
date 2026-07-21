import { buildMockExamPack } from "@/server/mock-exam/build";
import { saveMockExamPack } from "@/server/mock-exam/store";
import { track } from "@/lib/analytics";

export async function seedMockExam(): Promise<{ topicCount: number }> {
  const pack = buildMockExamPack();
  await saveMockExamPack(pack);
  track("mock_exam_seeded", { topics: pack.topics.length });
  return { topicCount: pack.topics.length };
}
