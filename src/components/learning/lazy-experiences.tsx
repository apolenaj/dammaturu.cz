"use client";

import dynamic from "next/dynamic";
import { AppLoadingState } from "@/components/shell/app-screen";
import type { MajExamPrepPack } from "@/domain/learning/maj-exam-prep";
import type { BabickaExperiencePack } from "@/domain/learning/babicka-experience";
import type { KyticeExperiencePack } from "@/domain/learning/kytice-experience";

const loading = () => <AppLoadingState label="Načítám obsah…" />;

export const LazyMajExamPrepView = dynamic(
  () =>
    import("@/components/maj/maj-exam-prep-view").then((m) => m.MajExamPrepView),
  { loading },
);

export const LazyBabickaExperienceView = dynamic(
  () =>
    import("@/components/babicka/babicka-experience-view").then(
      (m) => m.BabickaExperienceView,
    ),
  { loading },
);

export const LazyKyticeExperienceView = dynamic(
  () =>
    import("@/components/kytice/kytice-experience-view").then(
      (m) => m.KyticeExperienceView,
    ),
  { loading },
);

/** Typed wrappers keep page.tsx free of `any`. */
export function MajExamPrepLazy({ pack }: { pack: MajExamPrepPack }) {
  return <LazyMajExamPrepView pack={pack} />;
}

export function BabickaExperienceLazy({
  pack,
}: {
  pack: BabickaExperiencePack;
}) {
  return <LazyBabickaExperienceView pack={pack} />;
}

export function KyticeExperienceLazy({
  pack,
}: {
  pack: KyticeExperiencePack;
}) {
  return <LazyKyticeExperienceView pack={pack} />;
}
