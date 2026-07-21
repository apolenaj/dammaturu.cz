"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { BillingOverview } from "@/server/actions/billing";
import {
  grantPlanForTestingAction,
  openBillingPortalAction,
  startCheckoutAction,
} from "@/server/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function BillingPanel({ overview }: { overview: BillingOverview }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function portal() {
    setError(null);
    startTransition(async () => {
      const res = await openBillingPortalAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = res.url;
    });
  }

  function upgrade(planId: string) {
    setError(null);
    startTransition(async () => {
      const res = await startCheckoutAction({ planId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = res.url;
    });
  }

  function grant(planId: string) {
    setError(null);
    startTransition(async () => {
      const res = await grantPlanForTestingAction({ planId, days: 30 });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Předplatné</CardTitle>
          <Badge tone="brand">{overview.planNameCs}</Badge>
          <Badge tone="neutral">{overview.statusCs}</Badge>
        </div>
        <CardDescription>{overview.personalDataNoteCs}</CardDescription>
      </CardHeader>

      <div className="space-y-4 px-6 pb-6">
        {overview.lastPaymentErrorCs ? (
          <p role="alert" className="text-body-sm text-danger">
            {overview.lastPaymentErrorCs}
          </p>
        ) : null}

        {overview.trialEndsAt ? (
          <p className="text-body-sm text-fg-secondary">
            Zkušební období do{" "}
            {new Date(overview.trialEndsAt).toLocaleDateString("cs-CZ")}
          </p>
        ) : null}

        {overview.currentPeriodEnd ? (
          <p className="text-body-sm text-fg-secondary">
            Období do{" "}
            {new Date(overview.currentPeriodEnd).toLocaleDateString("cs-CZ")}
            {overview.cancelAtPeriodEnd
              ? " · zruší se na konci období"
              : ""}
          </p>
        ) : null}

        <p className="text-caption text-fg-muted">
          Limit materiálů: {overview.limits.maxMaterials} · nahrání/den:{" "}
          {overview.limits.maxUploadsPerDay}
        </p>

        {error ? (
          <p role="alert" className="text-body-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {overview.planId !== "smart" ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => upgrade("smart")}
            >
              Upgrade na SMART
            </Button>
          ) : null}
          {overview.planId !== "ai_pro" && overview.planId !== "maturita_max" ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => upgrade("ai_pro")}
            >
              Upgrade na AI PRO
            </Button>
          ) : null}
          {overview.planId !== "maturita_max" ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => upgrade("maturita_max")}
            >
              MATURITA MAX
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            disabled={pending || !overview.checkoutConfigured}
            onClick={portal}
          >
            Správa plateb (portal)
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => router.push("/cenik")}
          >
            Ceník
          </Button>
        </div>

        {process.env.NODE_ENV !== "production" ? (
          <div className="rounded-lg border border-dashed border-border p-3">
            <p className="text-caption font-semibold text-fg-muted">
              Dev grant (bez Stripe)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["free", "smart", "ai_pro", "maturita_max"] as const).map(
                (id) => (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => grant(id)}
                  >
                    {id}
                  </Button>
                ),
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
