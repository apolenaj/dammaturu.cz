import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStudyMaterialById } from "@/server/dashboard/study-materials";
import { extractTextFromUserMaterialFile } from "@/server/dashboard/extract-user-material";

const bodySchema = z.object({
  materialId: z.string().uuid(),
});

/**
 * POST /api/materials/extract
 * Stáhne soubor materiálu ze Supabase Storage a vrátí extrahovaný text.
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Neplatné JSON tělo požadavku." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Chybí platné materialId." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Musíš být přihlášený." },
      { status: 401 },
    );
  }

  const material = await getStudyMaterialById(
    supabase,
    parsed.data.materialId,
  );

  if (!material) {
    return NextResponse.json(
      { ok: false, error: "Materiál nebyl nalezen." },
      { status: 404 },
    );
  }

  if (material.type !== "user" || material.user_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: "K tomuto materiálu nemáš přístup." },
      { status: 403 },
    );
  }

  if (!material.file_url) {
    return NextResponse.json(
      { ok: false, error: "Materiál nemá připojený soubor." },
      { status: 400 },
    );
  }

  const extracted = await extractTextFromUserMaterialFile({
    supabase,
    fileUrl: material.file_url,
  });

  if (!extracted.ok) {
    return NextResponse.json(
      { ok: false, error: extracted.error, code: extracted.code },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    text: extracted.text,
    truncated: extracted.truncated,
    charCount: extracted.charCount,
    format: extracted.format,
  });
}
