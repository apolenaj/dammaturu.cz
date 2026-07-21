/**
 * Extract biography-like source statements from raw chunk text.
 * Catches short lines (e.g. "Ladislav Stroupežnický (1850 – 1820)") that
 * KU heuristics may skip because they are under the sentence length floor.
 */
export function extractBioStatementsFromText(
  text: string,
): Array<{ title: string; statement: string }> {
  const results: Array<{ title: string; statement: string }> = [];
  const seen = new Set<string>();
  const re =
    /([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}'-]+(?:\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ.][\p{L}'-.]*){0,4})\s*\((\d{3,4})\s*[–—-]\s*(?:\d{3,4}|[?？])\)/gu;

  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const title = m[1]!.trim();
    const statement = m[0]!.trim();
    const key = statement.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ title, statement });
  }
  return results;
}
