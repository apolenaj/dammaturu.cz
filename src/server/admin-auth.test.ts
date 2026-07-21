import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

/**
 * Admin gate unit check (mirrors admin-auth token scheme without Next cookies).
 */
describe("admin auth token scheme", () => {
  it("derives stable session token from secret", () => {
    const secret = "qa-admin-secret";
    const token = createHmac("sha256", secret)
      .update("dammaturu-admin-v1")
      .digest("base64url");
    const again = createHmac("sha256", secret)
      .update("dammaturu-admin-v1")
      .digest("base64url");
    expect(token).toBe(again);
    expect(token.length).toBeGreaterThan(20);
  });
});
