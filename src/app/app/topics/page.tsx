import type { Metadata } from "next";
import Link from "next/link";
import { CurriculumOutline } from "@/components/curriculum/curriculum-outline";
import { Alert } from "@/components/ui/alert";
import { Card, CardDescription } from "@/components/ui/card";
import { getActiveCurriculum } from "@/server/curriculum/repository";

export const metadata: Metadata = { title: "Témata" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ focus?: string }>;
};

export default async function TopicsPage({ searchParams }: PageProps) {
  const { focus } = await searchParams;
  const pack = await getActiveCurriculum();

  if (!pack) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <h1 className="font-display text-display-md text-fg">Témata</h1>
        <Card>
          <CardDescription>
            Curriculum ještě není nasazený. Spusť{" "}
            <code className="text-body-sm">npm run seed:curriculum</code>.
          </CardDescription>
        </Card>
        <Link
          href="/app/dashboard"
          className="text-body-sm font-semibold text-action hover:underline"
        >
          Zpět na Dnes
        </Link>
      </div>
    );
  }

  const focusSlug = focus?.trim().slice(0, 120) || null;
  const focusedTopic = focusSlug
    ? pack.modules
        .flatMap((m) => m.topics.map((t) => ({ ...t, moduleTitle: m.title })))
        .find((t) => t.slug === focusSlug || t.id === focusSlug)
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      {focusSlug ? (
        <Alert
          tone={focusedTopic ? "info" : "warning"}
          title={
            focusedTopic
              ? `Fokus: ${focusedTopic.title}`
              : `Fokus „${focusSlug}“ nenalezen`
          }
        >
          {focusedTopic ? (
            <>
              Modul {focusedTopic.moduleTitle}. Pokračuj v osnově níže — téma je
              zvýrazněné.
            </>
          ) : (
            "Slug v odkazu neodpovídá žádnému tématu v aktuálním kurikulu."
          )}
        </Alert>
      ) : null}
      <CurriculumOutline
        pack={pack}
        variant="student"
        highlightSlug={focusSlug}
      />
    </div>
  );
}
