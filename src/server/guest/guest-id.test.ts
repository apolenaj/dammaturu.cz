import { describe, expect, it } from "vitest";
import {
  createGuestLearnerId,
  isGuestLearnerId,
  isSafeLearnerId,
} from "@/server/guest/guest-id";
import {
  signGuestCookieValue,
  verifyGuestCookieValue,
} from "@/server/guest/guest-cookie";
import { defaultGuestOnboardingInput } from "@/server/guest/ensure-guest-learner";

describe("guest learner id", () => {
  it("mints g + 32 hex ids", () => {
    const id = createGuestLearnerId();
    expect(isGuestLearnerId(id)).toBe(true);
    expect(isSafeLearnerId(id)).toBe(true);
    expect(id).toHaveLength(33);
  });

  it("rejects auth-shaped ids as guests", () => {
    expect(isGuestLearnerId("a".repeat(32))).toBe(false);
  });
});

describe("guest cookie signing", () => {
  it("round-trips signed cookie values", async () => {
    const id = createGuestLearnerId();
    const raw = await signGuestCookieValue(id);
    expect(raw).toContain(".");
    expect(await verifyGuestCookieValue(raw)).toBe(id);
    expect(await verifyGuestCookieValue(`${id}.tampered`)).toBeNull();
  });
});

describe("default guest profile", () => {
  it("targets Czech matura prep defaults", () => {
    const profile = defaultGuestOnboardingInput();
    expect(profile.subjects).toEqual(["cjl"]);
    expect(profile.displayName).toBe("Host");
    expect(profile.dailyMinutes).toBeGreaterThanOrEqual(10);
  });
});
