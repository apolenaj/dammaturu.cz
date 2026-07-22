import type { Metadata } from "next";
import { MaterialsHub } from "@/components/materials/materials-hub";
import { StudyCatalogBrowser } from "@/components/materials/study-catalog-browser";
import { AppPageHeader } from "@/components/shell/app-screen";
import { listMyMaterialsAction } from "@/server/actions/learner-materials";
import { listStudyCatalogAction } from "@/server/actions/study-content";

export const metadata: Metadata = { title: "Moje materiály" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string; topic?: string }>;
};

export default async function MaterialsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const [{ learnerId, materials }, catalog] = await Promise.all([
    listMyMaterialsAction(),
    listStudyCatalogAction({
      query: sp.q ?? null,
      topic: sp.topic ?? null,
    }),
  ]);

  return (
    <div className="space-y-10 px-3 pb-10 sm:px-0">
      <AppPageHeader
        title="Moje materiály"
        purpose="Tvoje a školní podklady + katalog ČJL v aplikaci. Nejsou oficiálním didaktickým testem CERMAT."
        primaryAction={{
          label: "CERMAT příprava",
          href: "/app/cermat",
        }}
        secondaryAction={{
          label: "Profil maturity",
          href: "/app/exam-profile",
        }}
      />

      <div className="rounded-xl border border-border bg-subtle/40 px-4 py-3 text-body-sm text-fg-secondary">
        <p>
          <span className="font-semibold text-fg">Moje materiály</span> = režim
          A (katalog ČJL + nahrané soubory). Společný didaktický test je zvlášť
          v{" "}
          <a href="/app/cermat" className="font-semibold text-action hover:underline">
            CERMAT příprava
          </a>
          .
        </p>
      </div>

      <StudyCatalogBrowser
        subject={catalog.subject}
        topics={catalog.topics}
        materials={catalog.materials}
        progressBySourceId={catalog.progressBySourceId}
      />

      <section className="space-y-4 border-t border-border pt-8">
        <div>
          <p className="text-overline text-action">Vlastní</p>
          <h2 className="font-display text-title-md text-fg">
            Nahrané materiály
          </h2>
          <p className="mt-1 text-body-sm text-fg-secondary">
            PDF, DOCX nebo TXT — zpracování jen z tvého souboru, s citací úryvku.
            Nejsou to oficiální CERMAT zadání ani kompletní národní kurikulum.
          </p>
        </div>
        {learnerId ? (
          <MaterialsHub initialMaterials={materials} learnerId={learnerId} />
        ) : (
          <p className="rounded-lg border border-border bg-surface px-4 py-6 text-body-sm text-fg-secondary">
            Session se připravuje — obnov stránku, nebo začni z katalogu ČJL
            výše.
          </p>
        )}
      </section>
    </div>
  );
}
