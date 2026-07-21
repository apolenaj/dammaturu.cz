/**
 * Pricing plans & feature catalog (D-061).
 * Entitlements live in code — UI only mirrors this source of truth.
 */

export const billingPlanIds = [
  "free",
  "smart",
  "ai_pro",
  "maturita_max",
] as const;

export type BillingPlanId = (typeof billingPlanIds)[number];

export const billingFeatures = [
  /** Always true — never lock previously uploaded personal files. */
  "personal_materials_read",
  "personal_materials_upload",
  "daily_mission",
  "flashcards",
  "spaced_review",
  "cermat_prep",
  "mock_exam",
  "oral_simulation",
  "zachran_me",
  "advanced_planner",
  "ai_explanations",
  "ai_voice_coach",
  "priority_support",
  "exam_intensive_pack",
] as const;

export type BillingFeature = (typeof billingFeatures)[number];

/**
 * Features that survive expired / failed payment.
 * Students keep access to their own data.
 */
export const durablePersonalDataFeatures = [
  "personal_materials_read",
] as const satisfies readonly BillingFeature[];

export type PlanPrice = {
  /** Display amount in Kč (whole crowns). */
  amountCzk: number;
  /** Stripe unit_amount in haléře (CZK * 100). */
  unitAmountHalere: number;
  currency: "czk";
  interval: "month" | "day" | "one_time";
  /** For interval=day packs (e.g. 90-day MAX). */
  intervalCount?: number;
  labelCs: string;
};

export type BillingPlanDef = {
  id: BillingPlanId;
  nameCs: string;
  taglineCs: string;
  /** Standard list price. */
  price: PlanPrice;
  /**
   * Optional launch / promo override (SMART 99 Kč).
   * Resolved at runtime via env; never invent fake live prices in UI without config.
   */
  launchPrice?: PlanPrice;
  features: readonly BillingFeature[];
  limits: {
    maxMaterials: number;
    maxUploadsPerDay: number;
    mockExamsPerMonth: number | "unlimited";
  };
  highlightCs?: string;
  ctaCs: string;
};

const monthly = (czk: number, labelCs: string): PlanPrice => ({
  amountCzk: czk,
  unitAmountHalere: czk * 100,
  currency: "czk",
  interval: "month",
  labelCs,
});

const days = (
  czk: number,
  count: number,
  labelCs: string,
): PlanPrice => ({
  amountCzk: czk,
  unitAmountHalere: czk * 100,
  currency: "czk",
  interval: "day",
  intervalCount: count,
  labelCs,
});

export const BILLING_PLANS: Record<BillingPlanId, BillingPlanDef> = {
  free: {
    id: "free",
    nameCs: "FREE",
    taglineCs: "Začni zdarma — denní mise a základní opakování.",
    price: monthly(0, "0 Kč"),
    features: [
      "personal_materials_read",
      "personal_materials_upload",
      "daily_mission",
      "flashcards",
      "spaced_review",
    ],
    limits: {
      maxMaterials: 3,
      maxUploadsPerDay: 3,
      mockExamsPerMonth: 0,
    },
    ctaCs: "Začít zdarma",
  },
  smart: {
    id: "smart",
    nameCs: "SMART",
    taglineCs: "Plná příprava: CERMAT, ústní, plánovač.",
    price: monthly(149, "149 Kč / měsíc"),
    launchPrice: monthly(99, "99 Kč / měsíc (launch)"),
    features: [
      "personal_materials_read",
      "personal_materials_upload",
      "daily_mission",
      "flashcards",
      "spaced_review",
      "cermat_prep",
      "mock_exam",
      "oral_simulation",
      "zachran_me",
      "advanced_planner",
    ],
    limits: {
      maxMaterials: 40,
      maxUploadsPerDay: 20,
      mockExamsPerMonth: "unlimited",
    },
    highlightCs: "Nejčastější volba",
    ctaCs: "Vybrat SMART",
  },
  ai_pro: {
    id: "ai_pro",
    nameCs: "AI PRO",
    taglineCs: "SMART + AI vysvětlení a hlasový kouč.",
    price: monthly(249, "249 Kč / měsíc"),
    features: [
      "personal_materials_read",
      "personal_materials_upload",
      "daily_mission",
      "flashcards",
      "spaced_review",
      "cermat_prep",
      "mock_exam",
      "oral_simulation",
      "zachran_me",
      "advanced_planner",
      "ai_explanations",
      "ai_voice_coach",
    ],
    limits: {
      maxMaterials: 100,
      maxUploadsPerDay: 40,
      mockExamsPerMonth: "unlimited",
    },
    ctaCs: "Vybrat AI PRO",
  },
  maturita_max: {
    id: "maturita_max",
    nameCs: "MATURITA MAX",
    taglineCs: "90 dní intenzivní přípravy k termínu.",
    price: days(499, 90, "499 Kč / 90 dní"),
    features: [
      "personal_materials_read",
      "personal_materials_upload",
      "daily_mission",
      "flashcards",
      "spaced_review",
      "cermat_prep",
      "mock_exam",
      "oral_simulation",
      "zachran_me",
      "advanced_planner",
      "ai_explanations",
      "ai_voice_coach",
      "priority_support",
      "exam_intensive_pack",
    ],
    limits: {
      maxMaterials: 200,
      maxUploadsPerDay: 80,
      mockExamsPerMonth: "unlimited",
    },
    highlightCs: "Do maturity",
    ctaCs: "Vybrat MATURITA MAX",
  },
};

export const billingPlanOrder: BillingPlanId[] = [
  "free",
  "smart",
  "ai_pro",
  "maturita_max",
];

export function planDef(id: BillingPlanId): BillingPlanDef {
  return BILLING_PLANS[id];
}

/** Plan rank for upgrade/downgrade comparisons (higher = more). */
export const planRank: Record<BillingPlanId, number> = {
  free: 0,
  smart: 1,
  ai_pro: 2,
  maturita_max: 3,
};

export function comparePlans(a: BillingPlanId, b: BillingPlanId): number {
  return planRank[a] - planRank[b];
}
