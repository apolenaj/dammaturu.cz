import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  schoolExamDocKinds,
  schoolExamDocKindLabelsCs,
  schoolExamProfileConfig,
  type SchoolExamDocKind,
} from "@/domain/learning/school-exam-profile";
import { ensureGuestLearner } from "@/server/guest/ensure-guest-learner";
import { getViewerSession } from "@/server/viewer-session";
import { getLearner } from "@/server/learner-store";
import { addSchoolExamDocument } from "@/server/school-exam-profile/store";
import { track } from "@/lib/analytics";
import {
  assertSameOriginRequest,
  validateUploadedMaterial,
} from "@/server/security/upload-validation";
import {
  clientIpFromHeaders,
  rateLimit,
} from "@/server/security/rate-limit";
import { clientSafeError } from "@/lib/security/hardening";

export const runtime = "nodejs";

function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, "").trim().slice(0, 240) || "Bez názvu";
}

/**
 * Upload school / student maturity documents into School Exam Profile.
 * Kind is required so source layer (Škola vs Moje materiály) stays explicit.
 */
export async function POST(request: Request) {
  if (!assertSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Požadavek byl odmítnut." },
      { status: 403 },
    );
  }

  const viewer = await getViewerSession({ createGuestIfMissing: true });
  if (!viewer) {
    return NextResponse.json(
      { ok: false, error: "Nepodařilo se připravit studijní session." },
      { status: 401 },
    );
  }
  if (viewer.kind === "guest") {
    await ensureGuestLearner(viewer.learnerId);
  }

  const ip = clientIpFromHeaders(request.headers);
  const limited = rateLimit({
    key: `upload:school-exam:${viewer.learnerId}:${ip}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Příliš mnoho nahrání. Chvíli počkej." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let learner = await getLearner(viewer.learnerId);
  if (!learner) {
    learner = await ensureGuestLearner(viewer.learnerId);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Soubor se nepodařilo načíst." },
      { status: 400 },
    );
  }

  const kindRaw = form.get("kind");
  const kind =
    typeof kindRaw === "string" &&
    (schoolExamDocKinds as readonly string[]).includes(kindRaw)
      ? (kindRaw as SchoolExamDocKind)
      : null;
  if (!kind) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Vyber typ dokumentu (školní požadavky, seznam literatury, …) — bez typu nemícháme zdroje.",
      },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Chybí soubor." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > schoolExamProfileConfig.maxFileBytes) {
    return NextResponse.json(
      { ok: false, error: "Soubor je příliš velký." },
      { status: 400 },
    );
  }

  const sniffed = validateUploadedMaterial({
    filename: file.name,
    declaredMime: file.type || "application/octet-stream",
    buffer,
  });
  if (!sniffed.ok) {
    return NextResponse.json(
      { ok: false, error: sniffed.errorCs },
      { status: 400 },
    );
  }

  const titleOverride = form.get("title");
  const title =
    typeof titleOverride === "string" && titleOverride.trim()
      ? titleOverride.trim().slice(0, 240)
      : titleFromFilename(file.name) || schoolExamDocKindLabelsCs[kind];

  const noteRaw = form.get("note");
  const noteCs =
    typeof noteRaw === "string" && noteRaw.trim()
      ? noteRaw.trim().slice(0, 500)
      : undefined;

  try {
    const { document, profile } = await addSchoolExamDocument({
      learnerId: viewer.learnerId,
      schoolType: learner.profile.schoolType,
      kind,
      title,
      originalFilename: file.name.slice(0, 240),
      format: sniffed.format,
      mimeType: sniffed.mime,
      buffer,
      noteCs,
    });

    track("school_exam_document_uploaded", {
      kind,
      source: document.source,
      format: sniffed.format,
    });

    revalidatePath("/app/exam-profile");
    revalidatePath("/app/profile");

    return NextResponse.json({
      ok: true,
      document,
      completenessPct: undefined,
      documentCount: profile.documents.length,
    });
  } catch (error) {
    console.error("[school-exam/upload] failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: clientSafeError(
          error,
          "Nahrání se nepovedlo. Zkus to prosím znovu.",
        ),
      },
      { status: 500 },
    );
  }
}
