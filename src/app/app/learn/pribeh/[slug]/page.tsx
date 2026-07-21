import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryModePlayer } from "@/components/story-mode/story-mode-player";
import { Card, CardDescription } from "@/components/ui/card";
import { getStorySessionAction } from "@/server/actions/story-mode";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { pack } = await getStorySessionAction(slug);
  return { title: pack ? pack.title : "Story Mode" };
}

export default async function StoryModePage({ params }: Props) {
  const { slug } = await params;
  const { pack, progress, learnerId } = await getStorySessionAction(slug);
  if (!pack) notFound();

  return (
    <div className="space-y-4 pb-10">
      <Link
        href="/app/learn"
        className="mx-auto block w-full max-w-xl text-body-sm font-semibold text-action hover:underline"
      >
        ← Učit se
      </Link>
      {!learnerId ? (
        <Card className="mx-auto max-w-xl">
          <CardDescription>
            Pro uložení progressu{" "}
            <Link href="/onboarding" className="font-semibold text-action">
              dokonči onboarding
            </Link>
            .
          </CardDescription>
        </Card>
      ) : null}
      <StoryModePlayer pack={pack} initialProgress={progress} />
    </div>
  );
}
