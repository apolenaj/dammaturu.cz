import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureGuestLearner } from "@/server/guest/ensure-guest-learner";
import { getViewerSession } from "@/server/viewer-session";
import { getLearnerMaterial } from "@/server/learner-materials/store";
import { buildMaterialsStudySession } from "@/server/learner-materials/materials-session-build";
import { snapshotMasteryScores } from "@/server/materials-study/session-runtime";
import { assertSameOriginRequest } from "@/server/security/upload-validation";
import {
  clientIpFromHeaders,
  rateLimit,
} from "@/server/security/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  materialIds: z.array(z.string().min(1).max(120)).min(1).max(8),
  mode: z.enum(["topic", "smart_mix"]),
  topic: z.string().trim().min(1).max(200).nullable().optional(),
});

/**
 * Start a materials study session without Server Action RSC refresh.
 * Avoids App Router loading.tsx swallowing the client after startTransition/action.
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
    key: `study-start:${viewer.learnerId}:${ip}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Příliš mnoho pokusů. Chvíli počkej." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Neplatný požadavek." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Neplatná data sesitu." },
      { status: 400 },
    );
  }

  const { materialIds, mode, topic } = parsed.data;
  if (mode === "topic" && !topic?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Vyber téma, nebo zapni chytrý mix." },
      { status: 400 },
    );
  }

  const ids = [...new Set(materialIds)].slice(0, 8);
  const materials = [];
  for (const id of ids) {
    const m = await getLearnerMaterial(viewer.learnerId, id);
    if (!m) {
      return NextResponse.json(
        { ok: false, error: "Některý materiál se nepodařilo načíst." },
        { status: 400 },
      );
    }
    if (m.status !== "ready") {
      return NextResponse.json(
        {
          ok: false,
          error: `„${m.title}“ ještě není připravený ke studiu.`,
        },
        { status: 400 },
      );
    }
    materials.push(m);
  }

  const kuIds = materials.flatMap((m) =>
    (m.knowledgeUnits ?? []).map((u) => u.id),
  );
  const masteryBefore = await snapshotMasteryScores(viewer.learnerId, kuIds);

  try {
    const session = buildMaterialsStudySession({
      learnerId: viewer.learnerId,
      materials,
      mode,
      topic: topic ?? null,
      masteryBefore,
    });
    return NextResponse.json({ ok: true, session });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error:
          e instanceof Error ? e.message : "Sesit se nepodařilo sestavit.",
      },
      { status: 400 },
    );
  }
}
