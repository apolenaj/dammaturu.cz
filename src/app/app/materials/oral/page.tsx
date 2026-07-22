import type { Metadata } from "next";
import { EntitlementGate } from "@/components/billing/entitlement-gate";
import { MaterialsOralTraining } from "@/components/materials/materials-oral-training";
import { getMaterialsOralSelectAction } from "@/server/actions/materials-oral-training";
import {
  MATERIALS_ORAL_DISCLAIMER_CS,
  buildMaterialsOralSelectView,
} from "@/domain/learning/materials-oral-training";

export const metadata: Metadata = { title: "Ústní trénink z materiálů" };
export const dynamic = "force-dynamic";

export default async function MaterialsOralPage() {
  const { view } = await getMaterialsOralSelectAction();
  const safeView =
    view ??
    buildMaterialsOralSelectView({
      materials: [],
      topics: [],
      hasWeakSpots: false,
    });

  return (
    <div className="px-3 pb-10 sm:px-0">
      <EntitlementGate feature="personal_materials_read">
        <MaterialsOralTraining initialView={safeView} />
      </EntitlementGate>
      {!view ? (
        <p className="mx-auto mt-4 max-w-xl text-caption text-fg-muted">
          {MATERIALS_ORAL_DISCLAIMER_CS}
        </p>
      ) : null}
    </div>
  );
}
