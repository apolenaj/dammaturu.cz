/**
 * Maturita CERMAT – Český jazyk a literatura
 * Official common-part didactic-test curriculum model (school year 2025/2026).
 *
 * Authoritative reference (CERMAT / MŠMT):
 * „Katalog požadavků zkoušek společné části maturitní zkoušky – Český jazyk a literatura“
 * platný od šk. r. 2017/2018, CERMAT uvádí platnost pro didaktický test 2025/2026:
 * https://maturita.cermat.cz/menu/katalogy-pozadavku
 * PDF: /files/files/katalog-pozadavku/katalog-pozadavku-2018-CJL.pdf
 *
 * Only Část A §1 Didaktický test (1.1–1.9) is in scope for the national common part.
 * Písemná práce (2.x) and ústní (3.x) are profile/school layers — NOT this curriculum.
 */

export const CERMAT_CURRICULUM_ID = "maturita-cermat-cjl-didactic" as const;
export const CERMAT_CURRICULUM_TITLE_CS =
  "Maturita CERMAT – Český jazyk a literatura" as const;
export const CERMAT_SCHOOL_YEAR = "2025/2026" as const;

export const CERMAT_CATALOG_CITATION = {
  titleCs:
    "Katalog požadavků zkoušek společné části maturitní zkoušky – Český jazyk a literatura",
  validFromSchoolYear: "2017/2018",
  appliedSchoolYear: CERMAT_SCHOOL_YEAR,
  authority: "CERMAT / MŠMT",
  documentId: "MSMT-7943/2016",
  approvedOn: "2016-04-19",
  sourceUrl: "https://maturita.cermat.cz/menu/katalogy-pozadavku",
  pdfPath: "/files/files/katalog-pozadavku/katalog-pozadavku-2018-CJL.pdf",
  pdfUrl:
    "https://maturita.cermat.cz/files/files/katalog-pozadavku/katalog-pozadavku-2018-CJL.pdf",
  scopeNoteCs:
    "Pro šk. r. 2025/2026 platí katalog pro didaktický test společné části. Části o písemné práci a ústní zkoušce od 2020/2021 nejsou společnou částí — stanovuje je ředitel školy.",
} as const;

/** Product lanes — never confuse A with B. */
export const productLanes = ["moje_materialy", "cermat_priprava"] as const;
export type ProductLane = (typeof productLanes)[number];

export const productLaneLabelsCs: Record<ProductLane, string> = {
  moje_materialy: "Moje materiály",
  cermat_priprava: "CERMAT příprava",
};

export const productLaneHintsCs: Record<ProductLane, string> = {
  moje_materialy:
    "Školní / tvoje podklady a katalog ČJL v aplikaci. Nejsou oficiálním didaktickým testem CERMAT.",
  cermat_priprava:
    "Společná část maturity — didaktický test ČJL podle katalogu CERMAT (stejná napříč školami).",
};

/**
 * Coverage matrix rows requested by product (map onto official §1.x IDs).
 */
export const cermatCoverageAreas = [
  "spelling",
  "word_formation_morphology_meaning",
  "syntax_sentence_compound",
  "text_comprehension",
  "text_character_function_style",
  "text_structure_cohesion",
  "literary_history",
  "literary_theory",
] as const;

export type CermatCoverageArea = (typeof cermatCoverageAreas)[number];

export const cermatCoverageAreaLabelsCs: Record<CermatCoverageArea, string> = {
  spelling: "Český pravopis",
  word_formation_morphology_meaning:
    "Slovotvorba / morfologie / význam pojmenování",
  syntax_sentence_compound: "Skladba věty jednoduché a souvětí",
  text_comprehension: "Porozumění textu",
  text_character_function_style: "Charakter / funkce / styl textu",
  text_structure_cohesion: "Výstavba textu / koheze",
  literary_history: "Literární historie (vývoj, směry)",
  literary_theory: "Literární teorie (druhy, žánry, tropy…)",
};

/** Official didactic-test requirement IDs (katalog §1). */
export const cermatDidacticRequirementIds = [
  "cermat-cjl-dt-1.1",
  "cermat-cjl-dt-1.2",
  "cermat-cjl-dt-1.3",
  "cermat-cjl-dt-1.4",
  "cermat-cjl-dt-1.5",
  "cermat-cjl-dt-1.6",
  "cermat-cjl-dt-1.7",
  "cermat-cjl-dt-1.8",
  "cermat-cjl-dt-1.9",
] as const;

export type CermatDidacticRequirementId =
  (typeof cermatDidacticRequirementIds)[number];

export type CermatDidacticRequirement = {
  id: CermatDidacticRequirementId;
  /** Katalog numbering, e.g. "1.1" */
  catalogCode: string;
  titleCs: string;
  summaryCs: string;
  coverageArea: CermatCoverageArea;
  /** Bullet skills from katalog (verbatim shortened). */
  subSkillsCs: string[];
};

export const CERMAT_DIDACTIC_REQUIREMENTS: CermatDidacticRequirement[] = [
  {
    id: "cermat-cjl-dt-1.1",
    catalogCode: "1.1",
    titleCs: "Ovládá pravidla českého pravopisu",
    summaryCs: "Pravopisné normy v izolaci i v kontextu věty/textu.",
    coverageArea: "spelling",
    subSkillsCs: [
      "Aplikuje pravidla českého pravopisu (i/y, předložky, velká písmena, interpunkce aj.).",
    ],
  },
  {
    id: "cermat-cjl-dt-1.2",
    catalogCode: "1.2",
    titleCs: "Slovotvorná a morfologická analýza",
    summaryCs: "Slovní druhy, mluvnické kategorie, tvoření slov, morfémy.",
    coverageArea: "word_formation_morphology_meaning",
    subSkillsCs: [
      "Určí slovnědruhovou platnost slova",
      "Určí mluvnické kategorie u ohebných slovních druhů",
      "Nalezne / opraví chybný (nekodifikovaný) tvar",
      "Vytvoří spisovný tvar slova",
      "Rozliší způsoby tvoření slov (odvozování, skládání, zkracování)",
      "Určí předponu, kořen, příponu, koncovku",
      "Určí základové slovo ke slovu odvozenému",
    ],
  },
  {
    id: "cermat-cjl-dt-1.3",
    catalogCode: "1.3",
    titleCs: "Význam pojmenování",
    summaryCs: "Význam v kontextu, synonyma/antonyma, obraznost, vhodnost.",
    coverageArea: "word_formation_morphology_meaning",
    subSkillsCs: [
      "Postihne význam pojmenování v kontextu i mimo něj",
      "Nalezne nevhodně užité slovo / vhodnou náhradu",
      "Nalezne synonyma a antonyma",
      "Rozezná obrazné a neobrazné pojmenování",
    ],
  },
  {
    id: "cermat-cjl-dt-1.4",
    catalogCode: "1.4",
    titleCs: "Syntaktická analýza věty a souvětí",
    summaryCs: "Větné členy, souvětí, odchylky od pravidelné stavby.",
    coverageArea: "syntax_sentence_compound",
    subSkillsCs: [
      "Určí větné členy, provede analýzu souvětí",
      "Nalezne odchylky od pravidelné větné stavby / opraví celek",
      "Nalezne syntaktické nedostatky (předložky, spojovací výrazy, slovosled)",
    ],
  },
  {
    id: "cermat-cjl-dt-1.5",
    catalogCode: "1.5",
    titleCs: "Porozumění textu",
    summaryCs: "Informace, téma, inference, podtext, srovnání textů.",
    coverageArea: "text_comprehension",
    subSkillsCs: [
      "Nalezne požadované informace",
      "Vystihne hlavní myšlenku / identifikuje téma",
      "Rozliší podstatné a nepodstatné informace",
      "Charakterizuje subjektivitu / objektivitu",
      "Rozliší komunikační funkce",
      "Rozliší domněnku od faktického konstatování",
      "Postihne podtext / symbolický význam",
      "Rozezná manipulaci, ironii, nadsázku",
      "Porovná informace z různých textů",
    ],
  },
  {
    id: "cermat-cjl-dt-1.6",
    catalogCode: "1.6",
    titleCs: "Základní charakter textu",
    summaryCs: "Účel, funkce, funkční styl, komunikační situace.",
    coverageArea: "text_character_function_style",
    subSkillsCs: [
      "Určí účel textu a jeho funkce",
      "Posoudí funkčnost jazykových prostředků",
      "Rozezná útvarové a funkční prostředky (obecná čeština, dialekt, slang…)",
      "Přiřadí text k funkčnímu stylu / slohovému útvaru / postupu",
      "Orientuje se v komunikační situaci",
    ],
  },
  {
    id: "cermat-cjl-dt-1.7",
    catalogCode: "1.7",
    titleCs: "Výstavba výpovědi a textu",
    summaryCs: "Celková výstavba, doplňování, textová návaznost.",
    coverageArea: "text_structure_cohesion",
    subSkillsCs: [
      "Posoudí celkovou výstavbu textu / nalezne nedostatky",
      "Doplní podle smyslu vynechané části",
      "Uspořádá části textu v souladu s textovou návazností",
    ],
  },
  {
    id: "cermat-cjl-dt-1.8",
    catalogCode: "1.8",
    titleCs: "Vývoj české a světové literatury",
    summaryCs: "Přehled vývoje, směry a hnutí, přiřazení textu ke směru.",
    coverageArea: "literary_history",
    subSkillsCs: [
      "Základní přehled o vývoji české a světové literatury",
      "Rozezná základní literární směry a hnutí",
      "Přiřadí text k příslušnému literárnímu směru",
    ],
  },
  {
    id: "cermat-cjl-dt-1.9",
    catalogCode: "1.9",
    titleCs: "Literární teorie na konkrétním textu",
    summaryCs: "Druhy, žánry, vypravěč, tropy a figury, verš, rým.",
    coverageArea: "literary_theory",
    subSkillsCs: [
      "Rozliší prózu/poezie; lyrický/epický/dramatický text",
      "Rozezná literární druhy a žánry",
      "Rozezná autora, vypravěče / lyrický subjekt, postavy",
      "Rozezná typy promluv a vyprávěcí způsoby",
      "Nalezne motiv, téma; kompoziční postupy",
      "Nalezne tropy a figury",
      "Rozliší vázaný a volný verš; typ rýmového schématu",
    ],
  },
];

export function requirementById(
  id: string,
): CermatDidacticRequirement | undefined {
  return CERMAT_DIDACTIC_REQUIREMENTS.find((r) => r.id === id);
}

export function requirementsForArea(
  area: CermatCoverageArea,
): CermatDidacticRequirement[] {
  return CERMAT_DIDACTIC_REQUIREMENTS.filter((r) => r.coverageArea === area);
}

/** Honest product claim — never assert complete prep while gaps remain. */
export const CERMAT_COMPLETE_PREP_CLAIM_FORBIDDEN_CS =
  "Kompletní příprava na CERMAT" as const;

export const CERMAT_HONEST_SCOPE_CS =
  "Cvičná příprava podle katalogu CERMAT ČJL (didaktický test). Nejsou to oficiální minulá zadání CERMAT, pokud není u položky výslovně uvedeno jinak. Školní ústní seznam a nahrané materiály patří do Moje materiály / Profil maturity — ne nahrazují společný didaktický test." as const;
