import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  isSupportedFormat,
  toListItem,
} from "@/domain/learning/learner-materials";
import { getAuthIdentity } from "@/server/learner-session";
import { canUploadMaterial } from "@/domain/billing/entitlements";
import { getLearnerEntitlements } from "@/server/billing/entitlements";
import { formatReadyStatusMessage } from "@/server/learner-materials/pipeline/diagnostics";
import { processLearnerMaterial } from "@/server/learner-materials/process";
import {
  createUploadingMaterial,
  listLearnerMaterials,
  updateMaterialStatus,
} from "@/server/learner-materials/store";
import { dateKeyFromDate } from "@/domain/learning/daily-dashboard";
import { recordProductEvent } from "@/server/product-analytics/store";
import {
  assertSameOriginRequest,
  validateUploadedMaterial,
} from "@/server/security/upload-validation";
import {
  clientIpFromHeaders,
  rateLimit,
} from "@/server/security/rate-limit";
import { detectPromptInjectionSignals } from "@/lib/security/hardening";

export const runtime = "nodejs";

function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, "").trim().slice(0, 240) || "Bez názvu";
}

/**
 * Multipart upload for Moje materiály.
 * Auth via session cookies. Processes immediately after save.
 */
export async function POST(request: Request) {
  if (!assertSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Požadavek byl odmítnut." },
      { status: 403 },
    );
  }

  const identity = await getAuthIdentity();
  if (!identity) {
    return NextResponse.json(
      { ok: false, error: "Nejdřív se přihlas." },
      { status: 401 },
    );
  }

  const ip = clientIpFromHeaders(request.headers);
  const limited = rateLimit({
    key: `upload:materials:${identity.learnerId}:${ip}`,
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

  const entitlements = await getLearnerEntitlements(identity.learnerId);
  const existing = await listLearnerMaterials(identity.learnerId);
  const todayKey = dateKeyFromDate(new Date());
  const uploadsToday = existing.filter((m) =>
    m.createdAt.startsWith(todayKey),
  ).length;
  const uploadGate = canUploadMaterial({
    features: entitlements.features,
    currentMaterialCount: existing.length,
    uploadsToday,
    limits: entitlements.limits,
  });
  if (!uploadGate.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: uploadGate.reasonCs,
        code: uploadGate.code,
        personalDataReadable: true,
      },
      { status: 403 },
    );
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

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Chybí soubor." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
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

  if (!isSupportedFormat(sniffed.format)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Obrázky a PPTX připravujeme. Teď umíme PDF, DOCX a TXT.",
      },
      { status: 400 },
    );
  }

  if (sniffed.format === "txt") {
    const signals = detectPromptInjectionSignals(buffer.toString("utf8"));
    if (signals.length > 0) {
      console.warn("[materials/upload] injection signals", {
        learner: identity.learnerId.slice(0, 8),
        signals,
      });
    }
  }

  const titleOverride = form.get("title");
  const title =
    typeof titleOverride === "string" && titleOverride.trim()
      ? titleOverride.trim().slice(0, 240)
      : titleFromFilename(file.name);

  try {
    const created = await createUploadingMaterial({
      learnerId: identity.learnerId,
      title,
      originalFilename: file.name.slice(0, 240),
      format: sniffed.format,
      mimeType: sniffed.mime,
      buffer,
    });

    if (created.kind === "duplicate") {
      const existingMat = created.material;
      const statusMessage =
        existingMat.status === "ready"
          ? `${formatReadyStatusMessage(
              existingMat.topicCount || existingMat.diagnostics?.topicCount || 0,
              existingMat.knowledgePointCount ||
                existingMat.chunkCount ||
                existingMat.diagnostics?.knowledgePointCount ||
                0,
            )} (tento soubor už máš nahraný.)`
          : `Tento soubor už máš nahraný${
              existingMat.statusMessage
                ? ` — ${existingMat.statusMessage}`
                : "."
            }`;

      return NextResponse.json({
        ok: true,
        duplicate: true,
        material: toListItem({
          ...existingMat,
          statusMessage,
          duplicateOfId: existingMat.id,
        }),
      });
    }

    await updateMaterialStatus(identity.learnerId, created.material.id, {
      status: "processing",
      statusMessage: null,
    });

    const processing = {
      ...created.material,
      status: "processing" as const,
      updatedAt: new Date().toISOString(),
    };

    const processed = await processLearnerMaterial(processing);

    await recordProductEvent({
      learnerKey: identity.learnerId,
      event: "document_uploaded",
      featureId: "personal_materials",
    });

    revalidatePath("/app/materials");
    revalidatePath("/app/plan");

    return NextResponse.json({
      ok: true,
      material: toListItem(processed),
    });
  } catch (error) {
    console.error("[materials/upload] failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Nahrání se nepovedlo. Zkus to prosím znovu.",
      },
      { status: 500 },
    );
  }
}
