import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  assertDocKindSource,
  emptySchoolExamProfile,
  schoolExamDocumentSchema,
  schoolExamProfileSchema,
  schoolExamDocKindSource,
  requirementSourceLabelsCs,
  schoolExamProfileConfig,
  type SchoolExamDocKind,
  type SchoolExamDocument,
  type SchoolExamProfile,
  type SelectedBook,
} from "@/domain/learning/school-exam-profile";
import type { OnboardingInput } from "@/domain/onboarding/schema";
import { assertSafeId } from "@/server/safe-id";

const ROOT = path.join(process.cwd(), "data", "school-exam-profiles");

function profilePath(learnerId: string): string {
  assertSafeId(learnerId, "learner id");
  return path.join(ROOT, `${learnerId}.json`);
}

function filesDir(learnerId: string): string {
  assertSafeId(learnerId, "learner id");
  return path.join(ROOT, learnerId, "files");
}

async function ensureDirs(learnerId: string): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
  await fs.mkdir(filesDir(learnerId), { recursive: true });
}

export function sha256Buffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export async function getSchoolExamProfile(
  learnerId: string,
): Promise<SchoolExamProfile | null> {
  try {
    const raw = JSON.parse(await fs.readFile(profilePath(learnerId), "utf8"));
    return schoolExamProfileSchema.parse(raw);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveSchoolExamProfile(
  profile: SchoolExamProfile,
): Promise<void> {
  const validated = schoolExamProfileSchema.parse(profile);
  await ensureDirs(validated.learnerId);
  const file = profilePath(validated.learnerId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function getOrCreateSchoolExamProfile(input: {
  learnerId: string;
  schoolType: OnboardingInput["schoolType"];
}): Promise<SchoolExamProfile> {
  const existing = await getSchoolExamProfile(input.learnerId);
  if (existing) {
    if (existing.schoolType !== input.schoolType) {
      const next = {
        ...existing,
        schoolType: input.schoolType,
        updatedAt: new Date().toISOString(),
      };
      await saveSchoolExamProfile(next);
      return next;
    }
    return existing;
  }
  const now = new Date().toISOString();
  const profile = emptySchoolExamProfile(
    input.learnerId,
    input.schoolType,
    now,
  );
  await saveSchoolExamProfile(profile);
  return profile;
}

function extensionForFormat(format: "pdf" | "docx" | "txt"): string {
  return format;
}

export async function addSchoolExamDocument(input: {
  learnerId: string;
  schoolType: OnboardingInput["schoolType"];
  kind: SchoolExamDocKind;
  title: string;
  originalFilename: string;
  format: "pdf" | "docx" | "txt";
  mimeType: string;
  buffer: Buffer;
  noteCs?: string;
}): Promise<{ profile: SchoolExamProfile; document: SchoolExamDocument }> {
  const source = schoolExamDocKindSource[input.kind];
  assertDocKindSource(input.kind, source);

  if (input.buffer.byteLength > schoolExamProfileConfig.maxFileBytes) {
    throw new Error("Soubor je příliš velký.");
  }
  if (
    !(schoolExamProfileConfig.supportedFormats as readonly string[]).includes(
      input.format,
    )
  ) {
    throw new Error("Nepodporovaný formát. Povoleno: PDF, DOCX, TXT.");
  }

  const profile = await getOrCreateSchoolExamProfile({
    learnerId: input.learnerId,
    schoolType: input.schoolType,
  });

  if (profile.documents.length >= schoolExamProfileConfig.maxDocuments) {
    throw new Error("Dosáhl/a jsi limitu dokumentů v profilu maturity.");
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const contentSha256 = sha256Buffer(input.buffer);
  const storageFilename = `${id}.${extensionForFormat(input.format)}`;

  await ensureDirs(input.learnerId);
  await fs.writeFile(
    path.join(filesDir(input.learnerId), storageFilename),
    input.buffer,
  );

  const document = schoolExamDocumentSchema.parse({
    id,
    kind: input.kind,
    source,
    sourceLabelCs: requirementSourceLabelsCs[source],
    title: input.title.slice(0, 240),
    originalFilename: input.originalFilename.slice(0, 500),
    format: input.format,
    mimeType: input.mimeType.slice(0, 120),
    byteSize: input.buffer.byteLength,
    contentSha256,
    storageFilename,
    status: "ready",
    statusMessage: null,
    noteCs: input.noteCs?.slice(0, 500),
    createdAt: now,
    updatedAt: now,
  });

  const next: SchoolExamProfile = {
    ...profile,
    documents: [...profile.documents, document],
    updatedAt: now,
  };
  await saveSchoolExamProfile(next);
  return { profile: next, document };
}

export async function removeSchoolExamDocument(input: {
  learnerId: string;
  documentId: string;
}): Promise<SchoolExamProfile> {
  const profile = await getSchoolExamProfile(input.learnerId);
  if (!profile) throw new Error("Profil maturity nenalezen.");
  const doc = profile.documents.find((d) => d.id === input.documentId);
  if (!doc) throw new Error("Dokument nenalezen.");

  try {
    await fs.unlink(path.join(filesDir(input.learnerId), doc.storageFilename));
  } catch {
    // file may already be gone
  }

  const now = new Date().toISOString();
  const next: SchoolExamProfile = {
    ...profile,
    documents: profile.documents.filter((d) => d.id !== input.documentId),
    updatedAt: now,
  };
  await saveSchoolExamProfile(next);
  return next;
}

export async function updateSchoolExamMeta(input: {
  learnerId: string;
  schoolType: OnboardingInput["schoolType"];
  schoolName?: string | null;
  studentNotesCs?: string | null;
  selectedBooks?: SelectedBook[];
}): Promise<SchoolExamProfile> {
  const profile = await getOrCreateSchoolExamProfile({
    learnerId: input.learnerId,
    schoolType: input.schoolType,
  });
  const now = new Date().toISOString();
  const books = input.selectedBooks
    ? input.selectedBooks.slice(0, schoolExamProfileConfig.maxSelectedBooks)
    : profile.selectedBooks;
  const next: SchoolExamProfile = {
    ...profile,
    schoolName:
      input.schoolName !== undefined
        ? input.schoolName?.trim().slice(0, 240) || null
        : profile.schoolName,
    studentNotesCs:
      input.studentNotesCs !== undefined
        ? input.studentNotesCs?.trim().slice(0, 2000) || null
        : profile.studentNotesCs,
    selectedBooks: books,
    updatedAt: now,
  };
  await saveSchoolExamProfile(next);
  return next;
}
