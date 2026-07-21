"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createFinalAssessmentAction,
  createWeeklyCheckpointAction,
} from "@/server/actions/beta-experiment";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function ExperimentCheckpointActions() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function runWeekly() {
    setError(null);
    start(async () => {
      const res = await createWeeklyCheckpointAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(res.href);
    });
  }

  function runFinal() {
    setError(null);
    start(async () => {
      const res = await createFinalAssessmentAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(res.href);
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert title="Assessment" tone="warning">
          {error}
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={pending} onClick={runWeekly}>
          {pending ? "Připravuji…" : "Spustit weekly checkpoint"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={runFinal}
        >
          Spustit final assessment
        </Button>
      </div>
    </div>
  );
}
