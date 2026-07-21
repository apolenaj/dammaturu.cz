"use client";

import { useMemo, useState, useTransition } from "react";
import {
  connectionMapExploreAction,
  connectionMapFillAction,
  connectionMapSetModeAction,
} from "@/server/actions/connection-map";
import {
  buildFillChallenge,
  getNeighbors,
  getNodeBySlug,
  isFillComplete,
  nodeKindLabelsCs,
  pathNodes,
  pathsForRoot,
  scoreFillAnswers,
  type ConnectionMapMode,
  type ConnectionMapPack,
  type ConnectionMapProgress,
  type ConnectionNode,
  type ConnectionPath,
  type FillChallenge,
} from "@/domain/learning/connection-map";
import { Alert } from "@/components/ui/alert";
import { useEscapeToClose } from "@/lib/use-escape-to-close";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const kindTone: Record<
  ConnectionNode["kind"],
  "neutral" | "accent" | "brand" | "warning" | "success"
> = {
  movement: "success",
  region: "warning",
  author: "brand",
  work: "accent",
  concept: "neutral",
};

export function ConnectionMapExplorer({
  pack,
  initialProgress,
  learnerId,
}: {
  pack: ConnectionMapPack;
  initialProgress: ConnectionMapProgress | null;
  learnerId: string | null;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [mode, setMode] = useState<ConnectionMapMode>(
    initialProgress?.mode ?? "explore",
  );
  const [rootSlug, setRootSlug] = useState<string | null>(pack.rootSlugs[0] ?? null);
  const [selected, setSelected] = useState<ConnectionNode | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [challenges, setChallenges] = useState<Record<string, FillChallenge>>(
    {},
  );
  const [answers, setAnswers] = useState<
    Record<string, Record<number, string>>
  >({});
  const [activeBlank, setActiveBlank] = useState<{
    pathId: string;
    index: number;
  } | null>(null);
  const [fillMsg, setFillMsg] = useState<Record<string, string>>({});

  const visiblePaths = useMemo(
    () => pathsForRoot(pack, rootSlug),
    [pack, rootSlug],
  );

  function rebuildChallenges(paths: ConnectionPath[]) {
    const built: Record<string, FillChallenge> = {};
    for (const path of paths) {
      built[path.id] = buildFillChallenge(pack, path, { hideCount: 2 });
    }
    setChallenges(built);
    setAnswers({});
    setFillMsg({});
    setActiveBlank(null);
  }

  function requireLearner(): boolean {
    if (learnerId) return true;
    setError("Pro ukládání výsledků dokonči onboarding.");
    return false;
  }

  function switchMode(next: ConnectionMapMode) {
    setMode(next);
    setError(null);
    if (next === "fill") {
      rebuildChallenges(visiblePaths);
    } else {
      setFillMsg({});
      setActiveBlank(null);
    }
    if (!learnerId) return;
    startTransition(async () => {
      const res = await connectionMapSetModeAction({
        packSlug: pack.slug,
        mode: next,
      });
      if (res.ok) setProgress(res.progress);
    });
  }

  function selectRoot(slug: string) {
    setRootSlug(slug);
    if (mode === "fill") {
      rebuildChallenges(pathsForRoot(pack, slug));
    }
  }

  function openNode(node: ConnectionNode) {
    setSelected(node);
    if (!learnerId) return;
    startTransition(async () => {
      const res = await connectionMapExploreAction({
        packSlug: pack.slug,
        nodeId: node.id,
      });
      if (res.ok) setProgress(res.progress);
    });
  }

  function pickBlank(pathId: string, index: number, slug: string) {
    setAnswers((prev) => ({
      ...prev,
      [pathId]: { ...prev[pathId], [index]: slug },
    }));
    setActiveBlank(null);
    setFillMsg((prev) => {
      const copy = { ...prev };
      delete copy[pathId];
      return copy;
    });
  }

  function checkPath(path: ConnectionPath) {
    if (!requireLearner()) return;
    const challenge = challenges[path.id];
    if (!challenge) return;
    const pathAnswers = answers[path.id] ?? {};
    const { correct, total } = scoreFillAnswers(challenge, pathAnswers);
    const allCorrect = isFillComplete(challenge, pathAnswers);
    setFillMsg((prev) => ({
      ...prev,
      [path.id]: allCorrect
        ? "Souvislost kompletní — řetězec sedí."
        : `Správně ${correct}/${total}. Doplň zbývající uzly.`,
    }));
    startTransition(async () => {
      const res = await connectionMapFillAction({
        packSlug: pack.slug,
        pathId: path.id,
        allCorrect,
      });
      if (res.ok) setProgress(res.progress);
    });
  }

  function reshufflePath(path: ConnectionPath) {
    const next = buildFillChallenge(pack, path, { hideCount: 2 });
    setChallenges((prev) => ({ ...prev, [path.id]: next }));
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[path.id];
      return copy;
    });
    setFillMsg((prev) => {
      const copy = { ...prev };
      delete copy[path.id];
      return copy;
    });
  }

  const fillPct =
    progress && progress.fillAnswered > 0
      ? Math.round((progress.fillCorrect / progress.fillAnswered) * 100)
      : null;

  const activeChallenge = activeBlank
    ? challenges[activeBlank.pathId]
    : null;
  const activeBlankDef = activeChallenge?.blanks.find(
    (b) => b.index === activeBlank?.index,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
      <header className="space-y-3 px-1">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">Mapa souvislostí</Badge>
          <Badge tone="accent">{pack.paths.length} cest</Badge>
        </div>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-sm text-fg-secondary">{pack.summary}</p>

        <div
          className="grid grid-cols-2 gap-2 rounded-xl bg-subtle p-1"
          role="tablist"
          aria-label="Režim mapy"
        >
          <ModeTab
            active={mode === "explore"}
            onClick={() => switchMode("explore")}
            label="Prohlížet"
          />
          <ModeTab
            active={mode === "fill"}
            onClick={() => switchMode("fill")}
            label="Doplnit"
          />
        </div>

        {progress ? (
          <p className="text-caption text-fg-muted">
            Prozkoumáno {progress.exploredNodeIds.length} · doplněno{" "}
            {progress.completedPathIds.length}/{pack.paths.length}
            {fillPct !== null ? ` · úspěšnost ${fillPct}%` : ""}
          </p>
        ) : null}

        {error ? (
          <Alert title="Pozor" tone="warning">
            {error}
          </Alert>
        ) : null}
      </header>

      {/* Focus roots */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pack.rootSlugs.map((slug) => {
          const node = getNodeBySlug(pack, slug);
          if (!node) return null;
          const active = rootSlug === slug;
          return (
            <button
              key={slug}
              type="button"
              onClick={() => selectRoot(slug)}
              className={cn(
                "min-h-11 shrink-0 touch-manipulation rounded-xl px-4 text-body-sm font-semibold transition",
                active
                  ? "bg-action text-fg-on-brand"
                  : "bg-subtle text-fg ring-1 ring-border-subtle",
              )}
            >
              {node.title}
            </button>
          );
        })}
      </div>

      <p className="px-1 text-caption text-fg-muted">
        {mode === "explore"
          ? "Každá cesta = jedna souvislost. Klepni na uzel pro detaily a sousedy."
          : "Systém skryl některé uzly. Doplň je a ověř řetězec."}
      </p>

      <div className="flex flex-col gap-3">
        {visiblePaths.map((path) => {
          const challenge =
            mode === "fill" ? (challenges[path.id] ?? null) : null;
          const pathAnswers = answers[path.id] ?? {};
          const done = progress?.completedPathIds.includes(path.id);

          return (
            <section
              key={path.id}
              className="rounded-2xl bg-surface px-3 py-4 ring-1 ring-border-subtle sm:px-4"
              aria-label={path.label}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="text-body-sm font-semibold text-fg">
                  {path.label.split("→")[0]?.trim() ?? path.label}
                </h2>
                {done ? <Badge tone="success">Hotovo</Badge> : null}
              </div>

              <PathChain
                pack={pack}
                path={path}
                mode={mode}
                challenge={challenge}
                answers={pathAnswers}
                onOpenNode={openNode}
                onOpenBlank={(index) =>
                  setActiveBlank({ pathId: path.id, index })
                }
              />

              {mode === "fill" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => checkPath(path)}
                    disabled={pending}
                  >
                    Ověřit cestu
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reshufflePath(path)}
                  >
                    Nové mezery
                  </Button>
                </div>
              ) : null}

              {fillMsg[path.id] ? (
                <p
                  className={cn(
                    "mt-3 text-body-sm",
                    fillMsg[path.id]?.startsWith("Souvislost")
                      ? "text-success"
                      : "text-fg-secondary",
                  )}
                >
                  {fillMsg[path.id]}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>

      {selected ? (
        <NodeSheet
          pack={pack}
          node={selected}
          onClose={() => setSelected(null)}
          onOpenRelated={(n) => openNode(n)}
        />
      ) : null}

      {activeBlank && activeBlankDef ? (
        <ChoiceSheet
          blankIndex={activeBlank.index}
          choices={activeBlankDef.choices}
          selectedSlug={answers[activeBlank.pathId]?.[activeBlank.index]}
          onPick={(slug) =>
            pickBlank(activeBlank.pathId, activeBlank.index, slug)
          }
          onClose={() => setActiveBlank(null)}
        />
      ) : null}
    </div>
  );
}

function PathChain({
  pack,
  path,
  mode,
  challenge,
  answers,
  onOpenNode,
  onOpenBlank,
}: {
  pack: ConnectionMapPack;
  path: ConnectionPath;
  mode: ConnectionMapMode;
  challenge: FillChallenge | null;
  answers: Record<number, string>;
  onOpenNode: (n: ConnectionNode) => void;
  onOpenBlank: (index: number) => void;
}) {
  const nodes = pathNodes(pack, path);

  return (
    <ol className="flex flex-col gap-0">
      {nodes.map((node, index) => {
        const hidden = challenge?.slots[index]?.hidden ?? false;
        const answeredSlug = answers[index];
        const answeredNode = answeredSlug
          ? getNodeBySlug(pack, answeredSlug)
          : null;
        const edge =
          index > 0
            ? pack.edges.find(
                (e) =>
                  e.fromSlug === path.nodeSlugs[index - 1] &&
                  e.toSlug === path.nodeSlugs[index],
              )
            : null;

        return (
          <li key={`${path.id}-${node.slug}`} className="flex flex-col">
            {index > 0 ? (
              <div
                className="flex items-center gap-2 py-1 pl-4 text-caption text-fg-muted"
                aria-hidden
              >
                <span className="inline-block h-4 w-px bg-border-strong" />
                <span>↓ {edge?.relation ?? "→"}</span>
              </div>
            ) : null}

            {mode === "fill" && hidden ? (
              <button
                type="button"
                onClick={() => onOpenBlank(index)}
                className={cn(
                  "flex min-h-12 touch-manipulation items-center gap-3 rounded-xl px-3 py-2 text-left ring-2 ring-dashed transition",
                  answeredNode
                    ? "bg-subtle ring-action/40"
                    : "bg-warning-soft ring-warning/50",
                )}
              >
                <Badge tone={answeredNode ? kindTone[answeredNode.kind] : "warning"}>
                  {answeredNode
                    ? nodeKindLabelsCs[answeredNode.kind]
                    : "Doplň"}
                </Badge>
                <span className="font-semibold text-fg">
                  {answeredNode?.title ?? "??? — klepni a vyber"}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenNode(node)}
                className="flex min-h-12 touch-manipulation items-center gap-3 rounded-xl bg-subtle px-3 py-2 text-left ring-1 ring-border-subtle transition hover:ring-action/40"
              >
                <Badge tone={kindTone[node.kind]}>
                  {nodeKindLabelsCs[node.kind]}
                </Badge>
                <span className="font-semibold text-fg">{node.title}</span>
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function NodeSheet({
  pack,
  node,
  onClose,
  onOpenRelated,
}: {
  pack: ConnectionMapPack;
  node: ConnectionNode;
  onClose: () => void;
  onOpenRelated: (n: ConnectionNode) => void;
}) {
  const { outgoing, incoming } = getNeighbors(pack, node.slug);
  useEscapeToClose(onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-fg/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={node.title}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong sm:hidden" />
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Badge tone={kindTone[node.kind]}>
              {nodeKindLabelsCs[node.kind]}
            </Badge>
            <h2 className="mt-2 font-display text-xl font-semibold text-fg">
              {node.title}
            </h2>
            <p className="mt-1 text-body-sm text-fg-secondary">{node.summary}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Zavřít
          </Button>
        </div>
        <p className="mt-4 text-body-sm text-fg">{node.detail}</p>

        {(incoming.length > 0 || outgoing.length > 0) ? (
          <div className="mt-5 space-y-3">
            <h3 className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
              Souvislosti
            </h3>
            {incoming.length > 0 ? (
              <div>
                <p className="mb-2 text-caption text-fg-muted">Předchází</p>
                <div className="flex flex-wrap gap-2">
                  {incoming.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => onOpenRelated(n)}
                      className="min-h-11 touch-manipulation rounded-lg bg-subtle px-3 text-body-sm font-medium ring-1 ring-border-subtle"
                    >
                      {n.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {outgoing.length > 0 ? (
              <div>
                <p className="mb-2 text-caption text-fg-muted">Navazuje</p>
                <div className="flex flex-wrap gap-2">
                  {outgoing.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => onOpenRelated(n)}
                      className="min-h-11 touch-manipulation rounded-lg bg-subtle px-3 text-body-sm font-medium ring-1 ring-border-subtle"
                    >
                      {n.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChoiceSheet({
  blankIndex,
  choices,
  selectedSlug,
  onPick,
  onClose,
}: {
  blankIndex: number;
  choices: ConnectionNode[];
  selectedSlug?: string;
  onPick: (slug: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-fg/40 sm:items-center sm:p-4"
      role="dialog"
      aria-modal
      aria-label="Vyber uzel"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong sm:hidden" />
        <h2 className="font-display text-lg font-semibold text-fg">
          Co patří do mezery #{blankIndex + 1}?
        </h2>
        <p className="mt-1 text-body-sm text-fg-secondary">
          Vyber uzel, který doplní souvislost.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.slug)}
              className={cn(
                "flex min-h-12 touch-manipulation items-center gap-3 rounded-xl px-3 text-left ring-1 transition",
                selectedSlug === c.slug
                  ? "bg-action/10 ring-action"
                  : "bg-subtle ring-border-subtle",
              )}
            >
              <Badge tone={kindTone[c.kind]}>
                {nodeKindLabelsCs[c.kind]}
              </Badge>
              <span className="font-semibold text-fg">{c.title}</span>
            </button>
          ))}
        </div>
        <Button
          className="mt-4"
          variant="ghost"
          fullWidth
          onClick={onClose}
        >
          Zrušit
        </Button>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "min-h-12 touch-manipulation rounded-lg text-body-sm font-semibold transition",
        active ? "bg-surface text-fg shadow-sm" : "text-fg-secondary",
      )}
    >
      {label}
    </button>
  );
}
