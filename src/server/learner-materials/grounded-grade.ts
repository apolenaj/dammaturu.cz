import {
  INSUFFICIENT_EVIDENCE_CS,
  type EvidenceConfidence,
  type GroundedGradeResult,
  type GroundedStudyItem,
  type SourceCitation,
} from "@/domain/learning/grounded-study";
import {
  evaluateOpenAnswer,
  openAnswerResultLabelsCs,
  openResultToAttemptResult,
  type OpenAnswerEvaluation,
} from "@/domain/learning/open-answer-eval";

/**
 * Grade a student answer with robust open-answer evaluation against source.
 * Never invents missing content; unsupported claims are flagged.
 */
export function gradeAgainstSource(params: {
  studentAnswer: string;
  item: GroundedStudyItem;
}): GroundedGradeResult & { openEvaluation?: OpenAnswerEvaluation } {
  const citations = params.item.citations;
  const evidenceText = [
    params.item.groundedAnswer,
    ...citations.map((c) => c.sourceText),
  ].join("\n");

  if (!evidenceText.trim() || !citations.length) {
    return insufficientResult(citations, params.item.confidence);
  }

  const answer = params.studentAnswer.trim();
  const keyPhrases =
    params.item.expectedKeyPhrases.length > 0
      ? params.item.expectedKeyPhrases
      : [];

  if (!answer) {
    return {
      result: "incorrect",
      coverage: 0,
      matchedPhrases: [],
      missingPhrases: [...keyPhrases],
      unsupportedClaims: [],
      feedback: "Napiš odpověď vlastními slovy podle materiálu.",
      confidence: params.item.confidence,
      citations,
      showInsufficientMessage: false,
    };
  }

  if (keyPhrases.length === 0) {
    return insufficientResult(citations, params.item.confidence);
  }

  const primary = citations[0]!;
  const openEvaluation = evaluateOpenAnswer({
    studentAnswer: answer,
    keyIdeas: keyPhrases.map((p, i) => ({
      id: `p-${i}`,
      label: p,
      synonyms: [],
      required: true,
    })),
    idealAnswer: params.item.groundedAnswer,
    sourceEvidence: {
      quote: primary.sourceText,
      sourceLabel: primary.documentTitle,
      pageStart: primary.pageStart,
      pageEnd: primary.pageEnd,
    },
  });

  const result = openResultToAttemptResult(openEvaluation.result);
  const showInsufficientMessage =
    openEvaluation.whatWasWrong.length > 0 &&
    openEvaluation.coverage < 0.35;

  const feedback = [
    `${openAnswerResultLabelsCs[openEvaluation.result]} (${openEvaluation.resultLabel}).`,
    openEvaluation.whatWasCorrect.length
      ? `Správně: ${openEvaluation.whatWasCorrect.slice(0, 4).join(", ")}.`
      : "",
    openEvaluation.whatWasMissing.length
      ? `Chybí: ${openEvaluation.whatWasMissing.slice(0, 4).join(", ")}.`
      : "",
    openEvaluation.whatWasWrong.length
      ? openEvaluation.whatWasWrong.slice(0, 2).join(" ")
      : "",
    showInsufficientMessage ? INSUFFICIENT_EVIDENCE_CS : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    result: showInsufficientMessage ? "insufficient" : result,
    coverage: openEvaluation.coverage,
    matchedPhrases: openEvaluation.whatWasCorrect,
    missingPhrases: openEvaluation.whatWasMissing,
    unsupportedClaims: openEvaluation.whatWasWrong,
    feedback,
    confidence: params.item.confidence,
    citations,
    showInsufficientMessage,
    openEvaluation,
  };
}

function insufficientResult(
  citations: SourceCitation[],
  _confidence: EvidenceConfidence,
): GroundedGradeResult {
  void _confidence;
  return {
    result: "insufficient",
    coverage: 0,
    matchedPhrases: [],
    missingPhrases: [],
    unsupportedClaims: [],
    feedback: INSUFFICIENT_EVIDENCE_CS,
    confidence: "insufficient",
    citations,
    showInsufficientMessage: true,
  };
}
