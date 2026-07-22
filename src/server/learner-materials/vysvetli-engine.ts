import type { LearnerMaterial } from "@/domain/learning/learner-materials";
import type { StudyContentEntry } from "@/domain/study-content/registry";
import {
  INSUFFICIENT_EVIDENCE_CS,
  mapEvidenceConfidence,
  type EvidenceConfidence,
  type SourceCitation,
} from "@/domain/learning/grounded-study";
import {
  compareFromEvidence,
  exampleFromEvidence,
  followUpsFromEvidence,
  insufficientVysvetliResponse,
  mnemonicFromSourceTokens,
  simplifyParagraphFromSource,
  summarizeFromEvidence,
  toVysvetliCitation,
  VYSVETLI_DISCLAIMER_CS,
  vysvetliAiStatusLabelsCs,
  vysvetliConfig,
  vysvetliTaskLabelsCs,
  type VysvetliAiStatus,
  type VysvetliCitation,
  type VysvetliRequest,
  type VysvetliResponse,
  type VysvetliSourceKind,
} from "@/domain/learning/vysvetli-mi-to";
import { evaluateOpenAnswer } from "@/domain/learning/open-answer-eval";
import {
  hasSufficientEvidence,
  retrieveRelevantChunks,
  retrieveRelevantKnowledgeUnits,
} from "@/server/learner-materials/retrieve";
import { extractKeyPhrasesFromSource } from "@/domain/learning/grounded-study";

type EvidenceHit = {
  snippet: string;
  citation: VysvetliCitation;
  score: number;
  confidence: EvidenceConfidence;
};

function citationFromMaterialChunk(
  materialId: string,
  materialTitle: string,
  chunk: NonNullable<LearnerMaterial["chunks"]>[number],
): SourceCitation {
  return {
    documentId: materialId,
    documentTitle: materialTitle,
    chunkId: chunk.id,
    knowledgeUnitId: null,
    pageStart: chunk.pageStart ?? null,
    pageEnd: chunk.pageEnd ?? null,
    sectionPath: chunk.sectionPath ?? [],
    headingPath: chunk.headingPath ?? null,
    sourceText: chunk.text.slice(0, 2000),
    sourceRef: chunk.sourceRef ?? null,
  };
}

/**
 * Optional AI enhance — NEVER required for core learning.
 * Currently always unavailable (D-005: runtime without LLM dependency).
 * When a provider exists, entitle + call here; on failure return unavailable.
 */
export function resolveVysvetliAiStatus(input: {
  aiExplanationsEntitled: boolean;
  aiProviderAvailable?: boolean;
}): VysvetliAiStatus {
  if (!input.aiExplanationsEntitled) return "not_entitled";
  if (input.aiProviderAvailable === false) return "unavailable";
  // Provider not wired — degrade gracefully, core still works.
  return "disabled";
}

function gatherMaterialEvidence(
  materials: LearnerMaterial[],
  query: string,
): EvidenceHit[] {
  const units = retrieveRelevantKnowledgeUnits(materials, query, {
    topK: 6,
    minScore: 0.22,
  });
  const chunks = retrieveRelevantChunks(materials, query, {
    topK: 6,
    minScore: 0.2,
  });
  const hits: EvidenceHit[] = [];

  for (const hit of units) {
    const material = materials.find((m) => m.id === hit.materialId);
    if (!material) continue;
    const sourceText = hit.unit.provenance.sourceText?.trim();
    if (!sourceText) continue;
    const confidence = mapEvidenceConfidence({
      confidence: hit.unit.confidence,
      flags: hit.unit.flags,
      hasSourceText: true,
    });
    if (confidence === "insufficient") continue;
    hits.push({
      snippet: hit.unit.statement.trim() || sourceText.slice(0, 400),
      score: hit.score,
      confidence,
      citation: toVysvetliCitation(
        {
          documentId: material.id,
          documentTitle: material.title,
          chunkId: hit.unit.provenance.chunkId,
          knowledgeUnitId: hit.unit.id,
          pageStart: hit.unit.provenance.pageStart,
          pageEnd: hit.unit.provenance.pageEnd,
          sectionPath: hit.unit.provenance.sectionPath,
          headingPath: hit.unit.provenance.headingPath,
          sourceText,
          sourceRef: hit.unit.provenance.sourceRef,
        },
        "uploaded_material",
      ),
    });
  }

  for (const hit of chunks) {
    hits.push({
      snippet: hit.chunk.text.trim().slice(0, 400),
      score: hit.score,
      confidence: "likely",
      citation: toVysvetliCitation(
        citationFromMaterialChunk(
          hit.materialId,
          hit.materialTitle,
          hit.chunk,
        ),
        "uploaded_material",
      ),
    });
  }

  // Prefer higher score; keep unique by sourceText prefix
  hits.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const deduped: EvidenceHit[] = [];
  for (const h of hits) {
    const key = h.citation.sourceText.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(h);
    if (deduped.length >= vysvetliConfig.maxCitations) break;
  }
  return deduped;
}

function gatherCatalogEvidence(
  entries: StudyContentEntry[],
  query: string,
): EvidenceHit[] {
  const terms = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3);
  if (!terms.length) return [];

  const hits: EvidenceHit[] = [];
  for (const entry of entries) {
    if (!entry.parseComplete) continue;
    if (
      entry.contentStatus !== "available" &&
      entry.contentStatus !== "available_with_warning"
    ) {
      continue;
    }
    for (const unit of entry.knowledgeUnits.slice(0, 80)) {
      const hay = `${unit.title} ${unit.statement}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (hay.includes(t)) score += 1;
      }
      if (score < 1) continue;
      const chunk =
        entry.chunks.find((c) => unit.sourceChunkIds.includes(c.id)) ??
        entry.chunks[0];
      const sourceText = (chunk?.text || unit.statement).slice(0, 2000);
      const synthetic = uuidFromString(entry.sourceId);
      hits.push({
        snippet: unit.statement.slice(0, 400),
        score: score / Math.max(1, terms.length),
        confidence: mapEvidenceConfidence({
          confidence: unit.confidence,
          flags: [],
          hasSourceText: Boolean(sourceText.trim()),
        }),
        citation: toVysvetliCitation(
          {
            documentId: synthetic,
            documentTitle: entry.title,
            chunkId:
              chunk && /^[0-9a-f-]{36}$/i.test(chunk.id) ? chunk.id : null,
            knowledgeUnitId: /^[0-9a-f-]{36}$/i.test(unit.id)
              ? unit.id
              : null,
            pageStart: null,
            pageEnd: null,
            sectionPath: [],
            headingPath: chunk?.headingPath ?? null,
            sourceText,
            sourceRef: null,
          },
          "approved_catalog",
        ),
      });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, 6);
}

function uuidFromString(input: string): string {
  // Deterministic UUID-shaped id for schema compliance (not a security boundary).
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  const hex = h.toString(16).padStart(8, "0");
  return `00000000-0000-4000-8000-${hex.padStart(12, "0").slice(0, 12)}`;
}

function bestConfidence(hits: EvidenceHit[]): EvidenceConfidence {
  if (hits.some((h) => h.confidence === "verified_from_source")) {
    return "verified_from_source";
  }
  if (hits.some((h) => h.confidence === "likely")) return "likely";
  if (hits.length) return "needs_review";
  return "insufficient";
}

function okResponse(partial: Omit<
  VysvetliResponse,
  "insufficient" | "disclaimerCs" | "aiNoteCs"
> & { aiStatus: VysvetliAiStatus }): VysvetliResponse {
  return {
    ...partial,
    insufficient: false,
    aiNoteCs: vysvetliAiStatusLabelsCs[partial.aiStatus],
    disclaimerCs: VYSVETLI_DISCLAIMER_CS,
  };
}

/**
 * Core grounded assistant — extractive, no model memory for exam facts.
 */
export function runVysvetliAssistant(input: {
  request: VysvetliRequest;
  materials: LearnerMaterial[];
  catalogEntries?: StudyContentEntry[];
  aiStatus?: VysvetliAiStatus;
}): VysvetliResponse {
  const aiStatus = input.aiStatus ?? "not_used";
  const req = input.request;
  const task = req.task;
  const titleCs = vysvetliTaskLabelsCs[task];

  // explain_paragraph: prefer selected paragraph if it looks like source text
  if (task === "explain_paragraph") {
    const paragraph = (req.selectedParagraph || req.query).trim();
    if (paragraph.length < vysvetliConfig.minParagraphChars) {
      return insufficientVysvetliResponse(task, aiStatus);
    }
    // Verify paragraph appears in materials or catalog (anti-hallucination gate)
    const inMaterials = input.materials.some((m) => {
      const chunks = m.chunks ?? [];
      const blob = [
        ...chunks.map((c) => c.text),
        ...(m.knowledgeUnits ?? []).map((u) => u.provenance.sourceText),
      ].join("\n");
      return blob.includes(paragraph.slice(0, 80));
    });
    const catalogHits = gatherCatalogEvidence(
      input.catalogEntries ?? [],
      paragraph.slice(0, 120),
    );
    const matHits = gatherMaterialEvidence(input.materials, paragraph.slice(0, 160));
    if (!inMaterials && matHits.length === 0 && catalogHits.length === 0) {
      return insufficientVysvetliResponse(task, aiStatus);
    }
    const citations = (matHits.length ? matHits : catalogHits)
      .slice(0, 4)
      .map((h) => h.citation);
    // If paragraph was pasted but not found, still refuse inventing — use retrieved only
    const body = inMaterials
      ? simplifyParagraphFromSource(paragraph)
      : summarizeFromEvidence(
          (matHits.length ? matHits : catalogHits).map((h) => h.snippet),
          "vybraný text",
        );
    if (body === INSUFFICIENT_EVIDENCE_CS) {
      return insufficientVysvetliResponse(task, aiStatus);
    }
    return okResponse({
      task,
      titleCs,
      bodyCs: body,
      confidence: bestConfidence(matHits.length ? matHits : catalogHits),
      citations,
      followUps: [],
      mnemonicCs: null,
      correctPoints: [],
      missingPoints: [],
      wrongPoints: [],
      aiStatus,
    });
  }

  const queryA = req.query.trim();
  if (!queryA) return insufficientVysvetliResponse(task, aiStatus);

  const matHits = gatherMaterialEvidence(input.materials, queryA);
  const catHits =
    req.includeApprovedCatalog !== false
      ? gatherCatalogEvidence(input.catalogEntries ?? [], queryA)
      : [];
  const combined = [...matHits, ...catHits].sort((a, b) => b.score - a.score);

  const materialChunks = retrieveRelevantChunks(input.materials, queryA, {
    topK: 4,
    minScore: 0.2,
  });
  const materialUnits = retrieveRelevantKnowledgeUnits(input.materials, queryA, {
    topK: 4,
    minScore: 0.22,
  });
  const materialsOk = hasSufficientEvidence(materialChunks, materialUnits);
  const catalogOk = catHits.some((h) => h.score >= vysvetliConfig.minEvidenceScore);

  if (!materialsOk && !catalogOk && combined.length === 0) {
    return insufficientVysvetliResponse(task, aiStatus);
  }

  const snippets = combined.map((h) => h.snippet);
  const citations = combined.slice(0, vysvetliConfig.maxCitations).map((h) => h.citation);
  const confidence = bestConfidence(combined);

  if (task === "summarize_topic") {
    const body = summarizeFromEvidence(snippets, queryA);
    if (body === INSUFFICIENT_EVIDENCE_CS) {
      return insufficientVysvetliResponse(task, aiStatus);
    }
    return okResponse({
      task,
      titleCs,
      bodyCs: body,
      confidence,
      citations,
      followUps: [],
      mnemonicCs: null,
      correctPoints: [],
      missingPoints: [],
      wrongPoints: [],
      aiStatus,
    });
  }

  if (task === "give_example") {
    const body = exampleFromEvidence(snippets, queryA);
    if (body === INSUFFICIENT_EVIDENCE_CS) {
      return insufficientVysvetliResponse(task, aiStatus);
    }
    return okResponse({
      task,
      titleCs,
      bodyCs: body,
      confidence,
      citations,
      followUps: [],
      mnemonicCs: null,
      correctPoints: [],
      missingPoints: [],
      wrongPoints: [],
      aiStatus,
    });
  }

  if (task === "compare_concepts") {
    const conceptB = (req.compareWith || "").trim();
    if (!conceptB) return insufficientVysvetliResponse(task, aiStatus);
    const hitsBMat = gatherMaterialEvidence(input.materials, conceptB);
    const hitsBCat = gatherCatalogEvidence(input.catalogEntries ?? [], conceptB);
    const hitsB = [...hitsBMat, ...hitsBCat].sort((a, b) => b.score - a.score);
    const body = compareFromEvidence({
      conceptA: queryA,
      conceptB,
      snippetsA: snippets,
      snippetsB: hitsB.map((h) => h.snippet),
    });
    if (body === INSUFFICIENT_EVIDENCE_CS) {
      return insufficientVysvetliResponse(task, aiStatus);
    }
    const bothCitations = [...citations, ...hitsB.map((h) => h.citation)].slice(
      0,
      vysvetliConfig.maxCitations,
    );
    return okResponse({
      task,
      titleCs,
      bodyCs: body,
      confidence: bestConfidence([...combined, ...hitsB]),
      citations: bothCitations,
      followUps: [],
      mnemonicCs: null,
      correctPoints: [],
      missingPoints: [],
      wrongPoints: [],
      aiStatus,
    });
  }

  if (task === "follow_up_questions") {
    if (snippets.length === 0) {
      return insufficientVysvetliResponse(task, aiStatus);
    }
    const followUps = followUpsFromEvidence(snippets, queryA);
    return okResponse({
      task,
      titleCs,
      bodyCs:
        followUps.length > 0
          ? `Kontrolní otázky ze zdroje k „${queryA}“ — odpověz bez nápovědy, pak srovnej se zdrojem.`
          : INSUFFICIENT_EVIDENCE_CS,
      confidence,
      citations,
      followUps,
      mnemonicCs: null,
      correctPoints: [],
      missingPoints: [],
      wrongPoints: [],
      aiStatus,
    });
  }

  if (task === "why_wrong") {
    const studentAnswer = (req.studentAnswer || "").trim();
    if (!studentAnswer || snippets.length === 0) {
      return insufficientVysvetliResponse(task, aiStatus);
    }
    const keyIdeas = extractKeyPhrasesFromSource(snippets.join(" "), 8).map(
      (label, i) => ({
        id: `k-${i}`,
        label,
        synonyms: [] as string[],
        required: true,
      }),
    );
    if (keyIdeas.length < 2) {
      return insufficientVysvetliResponse(task, aiStatus);
    }
    const ideal = snippets.slice(0, 3).join(" ").slice(0, 800);
    const open = evaluateOpenAnswer({
      studentAnswer,
      keyIdeas,
      idealAnswer: ideal,
      sourceEvidence: citations[0]
        ? {
            quote: citations[0].sourceText,
            sourceLabel: citations[0].documentTitle,
            pageStart: citations[0].pageStart,
            pageEnd: citations[0].pageEnd,
          }
        : null,
    });
    const body = [
      "Proč odpověď nesedí vůči dostupným materiálům:",
      open.whatWasCorrect.length
        ? `Správně: ${open.whatWasCorrect.slice(0, 4).join(", ")}.`
        : "Správné body ze zdroje v odpovědi skoro nejsou.",
      open.whatWasMissing.length
        ? `Chybí: ${open.whatWasMissing.slice(0, 4).join(", ")}.`
        : "",
      open.whatWasWrong.length
        ? `Problematické: ${open.whatWasWrong.slice(0, 3).join(" ")}`
        : "",
      "",
      "Očekávané body ze zdroje:",
      ...keyIdeas.slice(0, 6).map((k) => `• ${k.label}`),
    ]
      .filter(Boolean)
      .join("\n");

    return okResponse({
      task,
      titleCs,
      bodyCs: body,
      confidence,
      citations,
      followUps: [],
      mnemonicCs: null,
      correctPoints: open.whatWasCorrect,
      missingPoints: open.whatWasMissing,
      wrongPoints: open.whatWasWrong,
      aiStatus,
    });
  }

  if (task === "mnemonic") {
    const sourceBlob = citations.map((c) => c.sourceText).join(" ");
    const mnemonic = mnemonicFromSourceTokens(sourceBlob, queryA);
    if (!mnemonic) {
      return insufficientVysvetliResponse(task, aiStatus);
    }
    return okResponse({
      task,
      titleCs,
      bodyCs: `Pomůcka odvozená jen z klíčových slov ve zdroji (žádná nová fakta):\n${mnemonic}`,
      confidence,
      citations,
      followUps: [],
      mnemonicCs: mnemonic,
      correctPoints: [],
      missingPoints: [],
      wrongPoints: [],
      aiStatus,
    });
  }

  return insufficientVysvetliResponse(task, aiStatus);
}
