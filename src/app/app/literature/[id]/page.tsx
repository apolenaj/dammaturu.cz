import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LiteratureBookDetail } from "@/components/literature/literature-book-detail";
import { getLiteratureBookAction } from "@/server/actions/literature-maturity";

export const metadata: Metadata = { title: "Karta díla" };
export const dynamic = "force-dynamic";

export default async function LiteratureBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { book, learnerId } = await getLiteratureBookAction({ bookId: id });
  if (!learnerId) redirect("/onboarding");
  if (!book) redirect("/app/literature");

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-3 pb-10 sm:px-0">
      <LiteratureBookDetail initialBook={book} />
    </div>
  );
}
