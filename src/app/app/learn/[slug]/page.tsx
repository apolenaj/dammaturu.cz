import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/lesson-player";
import { Card, CardDescription } from "@/components/ui/card";
import { getLessonAction } from "@/server/actions/lesson-engine";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lesson } = await getLessonAction(slug);
  return { title: lesson ? lesson.title : "Lekce" };
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const { lesson, progress, learnerId } = await getLessonAction(slug);
  if (!lesson) notFound();

  return (
    <div className="space-y-4 pb-10">
      <Link
        href="/app/learn"
        className="mx-auto block w-full max-w-2xl text-body-sm font-semibold text-action hover:underline"
      >
        ← Všechny lekce
      </Link>
      {!learnerId ? (
        <Card className="mx-auto max-w-2xl">
          <CardDescription>
            Bez onboardingu se interakce neuloží.{" "}
            <Link href="/onboarding" className="font-semibold text-action">
              Onboarding
            </Link>
          </CardDescription>
        </Card>
      ) : null}
      <LessonPlayer lesson={lesson} initialProgress={progress} />
    </div>
  );
}
