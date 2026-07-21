"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import {
  buildSchoolExamProfileView,
  type SchoolExamDocKind,
  type SchoolExamProfileView,
  type SelectedBook,
} from "@/domain/learning/school-exam-profile";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";
import {
  getOrCreateSchoolExamProfile,
  removeSchoolExamDocument,
  updateSchoolExamMeta,
} from "@/server/school-exam-profile/store";

type Fail = { ok: false; error: string };

export async function getSchoolExamProfileAction(): Promise<{
  view: SchoolExamProfileView | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  if (!learnerId) return { view: null, learnerId: null };
  const learner = await getLearner(learnerId);
  if (!learner) return { view: null, learnerId };

  const profile = await getOrCreateSchoolExamProfile({
    learnerId,
    schoolType: learner.profile.schoolType,
  });
  return { view: buildSchoolExamProfileView(profile), learnerId };
}

export async function updateSchoolExamMetaAction(input: {
  schoolName?: string | null;
  studentNotesCs?: string | null;
  selectedBooks?: SelectedBook[];
}): Promise<{ ok: true; view: SchoolExamProfileView } | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const learner = await getLearner(learnerId);
    if (!learner) return { ok: false, error: "Profil nenalezen." };

    const profile = await updateSchoolExamMeta({
      learnerId,
      schoolType: learner.profile.schoolType,
      schoolName: input.schoolName,
      studentNotesCs: input.studentNotesCs,
      selectedBooks: input.selectedBooks,
    });
    track("school_exam_profile_updated", {
      books: profile.selectedBooks.length,
      docs: profile.documents.length,
    });
    revalidatePath("/app/exam-profile");
    revalidatePath("/app/profile");
    return { ok: true, view: buildSchoolExamProfileView(profile) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function deleteSchoolExamDocumentAction(input: {
  documentId: string;
}): Promise<{ ok: true; view: SchoolExamProfileView } | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const profile = await removeSchoolExamDocument({
      learnerId,
      documentId: input.documentId,
    });
    track("school_exam_document_deleted", { documentId: input.documentId });
    revalidatePath("/app/exam-profile");
    return { ok: true, view: buildSchoolExamProfileView(profile) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Used by upload route after file save — re-export kind type for clients. */
export type { SchoolExamDocKind };
