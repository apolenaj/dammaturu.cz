import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryReconstructionPlayer } from "@/components/story-reconstruction/story-reconstruction-player";
import { Card, CardDescription } from "@/components/ui/card";
import { getStoryReconstructionSessionAction } from "@/server/actions/story-reconstruction";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { pack } = await getStoryReconstructionSessionAction(slug);
  return { title: pack ? pack.title : "Story Reconstruction" };
}

export default async function StoryReconstructionPage({ params }: Props) {
  const { slug } = await params;
  const { pack, progress, learnerId } =
    await getStoryReconstructionSessionAction(slug);
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
            Pro uložení progressu{" "}
            <Link href="/onboarding" className="font-semibold text-action">
              dokonči onboarding
            </Link>
            .
          </CardDescription>
        </Card>
      ) : null}
      <StoryReconstructionPlayer
        pack={pack}
        initialProgress={progress}
        learnerId={learnerId}
      />
    </div>
  );
}
