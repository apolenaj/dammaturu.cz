/**
 * Czech-aware cosmetic text normalization for learner ingestion.
 * Preserves facts/names/years — NFC + whitespace + typography only.
 */
export function normalizeCzechText(source: string): string {
  return source
    .normalize("NFC")
    .replace(/\u00a0/g, " ")
    .replace(/\u200b/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([({\[])\s+/g, "$1")
    .replace(/\s+([)}\]])/g, "$1")
    .replace(/\s*[–—]\s*/g, " – ")
    .replace(/„\s+/g, "„")
    .replace(/\s+“/g, "“")
    .trim();
}

/** Collapse for duplicate / heading compare (diacritics stripped). */
export function normalizeCzechForCompare(text: string): string {
  return normalizeCzechText(text)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
