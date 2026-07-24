import { afterEach, describe, expect, it } from "vitest";
import { ensureGuestLearner } from "@/server/guest/ensure-guest-learner";
import {
  clearLearnerMemoryForTests,
  getLearner,
} from "@/server/learner-store";

describe("ensureGuestLearner", () => {
  const ids: string[] = [];
  const prevPersist = process.env.LEARNER_FS_PERSIST;
  const prevVercel = process.env.VERCEL;

  afterEach(async () => {
    clearLearnerMemoryForTests();
    if (prevPersist === undefined) delete process.env.LEARNER_FS_PERSIST;
    else process.env.LEARNER_FS_PERSIST = prevPersist;
    if (prevVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
    // Best-effort cleanup of any local FS leftovers from persist-enabled runs.
    const { promises: fs } = await import("node:fs");
    const path = await import("node:path");
    const dir = path.join(process.cwd(), "data", "learners");
    await Promise.all(
      ids.splice(0).map((id) =>
        fs.unlink(path.join(dir, `${id}.json`)).catch(() => undefined),
      ),
    );
  });

  it("coalesces parallel creates for the same guest id", async () => {
    const learnerId = `g${"a".repeat(32)}`;
    ids.push(learnerId);

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

    const first = await ensureGuestLearner(learnerId);
    const second = await ensureGuestLearner(learnerId);

    expect(second.createdAt).toBe(first.createdAt);
    expect(second.onboardingCompletedAt).toBe(first.onboardingCompletedAt);
  });

  it("works without local FS writes (Vercel mode)", async () => {
    process.env.VERCEL = "1";
    delete process.env.LEARNER_FS_PERSIST;
    const learnerId = `g${"c".repeat(32)}`;
    ids.push(learnerId);

    const record = await ensureGuestLearner(learnerId);
    expect(record.id).toBe(learnerId);
    expect(record.profile.subjects).toContain("cjl");
    expect((await getLearner(learnerId))?.id).toBe(learnerId);
  });
});
