"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import {
  bulkActionToStatus,
  filterStudioItems,
  studioBulkActions,
  studioEntityKinds,
  type StudioBulkAction,
  type StudioEditFields,
  type StudioEntityKind,
  type StudioLessonPreview,
  type StudioListItem,
  type StudioVersionEntry,
  type StudioVerificationStatus,
} from "@/domain/admin/content-studio";
import { publishStatuses } from "@/domain/content/schemas";
import {
  buildLessonPreview,
  buildStudioCatalog,
  bulkUpdateStudioStatus,
  createStudioExercise,
  getStudioItem,
  saveStudioItem,
} from "@/server/content-studio/catalog";
import { listStudioVersions } from "@/server/content-studio/store";
import { assertAdmin } from "@/server/admin-auth";

export async function getContentStudioCatalogAction(input?: {
  kind?: StudioEntityKind | "all";
  q?: string;
  verification?: StudioVerificationStatus | "all";
  status?: (typeof publishStatuses)[number] | "all";
}): Promise<{
  items: StudioListItem[];
  countsByKind: Record<string, number>;
  generatedAt: string;
}> {
  const gate = await assertAdmin();
  if (!gate.ok) {
    return { items: [], countsByKind: {}, generatedAt: new Date().toISOString() };
  }
  const catalog = await buildStudioCatalog();
  const items = filterStudioItems(catalog.items, {
    kind: input?.kind ?? "all",
    q: input?.q,
    verification: input?.verification ?? "all",
    status: input?.status ?? "all",
  });
  track("content_studio_catalog_viewed", {
    total: catalog.items.length,
    filtered: items.length,
  });
  return {
    items,
    countsByKind: catalog.countsByKind,
    generatedAt: catalog.generatedAt,
  };
}

export async function getContentStudioItemAction(input: {
  id: string;
}): Promise<{
  item: StudioListItem;
  fields: StudioEditFields;
  versions: StudioVersionEntry[];
} | null> {
  const gate = await assertAdmin();
  if (!gate.ok) return null;
  const got = await getStudioItem(input.id);
  if (!got) return null;
  const versions = await listStudioVersions(input.id);
  return { ...got, versions };
}

export async function saveContentStudioItemAction(input: {
  id: string;
  kind: StudioEntityKind;
  fields: StudioEditFields;
  editor: string;
  note?: string | null;
}): Promise<{ ok: true; version: number | null } | { ok: false; error: string }> {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return gate;
    if (!studioEntityKinds.includes(input.kind)) {
      return { ok: false, error: "Neplatný typ entity." };
    }
    const result = await saveStudioItem({
      id: input.id,
      kind: input.kind,
      fields: input.fields,
      editor: input.editor,
      note: input.note,
    });
    track("content_studio_saved", { kind: input.kind, id: input.id });
    revalidatePath("/admin/content");
    return { ok: true, version: result.version };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function createContentStudioExerciseAction(input: {
  title: string;
  prompt: string;
  answer: string;
  editor: string;
  sourceFilename?: string | null;
  sourceExcerpt?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return gate;
    if (input.title.trim().length < 2 || input.prompt.trim().length < 4) {
      return { ok: false, error: "Title a prompt jsou povinné." };
    }
    const id = await createStudioExercise(input);
    track("content_studio_exercise_created", { id });
    revalidatePath("/admin/content");
    return { ok: true, id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function bulkContentStudioAction(input: {
  ids: string[];
  action: StudioBulkAction;
  editor: string;
}): Promise<{ ok: true; updated: number } | { ok: false; error: string }> {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return gate;
    if (!studioBulkActions.includes(input.action)) {
      return { ok: false, error: "Neplatná bulk akce." };
    }
    if (input.ids.length === 0) {
      return { ok: false, error: "Nic nevybráno." };
    }
    if (input.ids.length > 100) {
      return { ok: false, error: "Max 100 položek najednou." };
    }
    const status = bulkActionToStatus(input.action);
    const { updated } = await bulkUpdateStudioStatus({
      ids: input.ids,
      status,
      editor: input.editor,
    });
    track("content_studio_bulk", {
      action: input.action,
      updated,
    });
    revalidatePath("/admin/content");
    return { ok: true, updated };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getLessonStudentPreviewAction(input: {
  lessonId: string;
}): Promise<{ preview: StudioLessonPreview | null }> {
  const gate = await assertAdmin();
  if (!gate.ok) return { preview: null };
  const preview = await buildLessonPreview(input.lessonId);
  return { preview };
}
