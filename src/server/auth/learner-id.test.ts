import { describe, expect, it } from "vitest";
import {
  authUserIdToLearnerId,
  isAuthLearnerId,
} from "@/server/auth/learner-id";

describe("authUserIdToLearnerId", () => {
  it("maps UUID to stable 32-char hex learner id", () => {
    const id = authUserIdToLearnerId("550e8400-e29b-41d4-a716-446655440000");
    expect(id).toBe("550e8400e29b41d4a716446655440000");
    expect(isAuthLearnerId(id)).toBe(true);
  });

  it("rejects non-uuid", () => {
    expect(() => authUserIdToLearnerId("not-a-uuid")).toThrow(/Neplatné/);
    expect(() => authUserIdToLearnerId("../etc")).toThrow(/Neplatné/);
  });
});
