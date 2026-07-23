import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StoryModePlayer } from "@/components/story-mode/story-mode-player";
import { AppLoadingState } from "@/components/shell/app-screen";
import { ContentUnavailableState } from "@/components/shell/study-recovery";
import { getStorySessionAction } from "@/server/actions/story-mode";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { pack } = await getStorySessionAction(slug);
    return { title: pack?.title ?? "Příběh" };
  } catch {
    return { title: "Příběh" };
  }
}

async function StoryModeBody({ slug }: { slug: string }) {
  const { pack, progress, unavailableReason } =
    await getStorySessionAction(slug);

  if (!pack) {
    return (
      <ContentUnavailableState
        title="Příběh"
        description={
          unavailableReason ??
          "Tento příběh zatím není k dispozici. Otevři materiály k tématu a zkus to znovu."
        }
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-1 pb-12 sm:px-0">
      <Link
        href="/app/learn"
        className="inline-flex text-body-sm font-semibold text-action underline-offset-2 hover:underline"
      >
        ← Zpět na Učit se
      </Link>
      <StoryModePlayer pack={pack} initialProgress={progress} />
    </div>
  );
}

export default async function StoryModePage({ params }: Props) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-2xl px-1 py-2 sm:px-0">
          <AppLoadingState label="Načítám příběh…" />
        </div>
      }
    >
      <StoryModeBody slug={slug} />
    </Suspense>
  );
}
