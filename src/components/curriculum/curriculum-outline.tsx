import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CurriculumPack } from "@/server/curriculum/types";

function examTone(
  relevance: string,
): "neutral" | "accent" | "success" | "warning" | "brand" {
  switch (relevance) {
    case "critical":
      return "brand";
    case "high":
      return "warning";
    case "medium":
      return "accent";
    default:
      return "neutral";
  }
}

/**
 * Renders curriculum from packed store data — no hardcoded module lists.
 */
export function CurriculumOutline({
  pack,
  variant = "student",
  titleById,
  highlightSlug,
}: {
  pack: CurriculumPack;
  variant?: "student" | "admin";
  /** Optional map topicId → display name for prerequisites */
  titleById?: Map<string, string>;
  /** Topic slug or id to visually focus (from ?focus=). */
  highlightSlug?: string | null;
}) {
  const titles =
    titleById ??
    new Map(
      pack.modules.flatMap((m) =>
        m.topics.map((t) => [t.id, t.title] as const),
      ),
    );

  const prereqTitles = (topicId: string) => {
    const edges = pack.topicPrerequisites.filter((e) => e.topicId === topicId);
    return edges
      .map((e) => titles.get(e.prerequisiteTopicId) ?? e.prerequisiteTopicId)
      .join(", ");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
          {pack.subject.title}
        </p>
        <h1 className="mt-1 font-display text-display-md text-fg">
          {pack.curriculum.title}
        </h1>
        {pack.curriculum.description ? (
          <p className="mt-2 max-w-2xl text-body-md text-fg-secondary">
            {pack.curriculum.description}
          </p>
        ) : null}
        <p className="mt-2 text-caption text-fg-muted">
          v{pack.curriculum.version} · {pack.modules.length} modulů ·{" "}
          {pack.modules.reduce((n, m) => n + m.topics.length, 0)} témat ·{" "}
          {pack.topicPrerequisites.length} závislostí
          {variant === "admin" ? ` · seed ${pack.seededAt}` : null}
        </p>
      </div>

      {pack.modules.map((mod) => (
        <Card key={mod.id}>
          <CardHeader>
            <CardTitle>
              {mod.code}. {mod.title}
            </CardTitle>
            {mod.summary ? (
              <CardDescription>{mod.summary}</CardDescription>
            ) : null}
          </CardHeader>
          <ul className="mt-4 space-y-3">
            {mod.topics.map((topic) => {
              const deps = prereqTitles(topic.id);
              const focused =
                highlightSlug != null &&
                (topic.slug === highlightSlug || topic.id === highlightSlug);
              return (
                <li
                  key={topic.id}
                  id={focused ? `topic-${topic.slug}` : undefined}
                  className={
                    focused
                      ? "rounded-lg border border-action/40 bg-action-soft/20 p-3"
                      : "border-t border-border pt-3 first:border-0 first:pt-0"
                  }
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-body-sm font-semibold text-fg">
                        {topic.title}
                      </p>
                      {topic.summary ? (
                        <p className="mt-1 text-body-sm text-fg-secondary">
                          {topic.summary}
                        </p>
                      ) : null}
                      {deps ? (
                        <p className="mt-1 text-caption text-fg-muted">
                          Vyžaduje: {deps}
                        </p>
                      ) : (
                        <p className="mt-1 text-caption text-fg-muted">
                          Kořen grafu (bez prerekvizit)
                        </p>
                      )}
                      {variant === "admin" && topic.sourceFilenames.length > 0 ? (
                        <p className="mt-1 text-caption text-fg-muted">
                          Zdroje: {topic.sourceFilenames.join("; ")}
                        </p>
                      ) : null}
                    </div>
                    <Badge tone={examTone(topic.examRelevance)}>
                      {topic.examRelevance}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}

      {variant === "admin" ? (
        <Card>
          <CardHeader>
            <CardTitle>Topic dependency graph</CardTitle>
            <CardDescription>
              Hrany topic → prerequisite (uložené v store / DB)
            </CardDescription>
          </CardHeader>
          <ul className="mt-3 space-y-1 font-mono text-caption text-fg-secondary">
            {pack.topicPrerequisites.map((e) => (
              <li key={`${e.topicId}-${e.prerequisiteTopicId}`}>
                {titles.get(e.topicId)} ← {titles.get(e.prerequisiteTopicId)}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {variant === "student" ? (
        <p className="text-body-sm text-fg-secondary">
          Učení podle témat napojíme na Knowledge Units po Content QA.{" "}
          <Link href="/app/learn" className="font-semibold text-action hover:underline">
            Učit se
          </Link>
        </p>
      ) : null}
    </div>
  );
}
