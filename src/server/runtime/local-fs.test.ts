import { afterEach, describe, expect, it } from "vitest";
import { canPersistLocalFs } from "@/server/runtime/local-fs";

describe("canPersistLocalFs", () => {
  const prev = {
    VERCEL: process.env.VERCEL,
    LEARNER_FS_PERSIST: process.env.LEARNER_FS_PERSIST,
  };

  afterEach(() => {
    if (prev.VERCEL === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prev.VERCEL;
    if (prev.LEARNER_FS_PERSIST === undefined) {
      delete process.env.LEARNER_FS_PERSIST;
    } else {
      process.env.LEARNER_FS_PERSIST = prev.LEARNER_FS_PERSIST;
    }
  });

  it("is false on Vercel by default", () => {
    process.env.VERCEL = "1";
    delete process.env.LEARNER_FS_PERSIST;
    expect(canPersistLocalFs()).toBe(false);
  });

  it("respects LEARNER_FS_PERSIST override", () => {
    process.env.VERCEL = "1";
    process.env.LEARNER_FS_PERSIST = "1";
    expect(canPersistLocalFs()).toBe(true);
    process.env.LEARNER_FS_PERSIST = "0";
    delete process.env.VERCEL;
    expect(canPersistLocalFs()).toBe(false);
  });

  it("is true when not on Vercel and unset", () => {
    delete process.env.VERCEL;
    delete process.env.LEARNER_FS_PERSIST;
    expect(canPersistLocalFs()).toBe(true);
  });
});
