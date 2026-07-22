import { z } from "zod";
import {
  evidenceConfidenceStates,
  INSUFFICIENT_EVIDENCE_CS,
  sourceCitationSchema,
  type EvidenceConfidence,
  type SourceCitation,
} from "@/domain/learning/grounded-study";

/**
 * „Vysvětli mi to“ — grounded study assistant (not a generic chatbot).
 * Factual answers only from: (1) uploaded study materials,
 * (2) explicitly approved authoritative catalog sources.
 * Never silently uses unsupported model memory for exam facts.
 */

export const vysvetliTasks = [
  "explain_paragraph",
  "summarize_topic",
  "give_example",
  "compare_concepts",
  "follow_up_questions",
  "why_wrong",
  "mnemonic",
] as const;

export type VysvetliTask = (typeof vysvetliTasks)[number];

export const vysvetliTaskLabelsCs: Record<VysvetliTask, string> = {
  explain_paragraph: "Vysvětli odstavec jednoduše",
  summarize_topic: "Shrň téma",
  give_example: "Dej příklad",
  compare_concepts: "Porovnej dva pojmy",
  follow_up_questions: "Kontrolní otázky",
  why_wrong: "Proč je odpověď špatně",
  mnemonic: "Pomůcka na zapamatování",
};

export const vysvetliTaskHintsCs: Record<VysvetliTask, string> = {
  explain_paragraph:
    "Vyber nebo vlož odstavec z materiálu — dostaneš jednoduché vysvětlení jen ze zdroje.",
  summarize_topic: "Shrnutí tématu podle dostupných podkladů.",
  give_example: "Příklad / ne-příklad odvozený ze zdrojového textu (ne vymyšlený).",
  compare_concepts: "Porovnání dvou pojmů, pokud oba jsou ve zdrojích.",
  follow_up_questions:
    "Krátké retrieval otázky z klíčových bodů zdroje — procvičení vybavování.",
  why_wrong:
    "Vysvětlení, proč odpověď nesedí vůči zdroji (správné / chybějící body).",
  mnemonic:
    "Mnemotechnika jen když ji lze odvodit z klíčových slov ve zdroji.",
};

export const vysvetliSourceKinds = [
  "uploaded_material",
  "approved_catalog",
] as const;

export type VysvetliSourceKind = (typeof vysvetliSourceKinds)[number];

export const vysvetliSourceKindLabelsCs: Record<VysvetliSourceKind, string> = {
  uploaded_material: "Nahraný materiál",
  approved_catalog: "Schválený katalog",
};

export const vysvetliAiStatuses = [
  "not_used",
  "unavailable",
  "not_entitled",
  "disabled",
] as const;

export type VysvetliAiStatus = (typeof vysvetliAiStatuses)[number];

export const vysvetliAiStatusLabelsCs: Record<VysvetliAiStatus, string> = {
  not_used: "Odpověď je ze zdrojů (bez AI).",
  unavailable: "AI teď není k dispozici — použil jsem jen zdroje.",
  not_entitled: "AI vysvětlení není v plánu — jádro funguje ze zdrojů.",
  disabled: "AI je vypnuté — jádro učení běží dál ze zdrojů.",
};

export const vysvetliRequestSchema = z.object({
  task: z.enum(vysvetliTasks),
  /** Main query / topic / concept A. */
  query: z.string().min(1).max(2000),
  /** Optional paragraph selection for explain_paragraph. */
  selectedParagraph: z.string().max(4000).optional(),
  /** Second concept for compare_concepts. */
  compareWith: z.string().max(200).optional(),
  /** Student answer for why_wrong. */
  studentAnswer: z.string().max(2000).optional(),
  materialIds: z.array(z.string().uuid()).max(8).default([]),
  /** Include approved catalog DOCX sources. */
  includeApprovedCatalog: z.boolean().default(true),
});

export type VysvetliRequest = z.infer<typeof vysvetliRequestSchema>;

export const vysvetliCitationSchema = sourceCitationSchema.extend({
  sourceKind: z.enum(vysvetliSourceKinds),
});

export type VysvetliCitation = z.infer<typeof vysvetliCitationSchema>;

export const vysvetliFollowUpSchema = z.object({
  id: z.string().min(1).max(40),
  questionCs: z.string().min(1).max(300),
  expectedKeyCs: z.string().min(1).max(200),
});

export type VysvetliFollowUp = z.infer<typeof vysvetliFollowUpSchema>;

export const vysvetliResponseSchema = z.object({
  task: z.enum(vysvetliTasks),
  titleCs: z.string().min(1).max(120),
  bodyCs: z.string().min(1).max(4000),
  insufficient: z.boolean(),
  confidence: z.enum(evidenceConfidenceStates),
  citations: z.array(vysvetliCitationSchema).max(12),
  followUps: z.array(vysvetliFollowUpSchema).max(8).default([]),
  mnemonicCs: z.string().max(400).nullable().optional(),
  correctPoints: z.array(z.string().max(200)).max(12).default([]),
  missingPoints: z.array(z.string().max(200)).max(12).default([]),
  wrongPoints: z.array(z.string().max(200)).max(12).default([]),
  aiStatus: z.enum(vysvetliAiStatuses),
  aiNoteCs: z.string().max(240).nullable(),
  disclaimerCs: z.string().min(1).max(400),
});

export type VysvetliResponse = z.infer<typeof vysvetliResponseSchema>;

export const VYSVETLI_DISCLAIMER_CS =
  "Vysvětli mi to není chatbot. Fakta jen z nahraných materiálů a schváleného katalogu — nikdy z nepodložené paměti modelu.";

export const vysvetliConfig = {
  maxCitations: 8,
  maxFollowUps: 5,
  minParagraphChars: 40,
  minEvidenceScore: 0.28,
} as const;

export function insufficientVysvetliResponse(
  task: VysvetliTask,
  aiStatus: VysvetliAiStatus = "not_used",
): VysvetliResponse {
  return {
    task,
    titleCs: vysvetliTaskLabelsCs[task],
    bodyCs: INSUFFICIENT_EVIDENCE_CS,
    insufficient: true,
    confidence: "insufficient",
    citations: [],
    followUps: [],
    mnemonicCs: null,
    correctPoints: [],
    missingPoints: [],
    wrongPoints: [],
    aiStatus,
    aiNoteCs: vysvetliAiStatusLabelsCs[aiStatus],
    disclaimerCs: VYSVETLI_DISCLAIMER_CS,
  };
}

/**
 * Build a mnemonic ONLY from source key tokens — never invent exam facts.
 * Returns null if source is too thin.
 */
export function mnemonicFromSourceTokens(
  sourceText: string,
  topicHint?: string,
): string | null {
  const words = sourceText
    .split(/[^\p{L}\p{N}]+/u)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4);
  const stop = new Set([
    "který",
    "která",
    "které",
    "tohoto",
    "protože",
    "nebo",
    "také",
    "podle",
    "jejich",
    "jako",
    "mezi",
    "při",
  ]);
  const picked: string[] = [];
  const seen = new Set<string>();
  for (const w of words) {
    const key = w.toLowerCase();
    if (stop.has(key) || seen.has(key)) continue;
    seen.add(key);
    picked.push(w);
    if (picked.length >= 5) break;
  }
  if (picked.length < 3) return null;
  const initials = picked.map((w) => w[0]!.toUpperCase()).join("-");
  const topic = topicHint?.trim() ? ` k „${topicHint.trim()}“` : "";
  return `Zapamatuj si${topic} (ze zdroje): ${initials} → ${picked.join(" · ")}.`;
}

export function simplifyParagraphFromSource(paragraph: string): string {
  const sentences = paragraph
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
  const lead = sentences.slice(0, 3).join(" ");
  const body = (lead || paragraph).slice(0, 700);
  return `Jednoduše (ze zdroje):\n${body}${body.length >= 700 ? "…" : ""}`;
}

export function summarizeFromEvidence(snippets: string[], topic: string): string {
  const bullets = snippets
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((s) => `• ${s.slice(0, 280)}${s.length > 280 ? "…" : ""}`);
  if (bullets.length === 0) return INSUFFICIENT_EVIDENCE_CS;
  return `Shrnutí tématu „${topic}“ podle dostupných materiálů:\n${bullets.join("\n")}`;
}

export function exampleFromEvidence(snippets: string[], topic: string): string {
  const primary = snippets[0]?.trim();
  if (!primary || primary.length < 20) return INSUFFICIENT_EVIDENCE_CS;
  return [
    `Příklad ze zdroje k „${topic}“:`,
    primary.slice(0, 400),
    "",
    "Ne-příklad: cokoli, co ve zdroji není — nepřidávám vymyšlená fakta.",
  ].join("\n");
}

export function compareFromEvidence(input: {
  conceptA: string;
  conceptB: string;
  snippetsA: string[];
  snippetsB: string[];
}): string {
  if (!input.snippetsA.length || !input.snippetsB.length) {
    return INSUFFICIENT_EVIDENCE_CS;
  }
  return [
    `Porovnání (jen ze zdrojů):`,
    "",
    `„${input.conceptA}“:`,
    ...input.snippetsA.slice(0, 2).map((s) => `• ${s.slice(0, 240)}`),
    "",
    `„${input.conceptB}“:`,
    ...input.snippetsB.slice(0, 2).map((s) => `• ${s.slice(0, 240)}`),
    "",
    "Společné / rozdíly uvádím jen tam, kde oba zdroje dávají podklad — nic nedoplňuji z paměti.",
  ].join("\n");
}

export function followUpsFromEvidence(
  snippets: string[],
  topic: string,
): VysvetliFollowUp[] {
  const out: VysvetliFollowUp[] = [];
  for (let i = 0; i < Math.min(vysvetliConfig.maxFollowUps, snippets.length); i++) {
    const snip = snippets[i]!.trim();
    if (snip.length < 24) continue;
    const key = snip.split(/[.!?]/)[0]?.trim().slice(0, 120) || snip.slice(0, 80);
    out.push({
      id: `fu-${i + 1}`,
      questionCs: `Co říká materiál o: ${key}?`,
      expectedKeyCs: key,
    });
  }
  if (out.length === 0 && topic.trim()) {
    out.push({
      id: "fu-1",
      questionCs: `Vybav si ze zdroje: co je podstatné u „${topic.trim()}“?`,
      expectedKeyCs: topic.trim().slice(0, 120),
    });
  }
  return out.slice(0, vysvetliConfig.maxFollowUps);
}

export function toVysvetliCitation(
  citation: SourceCitation,
  sourceKind: VysvetliSourceKind,
): VysvetliCitation {
  return { ...citation, sourceKind };
}

export type { EvidenceConfidence, SourceCitation };
