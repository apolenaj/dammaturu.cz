import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionEnginePlayer } from "@/components/questions/question-engine-player";
import { Alert } from "@/components/ui/alert";
import { Card, CardDescription } from "@/components/ui/card";
import { getQuestionSessionAction } from "@/server/actions/question-engine";
import { getExperimentAssessmentAction } from "@/server/actions/beta-experiment";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ diagnostic?: string; experiment?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { pack } = await getQuestionSessionAction(slug);
  return { title: pack ? pack.title : "Otázky" };
}

export default async function QuestionPackPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const { diagnostic, experiment } = await searchParams;
  const asDiagnostic = diagnostic === "1" || diagnostic === "true";
  const { pack, progress, learnerId } = await getQuestionSessionAction(slug);
  if (!pack) notFound();

  const experimentId = experiment?.trim() || null;
  const { assessment } = experimentId
    ? await getExperimentAssessmentAction(experimentId)
    : { assessment: null };

  if (experimentId && (!assessment || assessment.packSlug !== slug)) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-3">
        <Alert title="Assessment nenalezen" tone="warning">
          Weekly/final assessment neexistuje nebo patří k jinému packu.{" "}
          <Link href="/app/progress/experiment" className="font-semibold underline">
            Zpět k experimentu
          </Link>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-3 pb-10 sm:px-0">
      <Link
        href={
          experimentId
            ? "/app/progress/experiment"
            : asDiagnostic
              ? "/app/tests?intent=diagnostic"
              : "/app/tests"
        }
        className="mx-auto block w-full max-w-3xl text-body-sm font-semibold text-action hover:underline"
      >
        ← {experimentId ? "Experiment" : "Testy"}
      </Link>
      {asDiagnostic ? (
        <Alert
          className="mx-auto max-w-3xl"
          tone="info"
          title="Vstupní diagnostika"
        >
          Odpověz aspoň na 8 otázek. Baseline se uloží do N=1 experimentu a
          upraví learning path. Chybné odpovědi jdou do Moje chyby.
        </Alert>
      ) : null}
      {assessment ? (
        <Alert
          className="mx-auto max-w-3xl"
          tone="info"
          title={
            assessment.kind === "final"
              ? "Final assessment (N=1)"
              : "Weekly checkpoint (N=1)"
          }
        >
          {assessment.questionIds.length} otázek ·{" "}
          {assessment.transferQuestionIds.length} transfer. Otázky nejsou
          identické s těmi, které jsi už viděl/a v praxi.
        </Alert>
      ) : null}
      {!learnerId ? (
        <Card className="mx-auto max-w-3xl">
          <CardDescription>
            Pro uložení výsledků{" "}
            <Link href="/onboarding" className="font-semibold text-action">
              dokonči onboarding
            </Link>
            .
          </CardDescription>
        </Card>
      ) : null}
      <QuestionEnginePlayer
        pack={pack}
        initialProgress={progress}
        learnerId={learnerId}
        asDiagnostic={asDiagnostic && !assessment}
        experimentAssessmentId={assessment?.id ?? null}
        experimentQuestionIds={assessment?.questionIds ?? null}
      />
    </div>
  );
}
