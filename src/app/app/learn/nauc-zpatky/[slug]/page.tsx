import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TeachItBackPlayer } from "@/components/teach-it-back/teach-it-back-player";
import { Card, CardDescription } from "@/components/ui/card";
import { getTeachSessionAction } from "@/server/actions/teach-it-back";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { pack } = await getTeachSessionAction(slug);
  return { title: pack ? pack.title : "Teach It Back" };
}

export default async function TeachItBackPage({ params }: Props) {
  const { slug } = await params;
  const { pack, progress, learnerId } = await getTeachSessionAction(slug);
  if (!pack) notFound();

  return (
    <div className="space-y-4 px-3 pb-10 sm:px-0">
      <Link
        href="/app/learn"
        className="mx-auto block w-full max-w-3xl text-body-sm font-semibold text-action hover:underline"
      >
        ← Učit se
      </Link>
      {!learnerId ? (
        <Card className="mx-auto max-w-3xl">
          <CardDescription>
            Pro ukládání Teach It Back výsledků{" "}
            <Link href="/onboarding" className="font-semibold text-action">
              dokonči onboarding
            </Link>
            .
          </CardDescription>
        </Card>
      ) : null}
      <TeachItBackPlayer
        pack={pack}
        initialProgress={progress}
        learnerId={learnerId}
      />
    </div>
  );
}
