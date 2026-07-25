import type { SupabaseClient } from "@supabase/supabase-js";
import mammoth from "mammoth";
import { STUDY_MATERIALS_BUCKET } from "@/domain/dashboard/study-materials";
import { isMalformedPdfError } from "@/server/learner-materials/pipeline/extract";

export type ExtractUserMaterialResult =
  | {
      ok: true;
      text: string;
      truncated: boolean;
      charCount: number;
      format: "pdf" | "docx" | "txt";
    }
  | {
      ok: false;
      error: string;
      code: "missing_path" | "download" | "unsupported" | "empty" | "parse";
    };

/** Maximální délka textu předaná do generátoru (chrání paměť i prompt). */
export const MAX_SOURCE_CHARS = 14_000;

function detectFormat(
  pathOrName: string,
): "pdf" | "docx" | "txt" | null {
  const lower = pathOrName.toLowerCase().split("?")[0] ?? "";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".txt")) return "txt";
  return null;
}

function storagePathFromFileUrl(fileUrl: string): string | null {
  const trimmed = fileUrl.trim();
  if (!trimmed) return null;

  // Ukládáme path tvaru `{userId}/{uuid}-name.pdf`
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed.replace(/^\/+/, "");
  }

  try {
    const url = new URL(trimmed);
    const marker = `/object/public/${STUDY_MATERIALS_BUCKET}/`;
    const markerSign = `/object/sign/${STUDY_MATERIALS_BUCKET}/`;
    const markerAuth = `/object/authenticated/${STUDY_MATERIALS_BUCKET}/`;
    for (const m of [marker, markerSign, markerAuth]) {
      const idx = url.pathname.indexOf(m);
      if (idx >= 0) {
        return decodeURIComponent(url.pathname.slice(idx + m.length));
      }
    }
    // Obecné: poslední segmenty po bucketu
    const parts = url.pathname.split(`/${STUDY_MATERIALS_BUCKET}/`);
    if (parts.length > 1) {
      return decodeURIComponent(parts[1]!.replace(/^\/+/, ""));
    }
  } catch {
    return null;
  }
  return null;
}

function truncateText(text: string): { text: string; truncated: boolean } {
  const normalized = text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_SOURCE_CHARS) {
    return { text: normalized, truncated: false };
  }
  const cut = normalized.slice(0, MAX_SOURCE_CHARS);
  const lastStop = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? "),
  );
  const safer =
    lastStop > MAX_SOURCE_CHARS * 0.6 ? cut.slice(0, lastStop + 1) : cut;
  return { text: safer.trim(), truncated: true };
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const fromPages = (result.pages ?? [])
      .map((p) => (p.text ?? "").trim())
      .filter(Boolean)
      .join("\n\n");
    return (fromPages || result.text || "").trim();
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return (result.value ?? "").trim();
}

function extractTxtText(buffer: Buffer): string {
  return buffer.toString("utf8").replace(/^\uFEFF/, "").trim();
}

/**
 * Stáhne soubor ze Supabase Storage (bucket user_materials) a extrahuje text.
 * `fileUrl` může být storage path nebo plná URL.
 */
export async function extractTextFromUserMaterialFile(params: {
  supabase: SupabaseClient;
  fileUrl: string;
}): Promise<ExtractUserMaterialResult> {
  const path = storagePathFromFileUrl(params.fileUrl);
  if (!path) {
    return {
      ok: false,
      code: "missing_path",
      error: "U materiálu chybí platná cesta k souboru.",
    };
  }

  const format = detectFormat(path);
  if (!format) {
    return {
      ok: false,
      code: "unsupported",
      error: "Podporujeme PDF, DOCX a TXT. Tento formát neumíme zpracovat.",
    };
  }

  const { data, error } = await params.supabase.storage
    .from(STUDY_MATERIALS_BUCKET)
    .download(path);

  if (error || !data) {
    console.error(
      "[extract-user-material] download failed",
      error?.message ?? "no data",
    );
    return {
      ok: false,
      code: "download",
      error:
        "Soubor se nepodařilo stáhnout z úložiště. Zkontroluj oprávnění a zkus to znovu.",
    };
  }

  try {
    const buffer = Buffer.from(await data.arrayBuffer());
    let raw = "";
    if (format === "pdf") raw = await extractPdfText(buffer);
    else if (format === "docx") raw = await extractDocxText(buffer);
    else raw = extractTxtText(buffer);

    const cleaned = raw.replace(/\u0000/g, "").trim();
    if (cleaned.length < 40) {
      return {
        ok: false,
        code: "empty",
        error:
          "Z souboru se nepodařilo získat dostatek textu. Možná jde o naskenované PDF bez textové vrstvy.",
      };
    }

    const { text, truncated } = truncateText(cleaned);
    return {
      ok: true,
      text,
      truncated,
      charCount: cleaned.length,
      format,
    };
  } catch (error) {
    console.error("[extract-user-material] parse failed", error);
    if (isMalformedPdfError(error)) {
      return {
        ok: false,
        code: "parse",
        error: "PDF je poškozené nebo chráněné heslem. Zkus jiný soubor.",
      };
    }
    return {
      ok: false,
      code: "parse",
      error: "Extrakce textu ze souboru selhala. Zkus soubor znovu uložit jako PDF nebo TXT.",
    };
  }
}
