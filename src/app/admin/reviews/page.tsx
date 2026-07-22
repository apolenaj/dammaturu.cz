import type { Metadata } from "next";
import Link from "next/link";
import { ContentQaPanel } from "@/components/admin/content-qa-panel";
import { getQaLastRun, listQaItems } from "@/server/content-qa/store";

export const metadata: Metadata = { title: "Admin · Content QA" };
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const [items, lastRun] = await Promise.all([listQaItems(), getQaLastRun()]);

  return (
    <div className="space-y-4">
      <p className="mx-auto w-full max-w-4xl text-body-sm text-fg-secondary">
        Po ingestu spusť QA scan.{" "}
        <Link href="/admin/sources" className="font-semibold text-action hover:underline">
          Zdroje / import
        </Link>
        {" · "}
        <Link
          href="/admin/content-trust"
          className="font-semibold text-action hover:underline"
        >
          Content Trust report
        </Link>
      </p>
      <ContentQaPanel items={items} lastRun={lastRun} />
    </div>
  );
}
