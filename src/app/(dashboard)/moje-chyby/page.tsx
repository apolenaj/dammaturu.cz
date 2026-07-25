import type { Metadata } from "next";
import { DashboardPlaceholder } from "@/components/dashboard/dashboard-placeholder";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildPublicMetadata({
    title: "Moje chyby",
    description: "Opakování chyb a slabých míst před maturitou.",
    path: "/moje-chyby",
  }),
  robots: { index: false, follow: false },
};

export default function MojeChybyPage() {
  return (
    <DashboardPlaceholder
      title="Moje chyby"
      description="Sem se budou ukládat otázky, které ti nejdou — ať je můžeš cíleně procvičit."
    />
  );
}
