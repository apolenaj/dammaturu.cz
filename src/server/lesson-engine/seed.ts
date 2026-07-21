import { buildHomonymaLesson } from "@/server/lesson-engine/lessons/homonyma-uvod";
import { listLessons, saveLesson } from "@/server/lesson-engine/store";
import { track } from "@/lib/analytics";

export async function seedLessonEngine() {
  const lesson = buildHomonymaLesson();
  await saveLesson(lesson);
  const all = await listLessons();
  track("lesson_engine_seeded", {
    lessons: all.length,
    blocks: lesson.blocks.length,
    slug: lesson.slug,
  });
  return { lesson, count: all.length };
}
