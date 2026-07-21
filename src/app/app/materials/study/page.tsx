import type { Metadata } from "next";
import Link from "next/link";
import { MaterialStudyPicker } from "@/components/materials/material-study-picker";
import { Card, CardDescription } from "@/components/ui/card";
import { listReadyMaterialsForSessionAction } from "@/server/actions/materials-study-session";

export const metadata: Metadata = { title: "Učit se z mých materiálů" };
export const dynamic = "force-dynamic";

export default async function MaterialsStudyPickerPage({
  searchParams,
}: {
  searchParams?: Promise<{ material?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const { learnerId, materials } = await listReadyMaterialsForSessionAction();

  if (!learnerId) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-3 pb-10">
        <Link
          href="/app/learn"
          className="text-body-sm font-semibold text-action hover:underline"
        >
          ← Učit se
        </Link>
        <Card>
          <CardDescription>
            Pro studium z materiálů se{" "}
            <Link href="/prihlaseni" className="font-semibold text-action">
              přihlas
            </Link>
            .
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-3 pb-10 sm:px-0">
      <div>
        <Link
          href="/app/materials"
          className="text-body-sm font-semibold text-action hover:underline"
        >
          ← Moje materiály
        </Link>
        <h1 className="mt-3 font-display text-display-sm text-fg">
          Učit se z mých materiálů
        </h1>
        <p className="mt-2 text-body-md text-fg-secondary">
          Vyber materiály a režim: téma, nebo chytrý mix (vybavování, krátká
          odpověď, karty, vysvětlení, retrieval). Hodnocení a opakování jdou jen
          z nahraného textu.
        </p>
      </div>
      <MaterialStudyPicker
        materials={materials}
        initialSelectedId={sp.material}
      />
    </div>
  );
}
