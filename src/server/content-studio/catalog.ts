import { randomUUID } from "node:crypto";
import {
  countByKind,
  parseStudioCatalog,
  parseStudioEditFields,
  shouldVersion,
  studioListItemSchema,
  type StudioCatalog,
  type StudioEditFields,
  type StudioEntityKind,
  type StudioLessonPreview,
  type StudioListItem,
  type StudioVersionEntry,
  type StudioVerificationStatus,
} from "@/domain/admin/content-studio";
import { getActiveCurriculum } from "@/server/curriculum/repository";
import { listLessons, getLessonBySlug, saveLesson } from "@/server/lesson-engine/store";
import { listLiteraryWorks, saveLiteraryWork } from "@/server/literary-work/store";
import { listFlashcardDecks, saveFlashcardDeck } from "@/server/flashcards/store";
import { listQuestionPacks, saveQuestionPack } from "@/server/question-engine/store";
import { listQaItems } from "@/server/content-qa/store";
import {
  getStudioOverrides,
  listStudioVersions,
  saveStudioOverride,
  saveStudioVersion,
  type StudioOverride,
} from "@/server/content-studio/store";
import { parseLessonDocument } from "@/domain/learning/lesson";
import { publishStatuses } from "@/domain/content/schemas";

type PublishStatus = (typeof publishStatuses)[number];

function excerpt(text: string | null | undefined, max = 160): string | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function clip(text: string | null | undefined, max = 400): string | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function mapQaStatus(
  status: string | undefined,
): StudioVerificationStatus {
  if (
    status === "verified_from_source" ||
    status === "needs_fact_check" ||
    status === "corrected" ||
    status === "rejected"
  ) {
    return status;
  }
  return "not_linked";
}

/**
 * Build live catalog from curriculum + learning packs + QA + studio overrides.
 * No raw JSON editing — catalog is derived, edits go through typed fields.
 */
export async function buildStudioCatalog(): Promise<StudioCatalog> {
  const now = new Date().toISOString();
  const [
    curriculum,
    lessons,
    works,
    decks,
    questionPacks,
    qaItems,
    overrides,
  ] = await Promise.all([
    getActiveCurriculum(),
    listLessons(),
    listLiteraryWorks(),
    listFlashcardDecks(),
    listQuestionPacks(),
    listQaItems(),
    getStudioOverrides(),
  ]);

  const overrideById = new Map(overrides.map((o) => [o.id, o]));
  const items: StudioListItem[] = [];

  if (curriculum) {
    items.push(
      applyOverride(
        {
          id: `subject:${curriculum.subject.id}`,
          kind: "subject",
          title: curriculum.subject.title,
          slug: curriculum.subject.slug,
          status: curriculum.subject.status,
          summary: clip(curriculum.subject.description),
          hrefStudent: "/app/topics",
          provenance: {
            sourceFilename: null,
            sourceExcerpt: excerpt(curriculum.subject.description),
            verificationStatus: "not_linked",
            lastEditor: "system:curriculum-seed",
            lastUpdate: curriculum.curriculum.updatedAt,
          },
          backendRef: curriculum.subject.id,
        },
        overrideById,
      ),
    );

    for (const mod of curriculum.modules) {
      for (const topic of mod.topics) {
        const src = topic.sourceFilenames[0] ?? null;
        items.push(
          applyOverride(
            {
              id: `topic:${topic.id}`,
              kind: "topic",
              title: topic.title,
              slug: topic.slug,
              status: topic.status,
              summary: clip(topic.summary),
              hrefStudent: "/app/topics",
              provenance: {
                sourceFilename: src,
                sourceExcerpt: excerpt(topic.summary),
                verificationStatus: src ? "needs_fact_check" : "not_linked",
                lastEditor: "system:curriculum-seed",
                lastUpdate: curriculum.seededAt,
              },
              backendRef: topic.id,
            },
            overrideById,
          ),
        );
      }
    }
  }

  for (const lesson of lessons) {
    items.push(
      applyOverride(
        {
          id: `lesson:${lesson.id}`,
          kind: "lesson",
          title: lesson.title,
          slug: lesson.slug,
          status: lesson.status,
          summary: clip(lesson.objective),
          hrefStudent: `/app/learn/${lesson.slug}`,
          provenance: {
            sourceFilename: null,
            sourceExcerpt: excerpt(lesson.objective),
            verificationStatus: "draft_unverified",
            lastEditor: "system:lesson-seed",
            lastUpdate: lesson.updatedAt,
          },
          backendRef: lesson.id,
        },
        overrideById,
      ),
    );
  }

  const authorsSeen = new Set<string>();
  for (const work of works) {
    items.push(
      applyOverride(
        {
          id: `work:${work.id}`,
          kind: "work",
          title: work.title,
          slug: work.slug,
          status: "published",
          summary: clip(work.summary),
          hrefStudent: `/app/learn/dilo/${work.slug}`,
          provenance: {
            sourceFilename: work.related.sourceFilename,
            sourceExcerpt: excerpt(work.summary),
            verificationStatus: work.related.sourceFilename
              ? "needs_fact_check"
              : "not_linked",
            lastEditor: "system:literary-seed",
            lastUpdate: work.updatedAt,
          },
          backendRef: work.id,
        },
        overrideById,
      ),
    );
    const authorKey = work.author.trim().toLowerCase();
    if (authorKey && !authorsSeen.has(authorKey)) {
      authorsSeen.add(authorKey);
      const authorId = `author:${authorKey.replace(/\s+/g, "-").slice(0, 60)}`;
      items.push(
        applyOverride(
          {
            id: authorId,
            kind: "author",
            title: work.author,
            slug: null,
            status: "published",
            summary: `Autor/ka díla ${work.title}`,
            hrefStudent: `/app/learn/dilo/${work.slug}`,
            provenance: {
              sourceFilename: work.related.sourceFilename,
              sourceExcerpt: excerpt(work.author),
              verificationStatus: "not_linked",
              lastEditor: "system:literary-seed",
              lastUpdate: work.updatedAt,
            },
            backendRef: work.id,
          },
          overrideById,
        ),
      );
    }
  }

  for (const qa of qaItems) {
    items.push(
      applyOverride(
        {
          id: `ku:${qa.id}`,
          kind: "knowledge_unit",
          title: qa.title,
          slug: null,
          status:
            qa.validationStatus === "verified_from_source" ||
            qa.validationStatus === "corrected"
              ? "published"
              : qa.validationStatus === "rejected"
                ? "archived"
                : "needs_review",
          summary: clip(qa.publishedStatement ?? qa.normalizedStatement),
          hrefStudent: null,
          provenance: {
            sourceFilename: qa.filename,
            sourceExcerpt: excerpt(qa.sourceStatement),
            verificationStatus: mapQaStatus(qa.validationStatus),
            lastEditor: qa.reviewedBy ?? "system:content-qa",
            lastUpdate: qa.updatedAt,
          },
          backendRef: qa.id,
        },
        overrideById,
      ),
    );
  }

  for (const deck of decks) {
    for (const card of deck.cards.slice(0, 40)) {
      items.push(
        applyOverride(
          {
            id: `flashcard:${card.id}`,
            kind: "flashcard",
            title: card.front.slice(0, 120),
            slug: card.slug,
            status: "published",
            summary: clip(card.back.slice(0, 200)),
            hrefStudent: "/app/review",
            provenance: {
              sourceFilename: null,
              sourceExcerpt: excerpt(card.front),
              verificationStatus: "draft_unverified",
              lastEditor: "system:flashcards-seed",
              lastUpdate: deck.updatedAt,
            },
            backendRef: `${deck.id}::${card.id}`,
          },
          overrideById,
        ),
      );
    }
  }

  for (const pack of questionPacks) {
    for (const q of pack.questions.slice(0, 40)) {
      items.push(
        applyOverride(
          {
            id: `question:${q.id}`,
            kind: "question",
            title: q.stem.slice(0, 160),
            slug: null,
            status: "published",
            summary: clip(q.explanation?.slice(0, 200) ?? null),
            hrefStudent: `/app/tests/otazky/${pack.slug}`,
            provenance: {
              sourceFilename: null,
              sourceExcerpt: excerpt(q.stem),
              verificationStatus: "draft_unverified",
              lastEditor: "system:question-seed",
              lastUpdate: pack.updatedAt,
            },
            backendRef: `${pack.id}::${q.id}`,
          },
          overrideById,
        ),
      );
    }
  }

  // Studio-native exercises from overrides of kind exercise
  for (const ov of overrides) {
    if (ov.kind !== "exercise") continue;
    if (items.some((i) => i.id === ov.id)) continue;
    items.push({
      id: ov.id,
      kind: "exercise",
      title: ov.fields.title,
      slug: ov.fields.slug ?? null,
      status: ov.fields.status ?? "draft",
      summary: clip(ov.fields.summary ?? ov.fields.prompt ?? null),
      hrefStudent: null,
      provenance: {
        sourceFilename: ov.fields.sourceFilename ?? null,
        sourceExcerpt: ov.fields.sourceExcerpt ?? excerpt(ov.fields.prompt),
        verificationStatus: "draft_unverified",
        lastEditor: ov.lastEditor,
        lastUpdate: ov.updatedAt,
      },
      backendRef: ov.id,
    });
  }

  const catalog = parseStudioCatalog({
    generatedAt: now,
    items: items.map((i) => studioListItemSchema.parse(i)),
    countsByKind: countByKind(items),
  });
  return catalog;
}

function applyOverride(
  base: StudioListItem,
  overrides: Map<string, StudioOverride>,
): StudioListItem {
  const ov = overrides.get(base.id);
  if (!ov) return base;
  return {
    ...base,
    title: ov.fields.title || base.title,
    slug: ov.fields.slug !== undefined ? ov.fields.slug : base.slug,
    summary:
      ov.fields.summary !== undefined ? ov.fields.summary : base.summary,
    status: ov.fields.status ?? base.status,
    provenance: {
      ...base.provenance,
      sourceFilename:
        ov.fields.sourceFilename !== undefined
          ? ov.fields.sourceFilename
          : base.provenance.sourceFilename,
      sourceExcerpt:
        ov.fields.sourceExcerpt !== undefined
          ? ov.fields.sourceExcerpt
          : base.provenance.sourceExcerpt,
      lastEditor: ov.lastEditor,
      lastUpdate: ov.updatedAt,
    },
  };
}

export async function getStudioItem(
  id: string,
): Promise<{ item: StudioListItem; fields: StudioEditFields } | null> {
  const catalog = await buildStudioCatalog();
  const item = catalog.items.find((i) => i.id === id);
  if (!item) return null;
  const overrides = await getStudioOverrides();
  const ov = overrides.find((o) => o.id === id);
  const fields: StudioEditFields = ov?.fields ?? {
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    status: item.status,
    sourceFilename: item.provenance.sourceFilename,
    sourceExcerpt: item.provenance.sourceExcerpt,
  };
  return { item, fields: parseStudioEditFields(fields) };
}

export async function saveStudioItem(input: {
  id: string;
  kind: StudioEntityKind;
  fields: StudioEditFields;
  editor: string;
  note?: string | null;
}): Promise<{ itemId: string; version: number | null }> {
  const fields = parseStudioEditFields(input.fields);
  const now = new Date().toISOString();
  const editor = input.editor.trim() || "admin";

  await saveStudioOverride({
    id: input.id,
    kind: input.kind,
    fields,
    lastEditor: editor,
    updatedAt: now,
  });

  // Best-effort write-through for lessons / works / flashcards / questions
  await writeThrough(input.id, input.kind, fields, now);

  let version: number | null = null;
  if (shouldVersion(input.kind)) {
    const prev = await listStudioVersions(input.id);
    version = (prev[0]?.version ?? 0) + 1;
    const entry: StudioVersionEntry = {
      id: randomUUID(),
      entityId: input.id,
      kind: input.kind,
      version,
      editor,
      note: input.note ?? null,
      fields,
      createdAt: now,
    };
    await saveStudioVersion(entry);
  }

  return { itemId: input.id, version };
}

async function writeThrough(
  id: string,
  kind: StudioEntityKind,
  fields: StudioEditFields,
  nowIso: string,
): Promise<void> {
  if (kind === "lesson" && id.startsWith("lesson:")) {
    const lessonId = id.slice("lesson:".length);
    const lessons = await listLessons();
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    const next = parseLessonDocument({
      ...lesson,
      title: fields.title,
      slug: fields.slug ?? lesson.slug,
      objective: fields.objective ?? fields.summary ?? lesson.objective,
      estimatedMinutes: fields.estimatedMinutes ?? lesson.estimatedMinutes,
      status: fields.status ?? lesson.status,
      updatedAt: nowIso,
    });
    await saveLesson(next);
    return;
  }

  if (kind === "work" && id.startsWith("work:")) {
    const workId = id.slice("work:".length);
    const works = await listLiteraryWorks();
    const work = works.find((w) => w.id === workId);
    if (!work) return;
    await saveLiteraryWork({
      ...work,
      title: fields.title,
      slug: fields.slug ?? work.slug,
      author: fields.authorName ?? work.author,
      summary: fields.summary ?? work.summary,
      updatedAt: nowIso,
    });
    return;
  }

  if (kind === "flashcard" && id.startsWith("flashcard:")) {
    const cardId = id.slice("flashcard:".length);
    const decks = await listFlashcardDecks();
    for (const deck of decks) {
      const idx = deck.cards.findIndex((c) => c.id === cardId);
      if (idx < 0) continue;
      const cards = [...deck.cards];
      const prev = cards[idx]!;
      cards[idx] = {
        ...prev,
        front: fields.prompt ?? fields.title,
        back: fields.answer ?? prev.back,
        slug: fields.slug ?? prev.slug,
      };
      await saveFlashcardDeck({ ...deck, cards, updatedAt: nowIso });
      return;
    }
  }

  if (kind === "question" && id.startsWith("question:")) {
    const qId = id.slice("question:".length);
    const packs = await listQuestionPacks();
    for (const pack of packs) {
      const idx = pack.questions.findIndex((q) => q.id === qId);
      if (idx < 0) continue;
      const questions = [...pack.questions];
      const prev = questions[idx]!;
      questions[idx] = {
        ...prev,
        stem: fields.prompt ?? fields.title,
        explanation:
          (fields.answer && fields.answer.length >= 40
            ? fields.answer
            : prev.explanation) ?? prev.explanation,
      };
      await saveQuestionPack({ ...pack, questions, updatedAt: nowIso });
      return;
    }
  }
}

export async function createStudioExercise(input: {
  title: string;
  prompt: string;
  answer: string;
  editor: string;
  sourceFilename?: string | null;
  sourceExcerpt?: string | null;
}): Promise<string> {
  const id = `exercise:${randomUUID()}`;
  const now = new Date().toISOString();
  const fields = parseStudioEditFields({
    title: input.title,
    slug: null,
    summary: input.prompt.slice(0, 200),
    status: "draft",
    prompt: input.prompt,
    answer: input.answer,
    sourceFilename: input.sourceFilename ?? null,
    sourceExcerpt: input.sourceExcerpt ?? excerpt(input.prompt),
  });
  await saveStudioOverride({
    id,
    kind: "exercise",
    fields,
    lastEditor: input.editor.trim() || "admin",
    updatedAt: now,
  });
  await saveStudioVersion({
    id: randomUUID(),
    entityId: id,
    kind: "exercise",
    version: 1,
    editor: input.editor.trim() || "admin",
    note: "create",
    fields,
    createdAt: now,
  });
  return id;
}

export async function bulkUpdateStudioStatus(input: {
  ids: string[];
  status: PublishStatus;
  editor: string;
}): Promise<{ updated: number }> {
  const now = new Date().toISOString();
  const editor = input.editor.trim() || "admin";
  let updated = 0;
  for (const id of input.ids) {
    const got = await getStudioItem(id);
    if (!got) continue;
    const fields = parseStudioEditFields({
      ...got.fields,
      status: input.status,
    });
    await saveStudioItem({
      id,
      kind: got.item.kind,
      fields,
      editor,
      note: `bulk → ${input.status}`,
    });
    updated += 1;
  }
  void now;
  return { updated };
}

export async function buildLessonPreview(
  lessonIdOrSlug: string,
): Promise<StudioLessonPreview | null> {
  const lessons = await listLessons();
  let lesson =
    lessons.find((l) => l.id === lessonIdOrSlug) ??
    lessons.find((l) => l.slug === lessonIdOrSlug) ??
    null;
  if (!lesson && lessonIdOrSlug.startsWith("lesson:")) {
    const id = lessonIdOrSlug.slice("lesson:".length);
    lesson = lessons.find((l) => l.id === id) ?? null;
  }
  if (!lesson) {
    lesson = (await getLessonBySlug(lessonIdOrSlug)) ?? null;
  }
  if (!lesson) return null;

  const ov = (await getStudioOverrides()).find(
    (o) => o.id === `lesson:${lesson!.id}`,
  );

  return {
    lessonId: lesson.id,
    title: ov?.fields.title ?? lesson.title,
    objective: ov?.fields.objective ?? ov?.fields.summary ?? lesson.objective,
    estimatedMinutes:
      ov?.fields.estimatedMinutes ?? lesson.estimatedMinutes,
    blocks: lesson.blocks.map((b) => ({
      type: b.type,
      labelCs: b.type.replace(/_/g, " "),
      text: blockPreviewText(b),
    })),
    noteCs: "Náhled studentova pohledu — bloky v pořadí lekce (bez grading UI).",
  };
}

function blockPreviewText(block: { type: string; [key: string]: unknown }): string {
  const b = block as Record<string, unknown>;
  if (typeof b.prompt === "string") return b.prompt;
  if (typeof b.question === "string") return b.question;
  if (Array.isArray(b.paragraphs)) return (b.paragraphs as string[]).join(" ");
  if (Array.isArray(b.bullets)) return (b.bullets as string[]).join(" · ");
  if (typeof b.title === "string") return b.title;
  return block.type;
}
