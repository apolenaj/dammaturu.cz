import type { CermatCategory } from "@/domain/learning/cermat-prep";
import {
  type CermatDidacticRequirementId,
  cermatDidacticRequirementIds,
} from "@/domain/cermat-curriculum/requirements";

/**
 * Map existing product content → zero or more official CERMAT requirement IDs.
 * Conservative: prefer under-claiming over pretending coverage.
 */

export type KuMappingSubject = {
  knowledgeUnitId: string;
  title: string;
  statement: string;
  kind?: string | null;
  topicSlug?: string | null;
  sourceId?: string | null;
  sourceTitle?: string | null;
  sourceTopic?: string | null;
  laneHint?: "catalog" | "cermat_pack" | "question_engine" | "other";
};

/** Default requirement IDs by study-catalog sourceId. */
export const SOURCE_ID_REQUIREMENT_MAP: Record<
  string,
  CermatDidacticRequirementId[]
> = {
  "cjl-homonyma": ["cermat-cjl-dt-1.3"],
  "cjl-realismus": ["cermat-cjl-dt-1.8"],
  "cjl-realismus-francie": ["cermat-cjl-dt-1.8"],
  "cjl-realismus-rusko": ["cermat-cjl-dt-1.8"],
  "cjl-realismus-anglie": ["cermat-cjl-dt-1.8"],
  "cjl-romantismus": ["cermat-cjl-dt-1.8"],
  "cjl-narodni-obrozeni": ["cermat-cjl-dt-1.8"],
  "cjl-maj": ["cermat-cjl-dt-1.8"],
  "cjl-kytice": ["cermat-cjl-dt-1.8"],
  "cjl-babicka": ["cermat-cjl-dt-1.8"],
  "cjl-jirasek": ["cermat-cjl-dt-1.8"],
  "cjl-ceske-drama-19": ["cermat-cjl-dt-1.8", "cermat-cjl-dt-1.9"],
};

/** Practice pack categories → official IDs. */
export const CERMAT_CATEGORY_REQUIREMENT_MAP: Record<
  CermatCategory,
  CermatDidacticRequirementId[]
> = {
  orthography: ["cermat-cjl-dt-1.1"],
  morphology: ["cermat-cjl-dt-1.2"],
  word_meaning: ["cermat-cjl-dt-1.3"],
  syntax: ["cermat-cjl-dt-1.4"],
  text_comprehension: ["cermat-cjl-dt-1.5"],
  language: ["cermat-cjl-dt-1.6"],
  work_with_text: ["cermat-cjl-dt-1.5", "cermat-cjl-dt-1.7"],
  literary_knowledge: ["cermat-cjl-dt-1.8", "cermat-cjl-dt-1.9"],
};

const TOPIC_SLUG_HINTS: Array<{
  match: RegExp;
  ids: CermatDidacticRequirementId[];
}> = [
  {
    match: /homonym|synonym|antonym|mnohoz|polys|lexik/i,
    ids: ["cermat-cjl-dt-1.3"],
  },
  {
    match: /pravopis|ortho|interpunk/i,
    ids: ["cermat-cjl-dt-1.1"],
  },
  {
    match: /morfolog|tvaroslov|slovotvor|sklon|casovan/i,
    ids: ["cermat-cjl-dt-1.2"],
  },
  {
    match: /syntax|skladb|souvet|vetn/i,
    ids: ["cermat-cjl-dt-1.4"],
  },
  {
    match: /styl|funkcn|sloh/i,
    ids: ["cermat-cjl-dt-1.6"],
  },
  {
    match: /romant|realis|naturalis|obrozen|směr|smer/i,
    ids: ["cermat-cjl-dt-1.8"],
  },
  {
    match: /drama|poezie|proza|zanr|trop|metafor|vers|rymu/i,
    ids: ["cermat-cjl-dt-1.9"],
  },
];

const TEXT_HINTS: Array<{
  match: RegExp;
  ids: CermatDidacticRequirementId[];
}> = [
  {
    match: /\b(i\/y|pravopisn|pravopis|velk[aá] p[ií]smen|interpunkc)/i,
    ids: ["cermat-cjl-dt-1.1"],
  },
  {
    match:
      /\b(slovn[ií] druh|mluvnick(é|ych) kategori|skloňov|časován|předpon[auy]|přípon[auy]|koncovk|odvozov|skládán[ií] slov|morfolog)/i,
    ids: ["cermat-cjl-dt-1.2"],
  },
  {
    match: /\b(synonym|antonym|homonym|polysém|význam pojmen|obrazn[ée] pojmen)/i,
    ids: ["cermat-cjl-dt-1.3"],
  },
  {
    match:
      /\b(větn[ýé] člen|souvět[ií]|podmět|přísudek|přívlastek větný|předmět ve větě|příslovečn[ée] určení|větná skladba|syntakt)/i,
    ids: ["cermat-cjl-dt-1.4"],
  },
  {
    match:
      /\b(hlavní myšlenk|porozuměn[ií] text|vyplývá z textu|podtext|dezinterpret)/i,
    ids: ["cermat-cjl-dt-1.5"],
  },
  {
    match:
      /\b(funkční styl|administrativn|publicistick|odborný styl|slohový postup|slohový útvar)/i,
    ids: ["cermat-cjl-dt-1.6"],
  },
  {
    match: /\b(kohe[sz]e|textov(á|é) návaznost|výstavb[aay] textu|uspořád(á|ej) části textu)/i,
    ids: ["cermat-cjl-dt-1.7"],
  },
  {
    match:
      /\b(romantismus|realismus|naturalismus|národní obrozen|literární směr|literární hnutí)/i,
    ids: ["cermat-cjl-dt-1.8"],
  },
  {
    match:
      /\b(metafor[ay]|metonymi|personifik|lyrick[ýé]|epick[ýé]|dramatick[ýé]|rýmov|trop[yu]|figury)/i,
    ids: ["cermat-cjl-dt-1.9"],
  },
];

function uniqueIds(
  ids: CermatDidacticRequirementId[],
): CermatDidacticRequirementId[] {
  const set = new Set<CermatDidacticRequirementId>();
  for (const id of ids) {
    if (cermatDidacticRequirementIds.includes(id)) set.add(id);
  }
  return [...set];
}

/**
 * Map one knowledge unit (or analogous learning atom) to official requirement IDs.
 * Returns [] when nothing reliably matches — that is allowed and preferred.
 */
export function mapKnowledgeUnitToRequirementIds(
  unit: KuMappingSubject,
): CermatDidacticRequirementId[] {
  const out: CermatDidacticRequirementId[] = [];

  if (unit.sourceId && SOURCE_ID_REQUIREMENT_MAP[unit.sourceId]) {
    out.push(...SOURCE_ID_REQUIREMENT_MAP[unit.sourceId]!);
  }

  const slug = unit.topicSlug ?? "";
  for (const hint of TOPIC_SLUG_HINTS) {
    if (hint.match.test(slug)) out.push(...hint.ids);
  }

  const hay = [
    unit.title,
    unit.statement,
    unit.sourceTitle ?? "",
    unit.sourceTopic ?? "",
    unit.kind ?? "",
  ].join("\n");
  for (const hint of TEXT_HINTS) {
    if (hint.match.test(hay)) out.push(...hint.ids);
  }

  return uniqueIds(out);
}

export function mapCermatCategoryToRequirementIds(
  category: CermatCategory,
): CermatDidacticRequirementId[] {
  return [...CERMAT_CATEGORY_REQUIREMENT_MAP[category]];
}
