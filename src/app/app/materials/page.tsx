import type { Metadata } from "next";
import { MaterialsHub } from "@/components/materials/materials-hub";
import { AppPageHeader } from "@/components/shell/app-screen";
import { EmptyState } from "@/components/ui/empty-state";
import { listMyMaterialsAction } from "@/server/actions/learner-materials";

export const metadata: Metadata = { title: "Moje materiály" };
export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const { learnerId, materials } = await listMyMaterialsAction();

  if (!learnerId) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-3 pb-10">
        <AppPageHeader
          title="Moje materiály"
          purpose="Tvoje poznámky a PDF ke studiu — ne školní maturitní dokumenty."
        />
        <EmptyState
          title="Přihlas se"
          description="Materiály jsou vázané na účet. Po přihlášení můžeš nahrávat a studovat."
          actionLabel="Přihlásit se"
          actionHref="/prihlaseni"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-3 pb-10 sm:px-0">
      <AppPageHeader
        title="Moje materiály"
        purpose="Nahrávej, zpracuj a uč se z vlastních podkladů. Školní seznam a kritéria patří do Profilu maturity."
        primaryAction={
          materials.length === 0
            ? undefined
            : {
                label: "Učit se z materiálů",
                href: "/app/materials/study",
              }
        }
        secondaryAction={{
          label: "Profil maturity",
          href: "/app/exam-profile",
        }}
      />
      <MaterialsHub initialMaterials={materials} learnerId={learnerId} />
    </div>
  );
}
