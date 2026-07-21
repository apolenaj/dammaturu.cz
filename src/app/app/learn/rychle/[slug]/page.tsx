import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuickGraspPlayer } from "@/components/quick-grasp/quick-grasp-player";
import { Card, CardDescription } from "@/components/ui/card";
import { getQuickGraspSessionAction } from "@/server/actions/quick-grasp";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { pack } = await getQuickGraspSessionAction(slug);
  return { title: pack ? pack.title : "Rychle pochopit" };
}

export default async function QuickGraspPage({ params }: Props) {
  const { slug } = await params;
  const { pack, progress, learnerId } = await getQuickGraspSessionAction(slug);
  if (!pack) notFound();

  return (
    <div className="space-y-4 pb-10">
      <Link
        href="/app/learn"
        className="mx-auto block w-full max-w-lg text-body-sm font-semibold text-action hover:underline"
      >
        ← Učit se
      </Link>
      {!learnerId ? (
        <Card className="mx-auto max-w-lg">
          <CardDescription>
            Pro uložení completion a úspěšnosti{" "}
            <Link href="/onboarding" className="font-semibold text-action">
              dokonči onboarding
            </Link>
            .
          </CardDescription>
        </Card>
      ) : null}
      <QuickGraspPlayer pack={pack} initialProgress={progress} />
    </div>
  );
}
