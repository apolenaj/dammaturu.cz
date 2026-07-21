import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TimelineExplorer } from "@/components/timeline/timeline-explorer";
import { Card, CardDescription } from "@/components/ui/card";
import { getTimelineSessionAction } from "@/server/actions/timeline";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { pack } = await getTimelineSessionAction(slug);
  return { title: pack ? pack.title : "Časová osa" };
}

export default async function TimelinePage({ params }: Props) {
  const { slug } = await params;
  const { pack, progress, learnerId } = await getTimelineSessionAction(slug);
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
            Pro ukládání quiz/řazení{" "}
            <Link href="/onboarding" className="font-semibold text-action">
              dokonči onboarding
            </Link>
            .
          </CardDescription>
        </Card>
      ) : null}
      <TimelineExplorer
        pack={pack}
        initialProgress={progress}
        learnerId={learnerId}
      />
    </div>
  );
}
