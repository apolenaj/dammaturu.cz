import "server-only";

import type { MaterialStudyPack } from "@/domain/dashboard/material-study-content";
import {
  generateStudyPackFromSource,
  OpenAiStudyError,
} from "@/domain/dashboard/generate-from-source";
import type { StudyMaterial } from "@/domain/dashboard/study-materials";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromUserMaterialFile } from "@/server/dashboard/extract-user-material";

export type ResolvedMaterialStudy = {
  pack: MaterialStudyPack | null;
  source: "extracted" | "topic_ai" | "failed";
  engine?: "openai";
  warning: string | null;
  info: string | null;
  error: string | null;
  truncated: boolean;
};

/**
 * Stáhne / sestaví zdrojový text a vygeneruje učební balíček přes OpenAI.
 * Žádné dummy fallbacky — chyby se vrací jako `error`.
 * Běží jen na Node.js serveru (RSC / Server Action) — ne Edge, ne klient.
 */
export async function resolveMaterialStudyPack(
  material: StudyMaterial,
): Promise<ResolvedMaterialStudy> {
  try {
    let sourceText = "";
    let source: "extracted" | "topic_ai" = "topic_ai";
    let truncated = false;
    let info: string | null = null;

    if (material.type === "user" && material.file_url) {
      const supabase = await createClient();
      const extracted = await extractTextFromUserMaterialFile({
        supabase,
        fileUrl: material.file_url,
      });

      if (!extracted.ok) {
        return {
          pack: null,
          source: "failed",
          warning: null,
          info: null,
          error: extracted.error,
          truncated: false,
        };
      }

      sourceText = extracted.text;
      source = "extracted";
      truncated = extracted.truncated;
      info = extracted.truncated
        ? `Obsah je z tvého souboru (text zkrácen, původně ${extracted.charCount.toLocaleString("cs-CZ")} znaků) a zpracovaný přes AI.`
        : `Obsah je z tvého souboru (${extracted.format.toUpperCase()}, ${extracted.charCount.toLocaleString("cs-CZ")} znaků) a zpracovaný přes AI.`;
    } else {
      // Systémové učivo bez PDF — AI generuje z názvu/předmětu + maturitního kontextu.
      sourceText = [
        `Maturitní téma: ${material.title}.`,
        `Předmět: ${material.subject}.`,
        `Připrav kompletní studijní balíček pro českého maturantu k tomuto tématu.`,
        `Zahrň ověřené klíčové pojmy, souvislosti, data a typické maturitní chytáky k tématu „${material.title}“.`,
      ].join("\n");
      source = "topic_ai";
      info = "Systémové učivo — obsah vygenerovala AI k maturitnímu tématu.";
    }

    const { pack, engine } = await generateStudyPackFromSource({
      title: material.title,
      subject: material.subject,
      sourceText,
    });

    return {
      pack,
      source,
      engine,
      warning: null,
      info,
      error: null,
      truncated,
    };
  } catch (error) {
    console.error("[resolve-material-study] failed", error);
    const message =
      error instanceof OpenAiStudyError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Chyba připojení k AI: Neočekávaná chyba při generování.";

    return {
      pack: null,
      source: "failed",
      warning: null,
      info: null,
      error: message.startsWith("Chyba připojení k AI")
        ? message
        : `Chyba připojení k AI: ${message}`,
      truncated: false,
    };
  }
}
