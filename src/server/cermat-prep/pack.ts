import {
  CERMAT_PREP_DISCLAIMER_CS,
  cermatProvenanceLabelsCs,
  type CermatItem,
  type CermatPack,
} from "@/domain/learning/cermat-prep";

const PROV = "exam_style_generated" as const;
const PROV_LABEL = cermatProvenanceLabelsCs.exam_style_generated;
const SRC = "Cvičný pack DámMaturu — exam-style generated (ne oficiální CERMAT)";

function item(
  partial: Omit<
    CermatItem,
    "provenance" | "provenanceLabelCs" | "sourceNoteCs"
  >,
): CermatItem {
  return {
    ...partial,
    provenance: PROV,
    provenanceLabelCs: PROV_LABEL,
    sourceNoteCs: SRC,
  };
}

/**
 * Seed pack: clearly labeled generated exam-style items across CERMAT skill categories.
 * Do NOT claim these are official CERMAT past papers.
 */
export function buildCermatCjlPrepPack(
  nowIso = new Date().toISOString(),
): CermatPack {
  const items: CermatItem[] = [
    item({
      id: "lang-style-1",
      category: "language",
      format: "single_choice",
      stemCs:
        "Ve kterém funkčním stylu je typická formulace: „Vážení zákazníci, dovolujeme si Vás informovat…“?",
      passageCs: null,
      options: [
        { id: "a", labelCs: "Hovorový" },
        { id: "b", labelCs: "Administrativní / úřední" },
        { id: "c", labelCs: "Umělecký" },
        { id: "d", labelCs: "Odborný vědecký" },
      ],
      correctAnswer: "b",
      explanationCs:
        "Zdvořilé, ustálené obraty a pasivní zdvořilost patří k administrativnímu (úřednímu) stylu. Hovorový je neformální; umělecký cílí na estetiku; vědecký na přesnost terminologie.",
      difficulty: 2,
    }),
    item({
      id: "lang-register-1",
      category: "language",
      format: "true_false",
      stemCs:
        "V odborném stylu je běžné používat citoslovce a nespisovné výrazy jako hlavní prostředek přesnosti.",
      passageCs: null,
      options: [
        { id: "true", labelCs: "Ano" },
        { id: "false", labelCs: "Ne" },
      ],
      correctAnswer: "false",
      explanationCs:
        "Ne — odborný styl cílí na přesnost, terminologii a spisovnost; citoslovce a nespisovnost tam nepatří.",
      difficulty: 1,
    }),
    item({
      id: "ortho-iy-1",
      category: "orthography",
      format: "error_spotting",
      stemCs: "Ve které větě je pravopisná chyba?",
      passageCs: null,
      options: [
        { id: "a", labelCs: "Žáci se učili o českých dějinách." },
        { id: "b", labelCs: "Na stole ležely nové knižky." },
        { id: "c", labelCs: "Myši se schovaly do sklepa." },
        { id: "d", labelCs: "Včely se vrátily do úlu." },
      ],
      correctAnswer: "b",
      explanationCs:
        "Chyba je ve slově „knižky“ — správně „knížky“ (i po měkké souhlásce). Ostatní věty jsou v pořádku.",
      difficulty: 2,
    }),
    item({
      id: "ortho-cap-1",
      category: "orthography",
      format: "single_choice",
      stemCs: "Která varianta je pravopisně správná?",
      passageCs: null,
      options: [
        { id: "a", labelCs: "česká republika (stát)" },
        { id: "b", labelCs: "Česká republika (stát)" },
        { id: "c", labelCs: "Česká Republika (stát)" },
        { id: "d", labelCs: "česká Republika (stát)" },
      ],
      correctAnswer: "b",
      explanationCs:
        "Oficiální název státu píšeme s velkým „Č“: Česká republika. „Republika“ v tomto spojení malým.",
      difficulty: 2,
    }),
    item({
      id: "ortho-comma-1",
      category: "orthography",
      format: "single_choice",
      stemCs: "Která věta má správně čárku?",
      passageCs: null,
      options: [
        { id: "a", labelCs: "Když skončil test šel domů." },
        { id: "b", labelCs: "Když skončil test, šel domů." },
        { id: "c", labelCs: "Když, skončil test šel domů." },
        { id: "d", labelCs: "Když skončil, test šel domů." },
      ],
      correctAnswer: "b",
      explanationCs:
        "Vedlejší věta „Když skončil test“ se odděluje čárkou od hlavní „šel domů“.",
      difficulty: 2,
    }),
    item({
      id: "morph-pos-1",
      category: "morphology",
      format: "single_choice",
      stemCs: "Urči slovní druh slova „rychle“ ve větě: „Běžel rychle.“",
      passageCs: null,
      options: [
        { id: "a", labelCs: "Přídavné jméno" },
        { id: "b", labelCs: "Příslovce" },
        { id: "c", labelCs: "Podstatné jméno" },
        { id: "d", labelCs: "Citoslovce" },
      ],
      correctAnswer: "b",
      explanationCs:
        "„Rychle“ vyjadřuje okolnost děje (jak?) → příslovce. Přídavné by bylo „rychlý“.",
      difficulty: 1,
    }),
    item({
      id: "morph-agree-1",
      category: "morphology",
      format: "error_spotting",
      stemCs: "Kde je chyba ve shodě přísudku s podmětem?",
      passageCs: null,
      options: [
        { id: "a", labelCs: "Děti si hrály na dvoře." },
        { id: "b", labelCs: "Města byla osvětlena." },
        { id: "c", labelCs: "Holky a kluci přišel pozdě." },
        { id: "d", labelCs: "Knihy ležely na stole." },
      ],
      correctAnswer: "c",
      explanationCs:
        "U podmětu „holky a kluci“ (různé rody, mužský životný) je správně „přišli“. Tvar „přišel“ je chybná shoda.",
      difficulty: 3,
    }),
    item({
      id: "syntax-clause-1",
      category: "syntax",
      format: "single_choice",
      stemCs:
        "Ve větě „Když pršelo, zůstali jsme doma.“ je věta „Když pršelo“:",
      passageCs: null,
      options: [
        { id: "a", labelCs: "Hlavní větou" },
        { id: "b", labelCs: "Vedlejší větou příslovečnou (časovou)" },
        { id: "c", labelCs: "Vedlejší větou předmětnou" },
        { id: "d", labelCs: "Vsuťkou" },
      ],
      correctAnswer: "b",
      explanationCs:
        "Spojka „když“ uvozuje vedlejší větu příslovečnou časovou; hlavní je „zůstali jsme doma“.",
      difficulty: 2,
    }),
    item({
      id: "syntax-member-1",
      category: "syntax",
      format: "single_choice",
      stemCs: "Co je podmět ve větě „Na stole ležela kniha.“?",
      passageCs: null,
      options: [
        { id: "a", labelCs: "Na stole" },
        { id: "b", labelCs: "ležela" },
        { id: "c", labelCs: "kniha" },
        { id: "d", labelCs: "stole" },
      ],
      correctAnswer: "c",
      explanationCs:
        "Podmět je „kniha“ (kdo/co ležela?). „Na stole“ je příslovečné určení místa.",
      difficulty: 1,
    }),
    item({
      id: "lex-syn-1",
      category: "word_meaning",
      format: "single_choice",
      stemCs: "Které slovo je synonymem k „stručný“?",
      passageCs: null,
      options: [
        { id: "a", labelCs: "Obšírný" },
        { id: "b", labelCs: "Výstižný / krátký" },
        { id: "c", labelCs: "Zdlouhavý" },
        { id: "d", labelCs: "Neurčitý" },
      ],
      correctAnswer: "b",
      explanationCs:
        "„Stručný“ ≈ krátký, výstižný. „Obšírný“ a „zdlouhavý“ jsou spíš antonymní směry.",
      difficulty: 2,
    }),
    item({
      id: "lex-homo-1",
      category: "word_meaning",
      format: "true_false",
      stemCs:
        "Slova „město“ a „místo“ jsou homonyma (stejný tvar, jiný význam).",
      passageCs: null,
      options: [
        { id: "true", labelCs: "Ano" },
        { id: "false", labelCs: "Ne" },
      ],
      correctAnswer: "false",
      explanationCs:
        "Ne — jde o různá slova s podobnou výslovností/pravopisem (paronyma), ne o jedno homonymum se dvěma významy.",
      difficulty: 3,
    }),
    item({
      id: "comp-main-1",
      category: "text_comprehension",
      format: "single_choice",
      stemCs: "Jaká je hlavní myšlenka úryvku?",
      passageCs:
        "Knihovna prodloužila otevírací dobu o víkendu, aby studenti měli klidnější prostor na přípravu k maturitě. Personál zároveň nabízí konzultace k vyhledávání zdrojů.",
      options: [
        { id: "a", labelCs: "Knihovna zdražila služby." },
        {
          id: "b",
          labelCs:
            "Knihovna vychází vstříc studentům delší dobou a pomocí se zdroji.",
        },
        { id: "c", labelCs: "Studenti odmítají maturitu." },
        { id: "d", labelCs: "Personál knihovnu zavírá." },
      ],
      correctAnswer: "b",
      explanationCs:
        "Text zdůrazňuje prodlouženou dobu a konzultace — podpora studentů. Ostatní volby text nepodporuje.",
      difficulty: 2,
    }),
    item({
      id: "comp-infer-1",
      category: "text_comprehension",
      format: "single_choice",
      stemCs: "Co z úryvku vyplývá (není řečeno doslova)?",
      passageCs:
        "Po třetí opravě se Petr rozhodl, že další pokus odejde bez pečlivé přípravy už neudělá.",
      options: [
        { id: "a", labelCs: "Petr už nikdy nepůjde ke zkoušce." },
        {
          id: "b",
          labelCs: "Předchozí pokusy zřejmě nedopadly podle jeho představ.",
        },
        { id: "c", labelCs: "Petr nemá učitele." },
        { id: "d", labelCs: "Zkouška byla zrušena." },
      ],
      correctAnswer: "b",
      explanationCs:
        "Inference: „po třetí opravě“ a rozhodnutí o pečlivé přípravě naznačují předchozí neúspěchy. Extrémní závěry text neumožňuje.",
      difficulty: 3,
    }),
    item({
      id: "lit-move-1",
      category: "literary_knowledge",
      format: "single_choice",
      stemCs:
        "Který směr typicky zdůrazňuje věrné zobrazení soudobé společnosti a typizaci?",
      passageCs: null,
      options: [
        { id: "a", labelCs: "Romantismus" },
        { id: "b", labelCs: "Realismus" },
        { id: "c", labelCs: "Symbolismus" },
        { id: "d", labelCs: "Baroko" },
      ],
      correctAnswer: "b",
      explanationCs:
        "Realismus: soudobá společnost, typizace. Romantismus spíš cit a individualita; symbolismus náznaky; baroko jiná epocha.",
      difficulty: 2,
    }),
    item({
      id: "lit-genre-1",
      category: "literary_knowledge",
      format: "true_false",
      stemCs: "Balada je typicky lyrickoepický žánr s tragickým vyústěním.",
      passageCs: null,
      options: [
        { id: "true", labelCs: "Ano" },
        { id: "false", labelCs: "Ne" },
      ],
      correctAnswer: "true",
      explanationCs:
        "Ano — balada spojuje příběh (epiku) s náladou/lyrikou a často končí tragicky (např. Erben).",
      difficulty: 2,
    }),
    item({
      id: "text-work-1",
      category: "work_with_text",
      format: "fill_blank",
      stemCs:
        "Doplň spisovný tvar: „Včera ___ (já / jít) do knihovny.“ (sloveso jít, 1. os. j. č. min. čas)",
      passageCs: null,
      correctAnswer: ["jsem šel", "šel jsem", "jsem šla", "šla jsem"],
      explanationCs:
        "Minulý čas: „šel jsem“ / „šla jsem“ (podle rodu). Samotné „šel“ bez pomocného slovesa v 1. os. nestačí.",
      difficulty: 2,
    }),
    item({
      id: "text-work-2",
      category: "work_with_text",
      format: "single_choice",
      stemCs:
        "Která úprava úryvku je stylisticky nejvhodnější pro oficiální e-mail učiteli?",
      passageCs: "„čau, pošlete mi ty body z matiky asap thx“",
      options: [
        {
          id: "a",
          labelCs: "Dobrý den, prosím o zaslání bodů z matematiky. Děkuji.",
        },
        { id: "b", labelCs: "Hej, body matika hned." },
        { id: "c", labelCs: "Pošli body, ok?" },
        { id: "d", labelCs: "ASAP body matika pls." },
      ],
      correctAnswer: "a",
      explanationCs:
        "Oficiální komunikace vyžaduje oslovení, spisovnost a zdvořilost. Hovorové zkratky a slang jsou nevhodné.",
      difficulty: 2,
    }),
  ];

  return {
    id: "cermat-cjl-prep",
    slug: "cermat-cjl-prep",
    titleCs: "CERMAT ČJL — didaktický trénink",
    summaryCs:
      "Příprava na společný didaktický test: jazyk, pravopis, morfologie, syntax, význam, porozumění, literatura v testu, práce s textem.",
    disclaimerCs: CERMAT_PREP_DISCLAIMER_CS,
    timedSecondsDefault: 20 * 60,
    items,
    updatedAt: nowIso,
  };
}
