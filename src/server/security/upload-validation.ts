import {
  materialsConfig,
  type MaterialFormat,
  type SupportedMaterialFormat,
  supportedMaterialFormats,
} from "@/domain/learning/learner-materials";

/**
 * Magic-byte + MIME upload validation (D-063).
 * Never trust filename extension alone.
 */

export type UploadSniffResult =
  | {
      ok: true;
      format: SupportedMaterialFormat;
      mime: string;
    }
  | { ok: false; errorCs: string };

function startsWithBytes(buf: Buffer, sig: number[]): boolean {
  if (buf.length < sig.length) return false;
  return sig.every((b, i) => buf[i] === b);
}

function isMostlyText(buf: Buffer): boolean {
  const sample = buf.subarray(0, Math.min(buf.length, 4096));
  if (sample.length === 0) return false;
  let weird = 0;
  for (const b of sample) {
    if (b === 0) return false;
    if (b < 7 || (b > 14 && b < 32 && b !== 9 && b !== 10 && b !== 13)) {
      weird += 1;
    }
  }
  return weird / sample.length < 0.05;
}

/** DOCX is a ZIP (PK\x03\x04) containing word/ — we accept ZIP header for docx. */
function sniffFormat(buf: Buffer): SupportedMaterialFormat | null {
  if (startsWithBytes(buf, [0x25, 0x50, 0x44, 0x46])) return "pdf"; // %PDF
  if (startsWithBytes(buf, [0x50, 0x4b, 0x03, 0x04])) return "docx"; // ZIP/DOCX
  if (isMostlyText(buf)) return "txt";
  return null;
}

export function validateUploadedMaterial(input: {
  filename: string;
  declaredMime: string;
  buffer: Buffer;
}): UploadSniffResult {
  if (input.buffer.length <= 0) {
    return { ok: false, errorCs: "Soubor je prázdný." };
  }
  if (input.buffer.length > materialsConfig.maxFileBytes) {
    return {
      ok: false,
      errorCs: `Soubor je větší než ${Math.round(materialsConfig.maxFileBytes / (1024 * 1024))} MB.`,
    };
  }

  const sniffed = sniffFormat(input.buffer);
  if (!sniffed) {
    return {
      ok: false,
      errorCs: "Soubor nevypadá jako PDF, DOCX ani text. Zkus jiný formát.",
    };
  }

  if (!(supportedMaterialFormats as readonly string[]).includes(sniffed)) {
    return {
      ok: false,
      errorCs: "Nepodporovaný formát. Nahraj PDF, DOCX nebo TXT.",
    };
  }

  // Extension hint — may disagree with sniff; sniff wins, but reject dangerous mismatch
  const ext = input.filename.split(".").pop()?.toLowerCase();
  if (ext === "exe" || ext === "js" || ext === "html" || ext === "htm") {
    return { ok: false, errorCs: "Tento typ souboru není povolen." };
  }
  if (ext && (supportedMaterialFormats as readonly string[]).includes(ext)) {
    if (ext !== sniffed && !(ext === "txt" && sniffed === "txt")) {
      // Allow .txt claimed when sniff is txt; reject pdf vs docx swap
      if (ext !== sniffed) {
        return {
          ok: false,
          errorCs:
            "Přípona souboru neodpovídá obsahu. Nahraj soubor se správnou příponou.",
        };
      }
    }
  }

  const allowedMimes = materialsConfig.acceptMime[sniffed as MaterialFormat] ?? [];
  const mime = (input.declaredMime || "application/octet-stream").toLowerCase();
  if (
    mime &&
    mime !== "application/octet-stream" &&
    allowedMimes.length > 0 &&
    !allowedMimes.includes(mime)
  ) {
    // Soft: many browsers send wrong MIME — only reject clearly hostile types
    if (
      mime.includes("javascript") ||
      mime.includes("html") ||
      mime.startsWith("image/") ||
      mime.startsWith("audio/") ||
      mime.startsWith("video/")
    ) {
      return { ok: false, errorCs: "Nepodporovaný typ souboru." };
    }
  }

  return {
    ok: true,
    format: sniffed,
    mime: allowedMimes[0] ?? mime,
  };
}

/** Same-origin (or missing Origin on same-site navigations) for cookie POSTs. */
export function assertSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Same-site form / some browsers omit Origin on same-origin POST
    const referer = request.headers.get("referer");
    if (!referer) return true;
    try {
      const r = new URL(referer);
      const host = request.headers.get("host");
      return !host || r.host === host;
    } catch {
      return false;
    }
  }
  try {
    const o = new URL(origin);
    const host = request.headers.get("host");
    if (!host) return true;
    return o.host === host;
  } catch {
    return false;
  }
}
