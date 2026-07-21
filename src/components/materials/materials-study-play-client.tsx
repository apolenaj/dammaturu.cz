"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  materialsSessionSchema,
  type MaterialsSession,
} from "@/domain/learning/materials-study-session";
import { MaterialsStudyPlayer } from "@/components/materials/materials-study-player";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MaterialsStudyPlayClient({
  materialId,
}: {
  materialId: string;
}) {
  const [session, setSession] = useState<MaterialsSession | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("materials-study-session");
      if (!raw) {
        setMissing(true);
        return;
      }
      const parsed = materialsSessionSchema.safeParse(JSON.parse(raw));
      if (!parsed.success || !parsed.data.materialIds.includes(materialId)) {
        setMissing(true);
        return;
      }
      setSession(parsed.data);
    } catch {
      setMissing(true);
    }
  }, [materialId]);

  if (missing) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-3 pb-10">
        <Card>
          <CardHeader>
            <CardTitle>Sesit není připravený</CardTitle>
            <CardDescription>
              Spusť studium znovu výběrem materiálů a režimu (téma / chytrý mix).
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href="/app/materials/study">
              <Button type="button">Vybrat materiály</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <p className="px-3 text-body-sm text-fg-muted">Načítám sesit…</p>
    );
  }

  return (
    <div className="px-3 pb-10 sm:px-0">
      <MaterialsStudyPlayer session={session} />
    </div>
  );
}
