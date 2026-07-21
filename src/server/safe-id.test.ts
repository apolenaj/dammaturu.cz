import { describe, expect, it } from "vitest";
import {
  assertSafeId,
  isSafeId,
  signLearnerId,
  verifyLearnerCookie,
} from "@/server/safe-id";

describe("safe-id / signed learner cookie", () => {
  it("rejects path traversal ids", () => {
    expect(isSafeId("../etc/passwd")).toBe(false);
    expect(isSafeId("ok-learner_1")).toBe(true);
    expect(() => assertSafeId("../x")).toThrow(/Neplatné/);
  });

  it("signs and verifies learner cookies", () => {
    process.env.LEARNER_SESSION_SECRET = "test-secret-for-qa";
    const signed = signLearnerId("learner-abc");
    expect(signed).toContain("learner-abc.");
    expect(verifyLearnerCookie(signed)).toBe("learner-abc");
    expect(verifyLearnerCookie("learner-abc.tampered")).toBeUndefined();
    expect(verifyLearnerCookie("../../../evil.abc")).toBeUndefined();
  });
});
