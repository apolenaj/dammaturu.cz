import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  StudyCatalogDetail,
  type CatalogMode,
} from "@/components/materials/study-catalog-detail";
import { getStudyCatalogDetailAction } from "@/server/actions/study-content";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ sourceId: string }>;
  searchParams: Promise<{ mode?: string; continue?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sourceId } = await params;
  const { entry } = await getStudyCatalogDetailAction(sourceId);
  return { title: entry ? entry.title : "Materiál" };
}

function parseMode(raw: string | undefined): CatalogMode {
  if (raw === "learn" || raw === "test" || raw === "source") return raw;
  return "overview";
}

export default async function CatalogMaterialPage({
  params,
  searchParams,
}: Props) {
  const { sourceId } = await params;
  const sp = await searchParams;
  const { entry, progress, learnSteps, quickTest } =
    await getStudyCatalogDetailAction(sourceId);
  if (!entry) notFound();

  return (
    <StudyCatalogDetail
      entry={entry}
      initialProgress={progress}
      learnSteps={learnSteps}
      quickTest={quickTest}
      initialMode={parseMode(sp.mode)}
      continueLearning={sp.continue === "1"}
    />
  );
}
