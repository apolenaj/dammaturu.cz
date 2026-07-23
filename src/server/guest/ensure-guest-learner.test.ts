import { promises as fs } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureGuestLearner } from "@/server/guest/ensure-guest-learner";
import { getLearner } from "@/server/learner-store";

const LEARNERS_DIR = path.join(process.cwd(), "data", "learners");

async function cleanup(id: string) {
  await fs.unlink(path.join(LEARNERS_DIR, `${id}.json`)).catch(() => undefined);
}

describe("ensureGuestLearner", () => {
  const ids: string[] = [];

  afterEach(async () => {
    await Promise.all(ids.splice(0).map(cleanup));
  });

  it("coalesces parallel creates for the same guest id", async () => {
    const learnerId = `g${"a".repeat(32)}`;
    ids.push(learnerId);
    await cleanup(learnerId);

    const [a, b, c] = await Promise.all([
      ensureGuestLearner(learnerId),
      ensureGuestLearner(learnerId),
      ensureGuestLearner(learnerId),
    ]);

    expect(a.id).toBe(learnerId);
    expect(b.id).toBe(learnerId);
    expect(c.id).toBe(learnerId);
    expect(a.createdAt).toBe(b.createdAt);
    expect(b.createdAt).toBe(c.createdAt);

    const onDisk = await getLearner(learnerId);
    expect(onDisk?.id).toBe(learnerId);
    expect(onDisk?.profile.subjects).toContain("cjl");
  });

  it("returns the existing profile without overwriting", async () => {
    const learnerId = `g${"b".repeat(32)}`;
    ids.push(learnerId);
    await cleanup(learnerId);

    const first = await ensureGuestLearner(learnerId);
    const second = await ensureGuestLearner(learnerId);

    expect(second.createdAt).toBe(first.createdAt);
    expect(second.onboardingCompletedAt).toBe(first.onboardingCompletedAt);
  });
});
