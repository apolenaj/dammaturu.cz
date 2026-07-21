import type { Metadata } from "next";
import { ContentStudioView } from "@/components/admin/content-studio-view";
import { getContentStudioCatalogAction } from "@/server/actions/content-studio";

export const metadata: Metadata = { title: "Admin · Content Studio" };
export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const { items, countsByKind, generatedAt } =
    await getContentStudioCatalogAction();

  return (
    <div className="px-3 pb-10 sm:px-0">
      <ContentStudioView
        initialItems={items}
        countsByKind={countsByKind}
        generatedAt={generatedAt}
      />
    </div>
  );
}
