/**
 * Only matura-related study materials may enter the educational content store.
 * Allowlist is explicit — unknown files are rejected.
 */

export type AllowlistEntry = {
  /** Exact filename match (Unicode NFC normalized) */
  filename: string;
  topicHint: string;
  domainTags: string[];
};

export const MATURA_DOCX_ALLOWLIST: AllowlistEntry[] = [
  {
    filename: "Co jsou to homonyma x slova mnohoznačná.docx",
    topicHint: "Homonyma a slova mnohoznačná",
    domainTags: ["cjl", "jazyk", "lexikologie"],
  },
  {
    filename: "1. Realismus.docx",
    topicHint: "Realismus — obecné znaky",
    domainTags: ["cjl", "literatura", "realismus"],
  },
  {
    filename: "2. Realismus ve Francii.docx",
    topicHint: "Realismus ve Francii",
    domainTags: ["cjl", "literatura", "realismus"],
  },
  {
    filename: "3. Realismus v Rusku.docx",
    topicHint: "Realismus v Rusku",
    domainTags: ["cjl", "literatura", "realismus"],
  },
  {
    filename: "4. Realismus v Anglii a další autoři.docx",
    topicHint: "Realismus v Anglii a další autoři",
    domainTags: ["cjl", "literatura", "realismus"],
  },
  {
    filename: "Národní obrození v Čechách.docx",
    topicHint: "Národní obrození",
    domainTags: ["cjl", "literatura", "narodni-obrozeni"],
  },
  {
    filename: "Romantismus - hl. znaky.docx",
    topicHint: "Romantismus — hlavní znaky",
    domainTags: ["cjl", "literatura", "romantismus"],
  },
  {
    filename: "Máj.docx",
    topicHint: "Máj (Mácha)",
    domainTags: ["cjl", "literatura", "dilo"],
  },
  {
    filename: "Kytice.docx",
    topicHint: "Kytice (Erben)",
    domainTags: ["cjl", "literatura", "dilo"],
  },
  {
    filename: "Babička.docx",
    topicHint: "Babička (Němcová)",
    domainTags: ["cjl", "literatura", "dilo"],
  },
  {
    filename: "11. A. Jirásek.docx",
    topicHint: "Alois Jirásek",
    domainTags: ["cjl", "literatura", "autor"],
  },
  {
    filename: "12. České drama 2. pol 19. stol.docx",
    topicHint: "České drama 2. poloviny 19. století",
    domainTags: ["cjl", "literatura", "drama"],
  },
];

const ALLOWED_EXTENSIONS = new Set([".docx"]);

function normalizeName(name: string): string {
  return name.normalize("NFC").trim();
}

export function getAllowlistEntry(
  filename: string,
): AllowlistEntry | undefined {
  const n = normalizeName(filename);
  return MATURA_DOCX_ALLOWLIST.find(
    (e) => normalizeName(e.filename) === n,
  );
}

export function isSupportedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return false;
  return ALLOWED_EXTENSIONS.has(lower.slice(dot));
}

export function evaluateDocumentEligibility(filename: string): {
  allowed: boolean;
  reason?: string;
  entry?: AllowlistEntry;
} {
  if (!isSupportedExtension(filename)) {
    return {
      allowed: false,
      reason: "Nepodporovaný formát — povolené je pouze .docx",
    };
  }

  const entry = getAllowlistEntry(filename);
  if (!entry) {
    return {
      allowed: false,
      reason:
        "Soubor není na allowlistu maturitních materiálů — nebude vložen do vzdělávací DB",
    };
  }

  return { allowed: true, entry };
}
