/**
 * Studijní materiály v Supabase (dashboard /materialy).
 * type: system = výchozí učivo pro všechny, user = nahrané studentem.
 */

export type StudyMaterialType = "system" | "user";

export type StudyMaterial = {
  id: string;
  title: string;
  subject: string;
  type: StudyMaterialType;
  file_url: string | null;
  user_id: string | null;
  created_at: string;
};

export const STUDY_MATERIALS_BUCKET = "user_materials";

export const STUDY_MATERIAL_ACCEPT = {
  extensions: [".pdf", ".docx", ".txt"] as const,
  mimeTypes: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ] as const,
  /** 20 MB — odpovídá limitu bucketu */
  maxBytes: 20 * 1024 * 1024,
};

export function isAllowedStudyMaterialFile(file: {
  name: string;
  type: string;
  size: number;
}): { ok: true } | { ok: false; error: string } {
  if (file.size <= 0) {
    return { ok: false, error: "Soubor je prázdný." };
  }
  if (file.size > STUDY_MATERIAL_ACCEPT.maxBytes) {
    return {
      ok: false,
      error: "Soubor je příliš velký. Maximum je 20 MB.",
    };
  }

  const lower = file.name.toLowerCase();
  const hasExt = STUDY_MATERIAL_ACCEPT.extensions.some((ext) =>
    lower.endsWith(ext),
  );
  const mimeOk =
    !file.type ||
    (STUDY_MATERIAL_ACCEPT.mimeTypes as readonly string[]).includes(file.type);

  if (!hasExt && !mimeOk) {
    return {
      ok: false,
      error: "Povolené formáty jsou PDF, DOCX a TXT.",
    };
  }

  return { ok: true };
}

export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  return base || "Můj materiál";
}

export function groupMaterialsBySubject(
  materials: StudyMaterial[],
): Array<{ subject: string; materials: StudyMaterial[] }> {
  const order: string[] = [];
  const map = new Map<string, StudyMaterial[]>();

  for (const material of materials) {
    const key = material.subject.trim() || "Ostatní";
    if (!map.has(key)) {
      order.push(key);
      map.set(key, []);
    }
    map.get(key)!.push(material);
  }

  return order.map((subject) => ({
    subject,
    materials: map.get(subject) ?? [],
  }));
}

export function subjectShortLabel(subject: string): string {
  const normalized = subject.trim().toLowerCase();
  if (
    normalized.includes("český") ||
    normalized.includes("cesky") ||
    normalized === "čjl" ||
    normalized === "cjl"
  ) {
    return "ČJL";
  }
  if (normalized.includes("matemat")) {
    return "MAT";
  }
  if (normalized.includes("angli") || normalized === "aj") {
    return "AJ";
  }
  return subject.slice(0, 3).toUpperCase();
}
