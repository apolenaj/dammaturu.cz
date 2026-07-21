import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { processLearnerMaterial } from "@/server/learner-materials/process";
import { createUploadingMaterial } from "@/server/learner-materials/store";
import { buildMaterialsStudySession } from "@/server/learner-materials/materials-session-build";
import {
  buildMaterialsSessionSummary,
  gradeMaterialsSessionItem,
} from "@/server/materials-study/session-runtime";
import { materialsSessionItemKinds } from "@/domain/learning/materials-study-session";

const LEARNER = "materials_session_e2e_learner";

afterEach(async () => {
  await fs.rm(
    path.join(process.cwd(), "data", "learner-materials", LEARNER),
    { recursive: true, force: true },
  );
  await fs.rm(path.join(process.cwd(), "data", "readiness", "books", `${LEARNER}.json`), {
    force: true,
  });
  await fs.rm(
    path.join(process.cwd(), "data", "materials-study", "schedules", `${LEARNER}.json`),
    { force: true },
  );
  await fs.rm(path.join(process.cwd(), "data", "open-answer-evals", LEARNER), {
    recursive: true,
    force: true,
  });
});

const SAMPLE_DOC = [
  "1. Romantismus",
  "",
  "Karel Hynek Mácha napsal skladbu Máj v roce 1836. Je to klíčové dílo českého romantismu.",
  "Mácha žil v letech 1810 až 1836.",
  "",
  "2. Realismus",
  "",
  "Jan Neruda psal Povídky malostranské. Realismus popisuje všední život měšťanů.",
  "Neruda patří k majovým autorům a českému realismu.",
].join("\n");

describe("materials study session E2E (uploaded sample)", () => {
  it("runs topic/smart-mix session: evaluate → mastery → schedule → summary", async () => {
    const created = await createUploadingMaterial({
      learnerId: LEARNER,
      title: "ČJL vzorový dokument",
      originalFilename: "cjl-sample.txt",
      format: "txt",
      mimeType: "text/plain",
      buffer: Buffer.from(SAMPLE_DOC, "utf8"),
    });
    expect(created.kind).toBe("created");
    if (created.kind !== "created") return;

    const processed = await processLearnerMaterial(created.material);
    expect(processed.status).toBe("ready");
    expect(processed.knowledgePointCount).toBeGreaterThanOrEqual(1);

    const smart = buildMaterialsStudySession({
      learnerId: LEARNER,
      materials: [processed],
      mode: "smart_mix",
      masteryBefore: {},
      maxItems: 10,
    });
    expect(smart.items.length).toBeGreaterThanOrEqual(1);
    const kindsUsed = new Set(smart.items.map((i) => i.kind));
    expect(kindsUsed.size).toBeGreaterThanOrEqual(
      Math.min(materialsSessionItemKinds.length, smart.items.length),
    );

    const topics = smart.availableTopics;
    expect(topics.length).toBeGreaterThanOrEqual(1);

    const topicSession = buildMaterialsStudySession({
      learnerId: LEARNER,
      materials: [processed],
      mode: "topic",
      topic: topics[0],
      masteryBefore: {},
      maxItems: 6,
    });
    expect(topicSession.items.length).toBeGreaterThanOrEqual(1);
    expect(topicSession.mode).toBe("topic");

    // Drive full smart-mix session through grade + schedule + mastery
    const session = smart;
    const attempts = [];
    for (const item of session.items) {
      if (item.kind === "flashcard") {
        const grade = await gradeMaterialsSessionItem({
          learnerId: LEARNER,
          item,
          studentAnswer: "know",
          flashcardGrade: "know",
        });
        expect(grade.attempt.result).toBe("correct");
        expect(grade.scheduledDueAt).toBeTruthy();
        attempts.push(grade.attempt);
        continue;
      }

      const good = await gradeMaterialsSessionItem({
        learnerId: LEARNER,
        item,
        studentAnswer: item.idealAnswer,
      });
      expect(["correct", "partial"]).toContain(good.attempt.result);
      expect(good.feedback.length).toBeGreaterThan(0);
      expect(good.idealAnswer).toBe(item.idealAnswer);
      expect(good.scheduledDueAt).toBeTruthy();
      attempts.push(good.attempt);
    }

    // One intentional miss for "what should be repeated"
    const missItem = session.items[0]!;
    if (missItem.kind !== "flashcard") {
      const miss = await gradeMaterialsSessionItem({
        learnerId: LEARNER,
        item: missItem,
        studentAnswer: "Shakespeare napsal Hamleta v roce 1599.",
      });
      attempts.push(miss.attempt);
    }

    const summary = await buildMaterialsSessionSummary({
      session,
      attempts,
    });

    expect(summary.attemptCount).toBe(attempts.length);
    expect(summary.estimatedRetention).toBeGreaterThanOrEqual(0);
    expect(summary.estimatedRetention).toBeLessThanOrEqual(1);
    expect(summary.estimatedRetentionLabelCs.length).toBeGreaterThan(0);
    expect(
      summary.whatImproved.length +
        summary.whatRemainsWeak.length +
        summary.whatShouldBeRepeated.length,
    ).toBeGreaterThan(0);
  });
});
