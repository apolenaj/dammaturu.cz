"use client";

import dynamic from "next/dynamic";
import { AppLoadingState } from "@/components/shell/app-screen";

const loading = () => <AppLoadingState label="Načítám…" />;

export const LazyZachranMeWizard = dynamic(
  () =>
    import("@/components/zachran-me/zachran-me-wizard").then(
      (m) => m.ZachranMeWizard,
    ),
  { loading },
);

export const LazyOralMaturitySimulationView = dynamic(
  () =>
    import("@/components/oral/oral-maturity-simulation-view").then(
      (m) => m.OralMaturitySimulationView,
    ),
  { loading },
);

export const LazyMockExamView = dynamic(
  () =>
    import("@/components/mock-exam/mock-exam-view").then((m) => m.MockExamView),
  { loading },
);

export const LazyCermatPrepHub = dynamic(
  () =>
    import("@/components/cermat/cermat-prep-hub").then((m) => m.CermatPrepHub),
  { loading },
);
