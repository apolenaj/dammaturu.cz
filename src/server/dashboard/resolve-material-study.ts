import type { MaterialStudyPack } from "@/domain/dashboard/material-study-content";
import { buildMaterialStudyPack } from "@/domain/dashboard/material-study-content";
import { generateStudyPackFromSource } from "@/domain/dashboard/generate-from-source";
import type { StudyMaterial } from "@/domain/dashboard/study-materials";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromUserMaterialFile } from "@/server/dashboard/extract-user-material";

export type ResolvedMaterialStudy = {
  pack: MaterialStudyPack;
  source: "extracted" | "title_fallback";
  engine?: "openai" | "local";
  warning: string | null;
  info: string | null;
  truncated: boolean;
};

/**
 * Pro uživatelský materiál s file_url stáhne soubor, extrahuje text a vygeneruje učební balíček.
 * Při selhání fallbackne na generování podle názvu.
 */
export async function resolveMaterialStudyPack(
  material: StudyMaterial,
): Promise<ResolvedMaterialStudy> {
  const titleFallback = (): ResolvedMaterialStudy => ({
    pack: buildMaterialStudyPack(material.title, material.subject),
    source: "title_fallback",
    warning: null,
    info: null,
    truncated: false,
  });

  if (material.type !== "user" || !material.file_url) {
    return {
      ...titleFallback(),
      info:
        material.type === "system"
          ? "Systémové učivo — kartičky a testy podle maturitního okruhu."
          : null,
    };
  }

  try {
    const supabase = await createClient();
    const extracted = await extractTextFromUserMaterialFile({
      supabase,
      fileUrl: material.file_url,
    });

    if (!extracted.ok) {
      return {
        pack: buildMaterialStudyPack(material.title, material.subject),
        source: "title_fallback",
        warning: `${extracted.error} Proto generujeme učení podle názvu materiálu jako zálohu.`,
        info: null,
        truncated: false,
      };
    }

    const { pack, engine } = await generateStudyPackFromSource({
      title: material.title,
      subject: material.subject,
      sourceText: extracted.text,
    });

    return {
      pack,
      source: "extracted",
      engine,
      warning: null,
      info: extracted.truncated
        ? `Kartičky a testy jsou z obsahu tvého souboru (text byl zkrácen na nejpodstatnější část, původně ${extracted.charCount.toLocaleString("cs-CZ")} znaků).`
        : `Kartičky a testy jsou vygenerované přímo z obsahu tvého souboru (${extracted.format.toUpperCase()}, ${extracted.charCount.toLocaleString("cs-CZ")} znaků).`,
      truncated: extracted.truncated,
    };
  } catch (error) {
    console.error("[resolve-material-study] failed", error);
    return {
      pack: buildMaterialStudyPack(material.title, material.subject),
      source: "title_fallback",
      warning:
        "Extrakce z souboru selhala. Generujeme učení podle názvu materiálu jako zálohu.",
      info: null,
      truncated: false,
    };
  }
}
