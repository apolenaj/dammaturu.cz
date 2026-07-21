import type { MaterialProcessingIssue } from "@/domain/learning/learner-materials";

export type PipelineDiagnosticsInput = {
  format: string;
  pageCount: number | null;
  pagesWithText: number | null;
  headingCount: number;
  topicCount: number;
  knowledgePointCount: number;
  plainTextLength: number;
  chunkCount: number;
  truncated: boolean;
  omittedChars: number;
  scannedSuspect: boolean;
  emptyDocument: boolean;
  veryLarge: boolean;
  duplicateOfId: string | null;
  processingMs: number;
  extraWarnings?: string[];
  issues?: MaterialProcessingIssue[];
};

function pluralCs(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

/** Student-facing ready summary. */
export function formatReadyStatusMessage(
  topicCount: number,
  knowledgePointCount: number,
): string {
  const topics = pluralCs(topicCount, "téma", "témata", "témat");
  const points = pluralCs(
    knowledgePointCount,
    "znalostní bod",
    "znalostní body",
    "znalostních bodů",
  );
  return `Dokument připraven — nalezeno ${topicCount} ${topics} a ${knowledgePointCount} ${points}.`;
}

export function buildDiagnostics(input: PipelineDiagnosticsInput) {
  const warnings: string[] = [...(input.extraWarnings ?? [])];
  const issues: MaterialProcessingIssue[] = [...(input.issues ?? [])];

  if (input.duplicateOfId) {
    issues.push("duplicate");
    warnings.push("Stejný soubor už máš nahraný.");
  }
  if (input.emptyDocument) {
    issues.push("empty_document");
    warnings.push("Dokument neobsahuje žádný čitelný text.");
  }
  if (input.scannedSuspect) {
    issues.push("scanned_no_text");
    warnings.push(
      "Vypadá to na naskenované PDF bez textové vrstvy (OCR zatím neumíme).",
    );
  }
  if (input.truncated) {
    issues.push("very_large");
    warnings.push(
      `Dokument je velmi dlouhý — ${input.omittedChars} znaků se nevešlo do znalostních bodů (uloženo v přetečení).`,
    );
  } else if (input.veryLarge) {
    issues.push("very_large");
    warnings.push("Dokument je velmi dlouhý — zpracování trvalo déle.");
  }

  const uniqueIssues = [...new Set(issues)];
  const contentLossRisk = input.truncated
    ? ("truncated" as const)
    : input.scannedSuspect
      ? ("scanned_suspect" as const)
      : input.emptyDocument || input.plainTextLength < 40
        ? ("low_text" as const)
        : ("none" as const);

  return {
    extractOk: !uniqueIssues.includes("malformed_pdf") &&
      !uniqueIssues.includes("extract_failed") &&
      !uniqueIssues.includes("unsupported_format"),
    pageCount: input.pageCount,
    pagesWithText: input.pagesWithText,
    headingCount: input.headingCount,
    topicCount: input.topicCount,
    knowledgePointCount: input.knowledgePointCount,
    plainTextLength: input.plainTextLength,
    chunkCount: input.chunkCount,
    truncated: input.truncated,
    omittedChars: input.omittedChars,
    contentLossRisk,
    warnings: [...new Set(warnings)],
    issues: uniqueIssues,
    duplicateOfId: input.duplicateOfId,
    processingMs: input.processingMs,
  };
}
