import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KdoJsemPlayer } from "@/components/kdo-jsem/kdo-jsem-player";
import { Card, CardDescription } from "@/components/ui/card";
import { getKdoJsemSessionAction } from "@/server/actions/kdo-jsem";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { pack } = await getKdoJsemSessionAction(slug);
  return { title: pack ? pack.title : "Kdo jsem?" };
}

export default async function KdoJsemPage({ params }: Props) {
  const { slug } = await params;
  const { pack, progress, learnerId } = await getKdoJsemSessionAction(slug);
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
            Pro skóre{" "}
            <Link href="/onboarding" className="font-semibold text-action">
              dokonči onboarding
            </Link>
            .
          </CardDescription>
        </Card>
      ) : null}
      <KdoJsemPlayer
        pack={pack}
        initialProgress={progress}
        learnerId={learnerId}
      />
    </div>
  );
}
