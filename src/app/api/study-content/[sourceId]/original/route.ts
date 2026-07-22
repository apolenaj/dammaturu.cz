import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getOriginalSourceAbsolutePath } from "@/server/study-content/registry";
import { getViewerSession } from "@/server/viewer-session";

export const runtime = "nodejs";

type Params = { params: Promise<{ sourceId: string }> };

/**
 * Serve the original DOCX for “Zobrazit původní materiál”.
 * Only catalog sourceIds; never invents content.
 */
export async function GET(_request: Request, { params }: Params) {
  const viewer = await getViewerSession({ createGuestIfMissing: true });
  if (!viewer) {
    return NextResponse.json(
      { ok: false, error: "Nepodařilo se připravit session." },
      { status: 401 },
    );
  }

  const { sourceId } = await params;
  if (!/^[a-z0-9-]{3,80}$/.test(sourceId)) {
    return NextResponse.json({ ok: false, error: "Neplatné id." }, { status: 400 });
  }

  const abs = await getOriginalSourceAbsolutePath(sourceId);
  if (!abs) {
    return NextResponse.json(
      { ok: false, error: "Původní soubor není k dispozici." },
      { status: 404 },
    );
  }

  const buf = await fs.readFile(abs);
  const filename = path.basename(abs);
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "cache-control": "private, max-age=3600",
    },
  });
}
