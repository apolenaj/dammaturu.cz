import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureGuestLearner } from "@/server/guest/ensure-guest-learner";
import { getViewerSession } from "@/server/viewer-session";
import { getLearnerMaterial } from "@/server/learner-materials/store";
import { collectMaterialTopics } from "@/server/learner-materials/materials-session-build";
import { assertSameOriginRequest } from "@/server/security/upload-validation";

export const runtime = "nodejs";

const bodySchema = z.object({
  materialIds: z.array(z.string().min(1).max(120)).min(1).max(8),
});

/** Topics for study picker — fetch API avoids Server Action loading.tsx trap. */
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
      { ok: false, error: "Neplatná data." },
      { status: 400 },
    );
  }

  const materials = [];
  for (const id of [...new Set(parsed.data.materialIds)].slice(0, 8)) {
    const m = await getLearnerMaterial(viewer.learnerId, id);
    if (m?.status === "ready") materials.push(m);
  }
  if (!materials.length) {
    return NextResponse.json(
      { ok: false, error: "Vyber připravené materiály." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    topics: collectMaterialTopics(materials),
  });
}
