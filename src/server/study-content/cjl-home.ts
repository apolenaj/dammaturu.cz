import {
  buildTopicCard,
  groupCatalogByTopic,
  pickNowAction,
  progressDetailCs,
  type CjlFastAction,
  type CjlHomeView,
} from "@/domain/study-content/cjl-home";
import { CATALOG_DOCX_MANIFEST } from "@/domain/study-content/registry";
import {
  listActiveMemories,
} from "@/domain/learning/error-memory";
import { getErrorBook, getOrCreateErrorBook } from "@/server/error-memory/store";
import { getLearnerEntitlements } from "@/server/billing/entitlements";
import { listProgressForLearner } from "@/server/study-content/progress-store";
import { getStudyContentRegistry } from "@/server/study-content/registry";
import type { StudyContentProgress } from "@/domain/study-content/registry";

export async function buildCjlHomeView(
  learnerId: string | null,
): Promise<CjlHomeView> {
  const registry = await getStudyContentRegistry();
  const catalog = registry.filter(
    (e) =>
      CATALOG_DOCX_MANIFEST.some((m) => m.sourceId === e.sourceId) &&
      (e.contentStatus === "available" ||
        e.contentStatus === "available_with_warning") &&
      e.parseComplete &&
      e.chunks.length > 0,
  );

  const progressList = learnerId
    ? await listProgressForLearner(learnerId)
    : [];
  const progressBySource = new Map<string, StudyContentProgress>();
  for (const p of progressList) {
    progressBySource.set(p.sourceId, p);
  }

  let activeMistakes = 0;
  if (learnerId) {
    const book =
      (await getErrorBook(learnerId)) ??
      (await getOrCreateErrorBook(learnerId));
    activeMistakes = listActiveMemories(book).length;
  }

  let canOral = false;
  if (learnerId) {
    try {
      const ent = await getLearnerEntitlements(learnerId);
      canOral =
        ent.features.has("oral_simulation") ||
        ent.features.has("mock_exam");
    } catch {
      canOral = false;
    }
  }

  if (catalog.length === 0) {
    return {
      subject: "Český jazyk a literatura",
      materialsAvailable: 0,
      completedChunks: 0,
      totalChunks: 0,
      completedUnits: 0,
      totalUnits: 0,
      weakLabelCs: "Ještě nemáme dost výsledků",
      weakHref: null,
      now: {
        kind: "start",
        sourceId: "cjl-realismus",
        href: "/app/materials",
        titleCs: "Materiály se připravují",
        detailCs:
          "Katalog ČJL není načtený. Otevři Moje materiály — tam uvidíš stav zdrojů.",
        ctaLabel: "Začni tady",
      },
      fastActions: [
        { id: "materials", label: "Moje materiály", href: "/app/materials" },
        { id: "cermat", label: "CERMAT příprava", href: "/app/cermat" },
      ],
      topics: [],
      isFirstTime: true,
    };
  }

  const { now, isFirstTime } = pickNowAction(catalog, progressBySource);

  let completedChunks = 0;
  let totalChunks = 0;
  let completedUnits = 0;
  let totalUnits = 0;
  for (const e of catalog) {
    totalChunks += e.chunks.length;
    totalUnits += e.knowledgeUnits.length;
    const p = progressBySource.get(e.sourceId);
    if (p) {
      completedChunks += p.completedChunkIds.length;
      completedUnits += p.completedUnitIds.length;
    }
  }

  const topics = groupCatalogByTopic(catalog).map((b) =>
    buildTopicCard(b, progressBySource),
  );

  const firstTestable =
    catalog.find((e) => e.knowledgeUnits.length > 0) ?? catalog[0]!;

  const fastActions: CjlFastAction[] = [
    { id: "materials", label: "Moje materiály", href: "/app/materials" },
    { id: "cermat", label: "CERMAT příprava", href: "/app/cermat" },
  ];

  if (activeMistakes > 0) {
    fastActions.push({
      id: "mistakes",
      label: "Procvičit chyby",
      href: "/app/mistakes",
    });
  }

  fastActions.push({
    id: "quick-test",
    label: "Rychlý test",
    href: `/app/materials/katalog/${firstTestable.sourceId}?mode=test`,
  });

  fastActions.push({
    id: "simulation",
    label: "Zkouška nanečisto",
    href: canOral ? "/app/simulation" : "/app/learn/maj",
  });

  let weakLabelCs: string;
  let weakHref: string | null;
  if (activeMistakes > 0) {
    weakLabelCs = `${activeMistakes} aktivních chyb k procvičení`;
    weakHref = "/app/mistakes";
  } else {
    const dueTopics = topics.filter((t) => t.dueForReviewCount > 0);
    if (dueTopics.length > 0) {
      const top = dueTopics.sort(
        (a, b) => b.dueForReviewCount - a.dueForReviewCount,
      )[0]!;
      weakLabelCs = `${top.topicName}: ${top.dueForReviewCount} materiálů bez procvičení`;
      weakHref = top.primaryCta.href.replace("mode=learn", "mode=test");
    } else {
      weakLabelCs = "Ještě nemáme dost výsledků";
      weakHref = null;
    }
  }

  return {
    subject: "Český jazyk a literatura",
    materialsAvailable: catalog.length,
    completedChunks,
    totalChunks,
    completedUnits,
    totalUnits,
    weakLabelCs,
    weakHref,
    now: {
      ...now,
      // First-time CTA copy must be “Začni tady”; continue uses primary label.
      ctaLabel: isFirstTime ? "Začni tady" : "Pokračovat v učení",
    },
    fastActions,
    topics,
    isFirstTime,
  };
}

export { progressDetailCs };
