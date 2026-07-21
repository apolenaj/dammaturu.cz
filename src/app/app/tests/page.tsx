import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentLearnerAction } from "@/server/actions/onboarding";
import { listQuestionPacks } from "@/server/question-engine/store";
import { getLearner } from "@/server/learner-store";
import { getLearnerIdFromCookies } from "@/server/learner-session";

export const metadata: Metadata = { title: "Testy" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ intent?: string }>;
};

export default async function TestsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const diagnostic = params.intent === "diagnostic";
  const [learner, packs, learnerId] = await Promise.all([
    getCurrentLearnerAction(),
    listQuestionPacks(),
    getLearnerIdFromCookies(),
  ]);
  const record = learnerId ? await getLearner(learnerId) : null;
  const baselineDone = Boolean(record?.diagnosticBaseline);
  const primaryPack = packs[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-1">
      <div>
        <h1 className="font-display text-display-md text-fg">Testy</h1>
        <p className="mt-2 text-body-md text-fg-secondary">
          Question Engine — po každé odpovědi vysvětlení, ne jen
          zelená/červená. Chyby se ukládají do Moje chyby.
        </p>
      </div>

      {diagnostic ? (
        <Alert
          tone={baselineDone ? "success" : "info"}
          title={
            baselineDone
              ? "Diagnostika hotová"
              : "Vstupní diagnostika (Beta 1.0)"
          }
        >
          {baselineDone ? (
            <>
              Baseline accuracy{" "}
              {record!.diagnosticBaseline!.accuracyPct} %.{" "}
              <Link href="/app/plan" className="font-semibold underline">
                Otevři plán
              </Link>{" "}
              nebo{" "}
              <Link href="/app/dashboard" className="font-semibold underline">
                dnešní misi
              </Link>
              .
            </>
          ) : learner ? (
            <>
              {learner.profile.displayName}, spusť diagnostiku níže (min. 8
              otázek). Výsledky nastaví baseline a pomohou upravit plán do 31.
              srpna.
              {primaryPack ? (
                <div className="mt-3">
                  <Link
                    href={`/app/tests/otazky/${primaryPack.slug}?diagnostic=1`}
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-action px-5 text-body-sm font-semibold uppercase tracking-wide text-fg-on-brand"
                  >
                    Spustit diagnostiku
                  </Link>
                </div>
              ) : (
                <p className="mt-2 text-body-sm">
                  Question pack chybí — kontaktuj admina (obsah není nasazený).
                </p>
              )}
            </>
          ) : (
            <>
              Nejdřív dokonči{" "}
              <Link href="/onboarding" className="font-semibold underline">
                onboarding
              </Link>
              .
            </>
          )}
        </Alert>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Question packs
        </h2>
        {packs.length === 0 ? (
          <Card>
            <CardDescription>
              Obsah testů není nasazený. Napiš adminovi — nespouštěj seed příkazy
              sama.
            </CardDescription>
          </Card>
        ) : (
          packs.map((pack) => {
            const kinds = new Set(pack.questions.map((q) => q.kind));
            return (
              <Card key={pack.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle>
                        <Link
                          href={
                            diagnostic
                              ? `/app/tests/otazky/${pack.slug}?diagnostic=1`
                              : `/app/tests/otazky/${pack.slug}`
                          }
                          className="hover:text-action"
                        >
                          {pack.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {pack.summary}
                      </CardDescription>
                      <p className="mt-2 text-caption text-fg-muted">
                        {pack.questions.length} otázek · {kinds.size} typů
                      </p>
                    </div>
                    <Badge tone="brand">
                      {diagnostic ? "Diagnostika" : "Engine"}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
