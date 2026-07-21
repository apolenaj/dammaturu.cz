import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpeedRoundPlayer } from "@/components/speed-round/speed-round-player";
import { Card, CardDescription } from "@/components/ui/card";
import { getSpeedRoundSessionAction } from "@/server/actions/speed-round";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { pack } = await getSpeedRoundSessionAction(slug);
  return { title: pack ? pack.title : "Speed Round" };
}

export default async function SpeedRoundPage({ params }: Props) {
  const { slug } = await params;
  const { pack, best, learnerId } = await getSpeedRoundSessionAction(slug);
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
      <SpeedRoundPlayer
        pack={pack}
        initialBest={best}
        learnerId={learnerId}
      />
    </div>
  );
}
