import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LiteraryWorkViewer } from "@/components/literary-work/literary-work-viewer";
import { getLiteraryWorkAction } from "@/server/actions/literary-work";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { work } = await getLiteraryWorkAction(slug);
  return { title: work ? work.title : "Literární dílo" };
}

export default async function LiteraryWorkPage({ params }: Props) {
  const { slug } = await params;
  const { work } = await getLiteraryWorkAction(slug);
  if (!work) notFound();

  return (
    <div className="space-y-4 px-3 pb-10 sm:px-0">
      <Link
        href="/app/learn/dilo"
        className="mx-auto block w-full max-w-2xl text-body-sm font-semibold text-action hover:underline"
      >
        ← Literární díla
      </Link>
      <LiteraryWorkViewer work={work} />
    </div>
  );
}
