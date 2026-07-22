import { describe, expect, it } from "vitest";
import {
  gradePreviewChoice,
  publicPreviewItems,
} from "@/domain/marketing/public-learning-preview";

describe("public learning preview", () => {
  it("has graded items with source excerpts", () => {
    expect(publicPreviewItems.length).toBeGreaterThanOrEqual(2);
    for (const item of publicPreviewItems) {
      expect(item.sourceExcerptCs.length).toBeGreaterThan(20);
      expect(item.choices.some((c) => c.id === item.correctChoiceId)).toBe(
        true,
      );
    }
  });

  it("grades correct and wrong answers", () => {
    const item = publicPreviewItems[0]!;
    const ok = gradePreviewChoice(item, item.correctChoiceId);
    expect(ok.correct).toBe(true);
    const wrong = gradePreviewChoice(item, "zzz");
    expect(wrong.correct).toBe(false);
  });
});
