import {
  BILLING_PLANS,
  durablePersonalDataFeatures,
  type BillingFeature,
  type BillingPlanId,
} from "@/domain/billing/plans";
import type { BillingSubscription } from "@/domain/billing/subscription";
import {
  isSubscriptionEntitled,
  resolvePlanFromSubscription,
} from "@/domain/billing/subscription";

/**
 * Code-level entitlements (D-061).
 * Never rely on UI alone for access control.
 */

export function planHasFeature(
  planId: BillingPlanId,
  feature: BillingFeature,
): boolean {
  return BILLING_PLANS[planId].features.includes(feature);
}

export function entitlementsForPlan(
  planId: BillingPlanId,
): ReadonlySet<BillingFeature> {
  return new Set(BILLING_PLANS[planId].features);
}

/**
 * Effective entitlements for a subscription snapshot.
 * Expired / unpaid → FREE features + durable personal data read.
 */
export function resolveEntitlements(input: {
  subscription: BillingSubscription | null;
}): {
  planId: BillingPlanId;
  entitled: boolean;
  features: ReadonlySet<BillingFeature>;
  limits: (typeof BILLING_PLANS)[BillingPlanId]["limits"];
} {
  const planId = resolvePlanFromSubscription(input.subscription);
  const entitled = isSubscriptionEntitled(input.subscription);
  const base = entitlementsForPlan(planId);
  if (entitled) {
    return {
      planId,
      entitled: true,
      features: base,
      limits: BILLING_PLANS[planId].limits,
    };
  }
  // Soft-fail: FREE + always keep personal data readable
  const features = new Set(entitlementsForPlan("free"));
  for (const f of durablePersonalDataFeatures) features.add(f);
  return {
    planId: "free",
    entitled: false,
    features,
    limits: BILLING_PLANS.free.limits,
  };
}

export function hasFeature(
  features: ReadonlySet<BillingFeature>,
  feature: BillingFeature,
): boolean {
  return features.has(feature);
}

/**
 * Upload gate: may create new materials.
 * Read of existing materials is never blocked by this check.
 */
export function canUploadMaterial(input: {
  features: ReadonlySet<BillingFeature>;
  currentMaterialCount: number;
  uploadsToday: number;
  limits: (typeof BILLING_PLANS)[BillingPlanId]["limits"];
}): { ok: true } | { ok: false; reasonCs: string; code: string } {
  if (!input.features.has("personal_materials_upload")) {
    return {
      ok: false,
      code: "upload_not_entitled",
      reasonCs:
        "Nahrávání nových souborů patří do vyššího plánu. Tvoje už nahrané materiály zůstávají dostupné.",
    };
  }
  if (input.currentMaterialCount >= input.limits.maxMaterials) {
    return {
      ok: false,
      code: "material_limit",
      reasonCs: `Limit materiálu je ${input.limits.maxMaterials}. Smaž starší, nebo upgraduj plán. Existující soubory můžeš dál číst.`,
    };
  }
  if (input.uploadsToday >= input.limits.maxUploadsPerDay) {
    return {
      ok: false,
      code: "daily_upload_limit",
      reasonCs: `Dnes už máš ${input.limits.maxUploadsPerDay} nahrání. Zítra znovu, nebo upgraduj plán.`,
    };
  }
  return { ok: true };
}

export type EntitlementDecision =
  | { ok: true; planId: BillingPlanId }
  | {
      ok: false;
      planId: BillingPlanId;
      feature: BillingFeature;
      reasonCs: string;
      upgradeHintCs: string;
    };

export function requireFeature(
  features: ReadonlySet<BillingFeature>,
  planId: BillingPlanId,
  feature: BillingFeature,
): EntitlementDecision {
  if (features.has(feature)) return { ok: true, planId };
  return {
    ok: false,
    planId,
    feature,
    reasonCs: featureBlockedReasonCs(feature),
    upgradeHintCs: "Podívej se na Ceník a vyber plán, který to odemyká.",
  };
}

export function featureBlockedReasonCs(feature: BillingFeature): string {
  switch (feature) {
    case "cermat_prep":
      return "CERMAT trénink je od plánu SMART.";
    case "mock_exam":
    case "oral_simulation":
      return "Zkouška nanečisto je od plánu SMART.";
    case "zachran_me":
    case "advanced_planner":
      return "Pokročilý plánovač je od plánu SMART.";
    case "ai_explanations":
    case "ai_voice_coach":
      return "AI funkce patří do AI PRO (nebo MATURITA MAX).";
    case "exam_intensive_pack":
    case "priority_support":
      return "Tahle výhoda je v MATURITA MAX.";
    case "personal_materials_upload":
      return "Nahrávání je omezené — tvoje existující soubory zůstávají.";
    default:
      return "Tahle funkce není v tvém aktuálním plánu.";
  }
}
