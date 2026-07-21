import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchArenaPlayer } from "@/components/match-arena/match-arena-player";
import { Card, CardDescription } from "@/components/ui/card";
import { getMatchArenaSessionAction } from "@/server/actions/match-arena";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { pack } = await getMatchArenaSessionAction(slug);
  return { title: pack ? pack.title : "Match Arena" };
}

export default async function MatchArenaPage({ params }: Props) {
  const { slug } = await params;
  const { pack, reviewQueue, learnerId } =
    await getMatchArenaSessionAction(slug);
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
            Pro skóre a review queue{" "}
            <Link href="/onboarding" className="font-semibold text-action">
              dokonči onboarding
            </Link>
            .
          </CardDescription>
        </Card>
      ) : null}
      <MatchArenaPlayer
        pack={pack}
        initialReviewQueue={reviewQueue}
        learnerId={learnerId}
      />
    </div>
  );
}
