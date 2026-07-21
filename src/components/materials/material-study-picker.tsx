"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { LearnerMaterialListItem } from "@/domain/learning/learner-materials";
import type { MaterialsSession } from "@/domain/learning/materials-study-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MaterialStudyPicker({
  materials,
  initialSelectedId,
}: {
  materials: LearnerMaterialListItem[];
  initialSelectedId?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (initialSelectedId) s.add(initialSelectedId);
    else if (materials[0]) s.add(materials[0].id);
    return s;
  });
  const [mode, setMode] = useState<"topic" | "smart_mix">("smart_mix");
  const [topic, setTopic] = useState<string>("");
  const [topics, setTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Local pending + fetch APIs only — Server Actions / startTransition cause
  // App Router to mount app/loading.tsx and can leave the page stuck.
  const [pending, setPending] = useState(false);

  const selectedList = useMemo(() => [...selected], [selected]);

  useEffect(() => {
    // Topics only needed for topic mode; avoid eager server calls on mount.
    if (mode !== "topic" || selectedList.length === 0) {
      if (mode !== "topic") setTopics([]);
      return;
    }
    let cancelled = false;
    void fetch("/api/materials/study/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ materialIds: selectedList }),
    })
      .then((r) => r.json())
      .then(
        (res: { ok: true; topics: string[] } | { ok: false; error: string }) => {
          if (cancelled || !res.ok) return;
          setTopics(res.topics);
          setTopic((prev) =>
            prev && res.topics.includes(prev) ? prev : (res.topics[0] ?? ""),
          );
        },
      )
      .catch(() => {
        /* leave topics empty; start will validate */
      });
    return () => {
      cancelled = true;
    };
  }, [mode, selectedList]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onStart() {
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/materials/study/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          materialIds: selectedList,
          mode,
          topic: mode === "topic" ? topic : null,
        }),
      });
      const res = (await response.json()) as
        | { ok: true; session: MaterialsSession }
        | { ok: false; error: string };
      if (!res.ok) {
        setError(res.error || "Sesit se nepodařilo spustit.");
        return;
      }
      try {
        sessionStorage.setItem(
          "materials-study-session",
          JSON.stringify(res.session),
        );
      } catch {
        setError("Prohlížeč neumožnil uložit sesit. Zkus jiný prohlížeč.");
        return;
      }
      sessionStorage.removeItem("grounded-study-session");
      const primary = selectedList[0];
      if (!primary) {
        setError("Vyber aspoň jeden materiál.");
        return;
      }
      window.location.assign(`/app/materials/${primary}/study/play`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Sesit se nepodařilo spustit. Zkus to znovu.",
      );
    } finally {
      setPending(false);
    }
  }

  if (materials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zatím nic k učení</CardTitle>
          <CardDescription>
            Nahraj materiál a počkej na stav Připraveno se znalostními body. Pak
            se sem vrať.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <Link href="/app/materials">
            <Button type="button">Moje materiály</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {materials.map((m) => {
          const on = selected.has(m.id);
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => toggle(m.id)}
                className={`flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  on
                    ? "border-action bg-action-soft/40"
                    : "border-border bg-surface hover:border-action/40"
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-semibold text-fg">{m.title}</p>
                  <p className="text-caption text-fg-muted">
                    {m.topicCount} témat · {m.knowledgePointCount} znalostních
                    bodů
                  </p>
                </div>
                <Badge tone={on ? "brand" : "neutral"}>
                  {on ? "Vybráno" : "Vybrat"}
                </Badge>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="space-y-3 rounded-xl border border-border bg-subtle/20 p-4">
        <p className="text-body-sm font-semibold text-fg">Jak chceš studovat?</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("smart_mix")}
            className={`rounded-lg border px-3 py-2 text-body-sm font-medium transition ${
              mode === "smart_mix"
                ? "border-action bg-action-soft/50 text-fg"
                : "border-border bg-surface text-fg-secondary"
            }`}
          >
            Chytrý mix
          </button>
          <button
            type="button"
            onClick={() => setMode("topic")}
            className={`rounded-lg border px-3 py-2 text-body-sm font-medium transition ${
              mode === "topic"
                ? "border-action bg-action-soft/50 text-fg"
                : "border-border bg-surface text-fg-secondary"
            }`}
          >
            Podle tématu
          </button>
        </div>
        {mode === "smart_mix" ? (
          <p className="text-caption text-fg-muted">
            Střídá vybavování, krátké odpovědi, karty, vysvětlení a retrieval —
            přednost mají slabší body.
          </p>
        ) : (
          <div className="space-y-2">
            <label className="block text-caption text-fg-muted" htmlFor="topic">
              Téma
            </label>
            <select
              id="topic"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-body-sm text-fg"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={topics.length === 0}
            >
              {topics.length === 0 ? (
                <option value="">Žádná témata</option>
              ) : (
                topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))
              )}
            </select>
          </div>
        )}
      </div>

      {error ? (
        <p className="text-body-sm text-danger">{error}</p>
      ) : null}

      <Button
        type="button"
        disabled={
          pending ||
          selectedList.length === 0 ||
          (mode === "topic" && !topic)
        }
        onClick={onStart}
      >
        Spustit studijní sesit
      </Button>
    </div>
  );
}
