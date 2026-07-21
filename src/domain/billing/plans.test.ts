import { describe, expect, it } from "vitest";
import {
  canUploadMaterial,
  hasFeature,
  resolveEntitlements,
  requireFeature,
} from "@/domain/billing/entitlements";
import { BILLING_PLANS, durablePersonalDataFeatures } from "@/domain/billing/plans";
import { resolvePlanPrice } from "@/domain/billing/pricing";
import {
  classifyPlanChange,
  emptySubscription,
  resolvePlanFromSubscription,
} from "@/domain/billing/subscription";

describe("billing entitlements (D-061)", () => {
  it("defines four plans with FREE at 0 Kč", () => {
    expect(BILLING_PLANS.free.price.amountCzk).toBe(0);
    expect(BILLING_PLANS.smart.price.amountCzk).toBe(149);
    expect(BILLING_PLANS.smart.launchPrice?.amountCzk).toBe(99);
    expect(BILLING_PLANS.ai_pro.price.amountCzk).toBe(249);
    expect(BILLING_PLANS.maturita_max.price.amountCzk).toBe(499);
    expect(BILLING_PLANS.maturita_max.price.intervalCount).toBe(90);
  });

  it("never removes personal_materials_read from durable set", () => {
    expect(durablePersonalDataFeatures).toContain("personal_materials_read");
  });

  it("keeps materials readable when paid subscription expires", () => {
    const now = "2026-07-21T12:00:00.000Z";
    const sub = {
      ...emptySubscription("learner-1", now),
      planId: "smart" as const,
      status: "expired" as const,
    };
    const ent = resolveEntitlements({ subscription: sub });
    expect(ent.planId).toBe("free");
    expect(hasFeature(ent.features, "personal_materials_read")).toBe(true);
    expect(hasFeature(ent.features, "cermat_prep")).toBe(false);
  });

  it("grants SMART features while active or past_due grace", () => {
    const now = "2026-07-21T12:00:00.000Z";
    for (const status of ["active", "past_due", "trialing"] as const) {
      const sub = {
        ...emptySubscription("learner-1", now),
        planId: "smart" as const,
        status,
      };
      const ent = resolveEntitlements({ subscription: sub });
      expect(ent.planId).toBe("smart");
      expect(hasFeature(ent.features, "cermat_prep")).toBe(true);
      expect(hasFeature(ent.features, "ai_explanations")).toBe(false);
    }
  });

  it("blocks new uploads over FREE limit but explains data stays", () => {
    const ent = resolveEntitlements({ subscription: null });
    const blocked = canUploadMaterial({
      features: ent.features,
      currentMaterialCount: 3,
      uploadsToday: 0,
      limits: ent.limits,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.reasonCs).toMatch(/Existující soubory|dostupné|číst/i);
    }
  });

  it("classifies upgrade / downgrade / cancel", () => {
    expect(classifyPlanChange("free", "smart")).toBe("upgrade");
    expect(classifyPlanChange("ai_pro", "smart")).toBe("downgrade");
    expect(classifyPlanChange("smart", "free")).toBe("cancel");
  });

  it("resolves SMART launch price by default", () => {
    const resolved = resolvePlanPrice("smart");
    expect(resolved.isLaunchPrice).toBe(true);
    expect(resolved.price.amountCzk).toBe(99);
  });

  it("requireFeature points to ceník for AI", () => {
    const ent = resolveEntitlements({ subscription: null });
    const decision = requireFeature(ent.features, ent.planId, "ai_explanations");
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.reasonCs).toMatch(/AI PRO/i);
  });

  it("manual grant overrides plan while valid", () => {
    const now = "2026-07-21T12:00:00.000Z";
    const sub = {
      ...emptySubscription("learner-1", now),
      planId: "free" as const,
      status: "none" as const,
      manualGrant: {
        planId: "ai_pro" as const,
        reasonCs: "beta",
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
    };
    expect(resolvePlanFromSubscription(sub)).toBe("ai_pro");
    const ent = resolveEntitlements({ subscription: sub });
    expect(hasFeature(ent.features, "ai_voice_coach")).toBe(true);
  });
});
