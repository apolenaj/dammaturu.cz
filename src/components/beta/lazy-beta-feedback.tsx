"use client";

import dynamic from "next/dynamic";

/**
 * Heavy beta FAB — not needed for first paint / study core.
 * Fail-open: if chunk fails, students still study without the widget.
 */
const BetaFeedbackWidget = dynamic(
  () =>
    import("@/components/beta/beta-feedback-widget").then(
      (m) => m.BetaFeedbackWidget,
    ),
  { ssr: false, loading: () => null },
);

export function LazyBetaFeedbackWidget() {
  return <BetaFeedbackWidget />;
}
