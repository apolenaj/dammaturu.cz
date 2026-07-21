/**
 * Cosmetic normalization only.
 * MUST NOT change historical facts, names, or years.
 */
export function normalizeStatement(source: string): string {
  return source
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([({\[])\s+/g, "$1")
    .replace(/\s+([)}\]])/g, "$1")
    .replace(/\s*[–—]\s*/g, " – ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Similarity for near-duplicate detection (0–1). */
export function statementSimilarity(a: string, b: string): number {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) inter += 1;
  }
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function normalizeForCompare(text: string): string {
  return normalizeStatement(text)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9áčďéěíňóřšťúůýž\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractYearPairs(
  text: string,
): Array<{ birth: number; death: number; raw: string }> {
  const pairs: Array<{ birth: number; death: number; raw: string }> = [];
  const re =
    /\((\d{3,4})\s*[–—-]\s*(\d{3,4}|[?？])\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const birth = Number(m[1]);
    const deathRaw = m[2]!;
    if (deathRaw === "?" || deathRaw === "？") continue;
    const death = Number(deathRaw);
    if (!Number.isFinite(birth) || !Number.isFinite(death)) continue;
    pairs.push({ birth, death, raw: m[0]! });
  }
  return pairs;
}

export function extractPersonNameNearYears(text: string): string | null {
  const m = text.match(
    /([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}'-]+(?:\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ.][\p{L}'-.]*){0,4})\s*\(\d{3,4}\s*[–—-]\s*(?:\d{3,4}|[?？])\)/u,
  );
  return m?.[1]?.trim() ?? null;
}
