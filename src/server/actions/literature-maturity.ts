"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import {
  buildLiteratureHubView,
  drawLiteratureBook,
  literatureFieldKeys,
  toLiteratureBookListItem,
  type LiteratureBook,
  type LiteratureFieldKey,
  type LiteratureMaturityHubView,
} from "@/domain/learning/literature-maturity";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  addLiteratureBook,
  getLiteratureBook,
  getOrCreateLiteratureList,
  importFromMaterialKnowledge,
  practiceLiteratureBook,
  removeLiteratureBook,
  syncFromExamProfileBooks,
  updateLiteratureBookField,
} from "@/server/literature-maturity/store";
import { getSchoolExamProfile } from "@/server/school-exam-profile/store";
import {
  getLearnerMaterial,
  listLearnerMaterials,
} from "@/server/learner-materials/store";

type Fail = { ok: false; error: string };

export async function getLiteratureHubAction(input?: {
  drawnBookId?: string | null;
}): Promise<{
  view: LiteratureMaturityHubView | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { view: null, learnerId: null };
  const list = await getOrCreateLiteratureList(learnerId);
  return {
    view: buildLiteratureHubView({
      list,
      drawnBookId: input?.drawnBookId,
    }),
    learnerId,
  };
}

export async function getLiteratureBookAction(input: {
  bookId: string;
}): Promise<{ book: LiteratureBook | null; learnerId: string | null }> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { book: null, learnerId: null };
  const book = await getLiteratureBook({
    learnerId,
    bookId: input.bookId,
  });
  return { book, learnerId };
}

export async function addLiteratureBookAction(input: {
  titleCs: string;
  authorCs?: string;
}): Promise<{ ok: true; book: LiteratureBook; view: LiteratureMaturityHubView } | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const title = input.titleCs.trim();
    if (!title) return { ok: false, error: "Zadej název knihy." };
    const book = await addLiteratureBook({
      learnerId,
      titleCs: title,
      authorCs: input.authorCs?.trim() || null,
    });
    track("literature_book_added", { slug: book.slug });
    revalidatePath("/app/literature");
    const list = await getOrCreateLiteratureList(learnerId);
    return {
      ok: true,
      book,
      view: buildLiteratureHubView({ list }),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function updateLiteratureFieldAction(input: {
  bookId: string;
  key: LiteratureFieldKey;
  valueCs: string;
}): Promise<{ ok: true; book: LiteratureBook } | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    if (!(literatureFieldKeys as readonly string[]).includes(input.key)) {
      return { ok: false, error: "Neplatné pole." };
    }
    const book = await updateLiteratureBookField({
      learnerId,
      bookId: input.bookId,
      key: input.key,
      valueCs: input.valueCs,
    });
    revalidatePath("/app/literature");
    revalidatePath(`/app/literature/${input.bookId}`);
    return { ok: true, book };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function removeLiteratureBookAction(input: {
  bookId: string;
}): Promise<{ ok: true; view: LiteratureMaturityHubView } | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const list = await removeLiteratureBook({
      learnerId,
      bookId: input.bookId,
    });
    revalidatePath("/app/literature");
    return { ok: true, view: buildLiteratureHubView({ list }) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function drawLiteratureBookAction(): Promise<
  | {
      ok: true;
      book: ReturnType<typeof toLiteratureBookListItem>;
      view: LiteratureMaturityHubView;
    }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const list = await getOrCreateLiteratureList(learnerId);
    const drawn = drawLiteratureBook(list.books);
    if (!drawn) {
      return { ok: false, error: "Nejdřív přidej aspoň jednu knihu." };
    }
    await practiceLiteratureBook({ learnerId, bookId: drawn.id });
    track("literature_book_drawn", { slug: drawn.slug });
    const refreshed = await getOrCreateLiteratureList(learnerId);
    const view = buildLiteratureHubView({
      list: refreshed,
      drawnBookId: drawn.id,
    });
    revalidatePath("/app/literature");
    return {
      ok: true,
      book: toLiteratureBookListItem(
        refreshed.books.find((b) => b.id === drawn.id) ?? drawn,
      ),
      view,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function importLiteratureFromExamProfileAction(): Promise<
  | { ok: true; added: number; view: LiteratureMaturityHubView }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const exam = await getSchoolExamProfile(learnerId);
    const selected = exam?.selectedBooks ?? [];
    if (selected.length === 0) {
      return {
        ok: false,
        error: "V Profilu maturity zatím nemáš vybrané knihy.",
      };
    }
    const { list, added } = await syncFromExamProfileBooks({
      learnerId,
      selectedBooks: selected,
    });
    track("literature_imported_exam_profile", { added });
    revalidatePath("/app/literature");
    return { ok: true, added, view: buildLiteratureHubView({ list }) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function importLiteratureFromMaterialsAction(): Promise<
  | { ok: true; booksTouched: number; view: LiteratureMaturityHubView }
  | Fail
> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const items = await listLearnerMaterials(learnerId);
    const ready = items.filter((m) => m.status === "ready");
    const materials = [];
    for (const item of ready) {
      const full = await getLearnerMaterial(learnerId, item.id);
      if (full) materials.push(full);
    }
    const { list, booksTouched } = await importFromMaterialKnowledge({
      learnerId,
      materials,
    });
    track("literature_imported_materials", { booksTouched });
    revalidatePath("/app/literature");
    if (booksTouched === 0) {
      return {
        ok: false,
        error:
          "V materiálech jsem nenašel/a označená literární díla (pole literaryWork v KU). Nahraj poznámky k dílům nebo přidej knihy ručně.",
      };
    }
    return {
      ok: true,
      booksTouched,
      view: buildLiteratureHubView({ list }),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function practiceLiteratureBookAction(input: {
  bookId: string;
}): Promise<{ ok: true; book: LiteratureBook } | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const book = await practiceLiteratureBook({
      learnerId,
      bookId: input.bookId,
    });
    revalidatePath("/app/literature");
    revalidatePath(`/app/literature/${input.bookId}`);
    return { ok: true, book };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
