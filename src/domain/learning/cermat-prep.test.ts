import { describe, expect, it } from "vitest";
import {
  applyAttemptToProgress,
  buildCermatHubView,
  buildCermatSessionQueue,
  cermatCategories,
  emptyCermatProgress,
  gradeCermatAnswer,
  weakestCategories,
} from "@/domain/learning/cermat-prep";
import { buildCermatCjlPrepPack } from "@/server/cermat-prep/pack";

describe("cermat-prep (D-055)", () => {
  it("seeds labeled exam-style pack across all skill categories", () => {
    const pack = buildCermatCjlPrepPack("2026-07-21T12:00:00.000Z");
    expect(pack.slug).toBe("cermat-cjl-prep");
    expect(pack.disclaimerCs).toMatch(/nejsou oficiálními zadáními CERMAT/i);
    expect(pack.items.length).toBeGreaterThanOrEqual(8);
    for (const cat of cermatCategories) {
      expect(pack.items.some((i) => i.category === cat)).toBe(true);
    }
    for (const item of pack.items) {
      expect(item.provenance).toBe("exam_style_generated");
      expect(item.provenanceLabelCs).toMatch(/není oficiální CERMAT/i);
      expect(item.sourceNoteCs).not.toMatch(/^Oficiální CERMAT/);
    }
  });

  it("grades choice, true/false, and fill-blank alternatives", () => {
    const pack = buildCermatCjlPrepPack();
    const choice = pack.items.find((i) => i.id === "lang-style-1")!;
    expect(gradeCermatAnswer(choice, "b").result).toBe("correct");
    expect(gradeCermatAnswer(choice, "a").result).toBe("incorrect");

    const tf = pack.items.find((i) => i.id === "lex-homo-1")!;
    expect(gradeCermatAnswer(tf, "false").result).toBe("correct");
    expect(gradeCermatAnswer(tf, "true").result).toBe("incorrect");

    const blank = pack.items.find((i) => i.id === "text-work-1")!;
    expect(gradeCermatAnswer(blank, "šel jsem").result).toBe("correct");
    expect(gradeCermatAnswer(blank, "jsem šla").result).toBe("correct");
    expect(gradeCermatAnswer(blank, "šel").result).toBe("incorrect");
  });

  it("tracks performance by category and surfaces weak ones", () => {
    let progress = emptyCermatProgress("learner-1", "2026-07-21T12:00:00.000Z");
    progress = applyAttemptToProgress(progress, {
      category: "orthography",
      result: "incorrect",
      mode: "untimed_training",
      nowIso: "2026-07-21T12:01:00.000Z",
    });
    progress = applyAttemptToProgress(progress, {
      category: "orthography",
      result: "incorrect",
      mode: "untimed_training",
      nowIso: "2026-07-21T12:02:00.000Z",
    });
    progress = applyAttemptToProgress(progress, {
      category: "syntax",
      result: "correct",
      mode: "untimed_training",
      nowIso: "2026-07-21T12:03:00.000Z",
    });
    const ortho = progress.byCategory.find((c) => c.category === "orthography")!;
    expect(ortho.attempts).toBe(2);
    expect(ortho.accuracyPct).toBe(0);
    expect(weakestCategories(progress, 1)[0]).toBe("orthography");
  });

  it("builds timed / untimed / weak queues and hub view", () => {
    const pack = buildCermatCjlPrepPack("2026-07-21T12:00:00.000Z");
    let progress = emptyCermatProgress("learner-1", "2026-07-21T12:00:00.000Z");
    for (let i = 0; i < 3; i++) {
      progress = applyAttemptToProgress(progress, {
        category: "morphology",
        result: "incorrect",
        mode: "weak_category",
        nowIso: "2026-07-21T12:00:00.000Z",
      });
    }

    const timed = buildCermatSessionQueue({
      pack,
      mode: "timed_simulation",
      progress,
      limit: 8,
    });
    expect(timed.length).toBe(8);
    expect(new Set(timed.map((i) => i.category)).size).toBeGreaterThan(1);

    const filtered = buildCermatSessionQueue({
      pack,
      mode: "untimed_training",
      progress,
      categoryFilter: "syntax",
      limit: 5,
    });
    expect(filtered.every((i) => i.category === "syntax")).toBe(true);

    const weak = buildCermatSessionQueue({
      pack,
      mode: "weak_category",
      progress,
      limit: 6,
    });
    expect(weak.length).toBeGreaterThan(0);
    const focus = new Set(weakestCategories(progress, 3));
    expect(weak.every((i) => focus.has(i.category))).toBe(true);
    expect(weak.some((i) => i.category === "morphology")).toBe(true);

    const hub = buildCermatHubView({ pack, progress });
    expect(hub.categories).toHaveLength(8);
    expect(hub.modes).toHaveLength(3);
    expect(hub.generatedOnlyNoticeCs).toMatch(/exam-style generated/i);
    expect(hub.weakCategories[0]).toBe("morphology");
  });
});
