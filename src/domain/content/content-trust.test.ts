import { describe, expect, it } from "vitest";
import {
  buildTrustRecord,
  formatStudentSourceDetail,
  formatStudentSourceLabel,
  isAuthoritativeForStudentFeedback,
  qaValidationToTrustStatus,
  sanitizeSourceTitle,
} from "@/domain/content/content-trust";
import { detectContentTrustIssues } from "@/domain/content/content-trust-detectors";
import { buildContentTrustReport } from "@/domain/content/content-trust-report";

describe("content trust statuses", () => {
  it("maps QA → trust and gates authoritative feedback", () => {
    expect(qaValidationToTrustStatus("verified_from_source")).toBe("VERIFIED");
    expect(qaValidationToTrustStatus("corrected")).toBe("VERIFIED");
    expect(qaValidationToTrustStatus("needs_fact_check")).toBe(
      "REVIEW_REQUIRED",
    );
    expect(qaValidationToTrustStatus("rejected")).toBe("REJECTED");
    expect(isAuthoritativeForStudentFeedback("VERIFIED")).toBe(true);
    expect(isAuthoritativeForStudentFeedback("EXTRACTED")).toBe(false);
  });

  it("demotes VERIFIED when blocking issues exist", () => {
    const record = buildTrustRecord({
      knowledgeUnitId: "ku-1",
      title: "Test",
      statement: "Nějaké tvrzení o literatuře.",
      sourceId: "doc-1",
      sourceTitle: "Národní obrození",
      trustStatus: "VERIFIED",
      lastUpdated: new Date().toISOString(),
      issues: [
        {
          code: "contradictory_fact",
          reasonCs: "Rozpor",
          evidence: null,
          relatedId: null,
        },
      ],
    });
    expect(record.trustStatus).toBe("REVIEW_REQUIRED");
    expect(record.authoritativeForFeedback).toBe(false);
  });
});

describe("student source labels", () => {
  it("formats simple Czech label without paths", () => {
    expect(
      formatStudentSourceLabel({ sourceTitle: "Národní obrození" }),
    ).toBe("Zdroj: Národní obrození – studijní materiál");
    expect(
      sanitizeSourceTitle("/Users/me/content/source-materials/narodni.pdf"),
    ).toBe("narodni");
    const detail = formatStudentSourceDetail({
      sourceTitle: "Národní obrození",
      sourceLocation: "str. 12 · Úvod",
      trustStatus: "EXTRACTED",
    });
    expect(detail.labelCs).toMatch(/^Zdroj:/);
    expect(detail.uncertaintyCs).toMatch(/ověřen/);
  });
});

describe("trust detectors", () => {
  it("flags duplicates, unsupported answers, missing keys, OCR", () => {
    const a = {
      id: "1",
      knowledgeUnitId: "ku-a",
      title: "Co je romantismus?",
      statement: "Romantismus je směr 19. století.",
      sourceId: "d1",
      sourceText: "Klasicismus je něco jiného úplně.",
      answerKey: "Totálně nesouvisející odpověď xyz",
    };
    const b = {
      id: "2",
      knowledgeUnitId: "ku-b",
      title: "Co je romantismus?",
      statement: "Romantismus je směr 19. století.",
      sourceId: "d1",
      sourceText: "Romantismus je směr 19. století v literatuře.",
    };
    const issuesA = detectContentTrustIssues(a, [a, b]);
    expect(issuesA.some((i) => i.code === "duplicate")).toBe(true);
    expect(
      issuesA.some((i) => i.code === "answer_not_supported_by_source"),
    ).toBe(true);

    const noKey = detectContentTrustIssues(
      {
        id: "4",
        knowledgeUnitId: "ku-d",
        title: "Kdo napsal Máj?",
        statement: "Otázka bez klíče odpovědi na Máchu.",
        sourceId: "d1",
        sourceText: "Karel Hynek Mácha napsal Máj.",
        answerKey: null,
      },
      [],
    );
    expect(noKey.some((i) => i.code === "missing_answer_key")).toBe(true);

    const ocr = detectContentTrustIssues(
      {
        id: "3",
        knowledgeUnitId: "ku-c",
        title: "Sken",
        statement: "llll |||| broken@@@@@ text#### weird",
        sourceId: "d1",
        sourceText: "text",
        processingHints: ["scanned_no_text"],
      },
      [],
    );
    expect(ocr.some((i) => i.code === "suspicious_ocr")).toBe(true);
  });
});

describe("trust report", () => {
  it("summarizes statuses and priority queue", () => {
    const records = [
      buildTrustRecord({
        knowledgeUnitId: "1",
        title: "A",
        statement: "Fakt A o literatuře českého národního obrození.",
        sourceId: "s",
        sourceTitle: "Národní obrození",
        trustStatus: "VERIFIED",
        lastUpdated: new Date().toISOString(),
      }),
      buildTrustRecord({
        knowledgeUnitId: "2",
        title: "B",
        statement: "Fakt B.",
        sourceId: null,
        sourceTitle: null,
        trustStatus: "EXTRACTED",
        lastUpdated: new Date().toISOString(),
        issues: [
          {
            code: "missing_source",
            reasonCs: "Chybí zdroj",
            evidence: null,
            relatedId: null,
          },
        ],
      }),
    ];
    const report = buildContentTrustReport(records);
    expect(report.summary.total).toBe(2);
    expect(report.summary.authoritativeCount).toBe(1);
    expect(report.priorityQueue.length).toBeGreaterThanOrEqual(1);
  });
});
