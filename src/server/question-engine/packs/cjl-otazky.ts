import { deterministicUuid } from "@/server/curriculum/ids";
import type {
  EngineQuestion,
  QuestionPack,
} from "@/domain/learning/question-engine";

const NS = "dammaturu.question-engine";

function id(key: string) {
  return deterministicUuid(NS, key);
}

function ku(key: string, title: string) {
  return { id: id(`ku:${key}`), title };
}

/** One pack covering all Question Engine kinds for ČJL. */
export function buildCjlOtazkyPack(
  now = new Date().toISOString(),
): QuestionPack {
  const questions: EngineQuestion[] = [
    {
      id: id("q:sc-realismus"),
      slug: "sc-realismus-definice",
      kind: "single_choice" as const,
      stem: "Co je hlavní charakteristika literárního realismu?",
      difficulty: 2,
      knowledgeUnits: [ku("realismus-definice", "Realismus — definice")],
      explanation:
        "Realismus zobrazuje soudobou společnost věrně, typizuje postavy a prostředí a oslabuje romantickou idealizaci. Nestačí říct jen „o realitě“ — klíč je sociální soudobost a typizace.",
      source: "Romantismus - hl. znaky.docx / Realismus pack",
      examRelevance: "high" as const,
      options: [
        { id: "a", label: "Cit a subjektivita výjimečného hrdiny" },
        { id: "b", label: "Věrné zobrazení soudobé společnosti a typizace" },
        { id: "c", label: "Allegorie středověkých legend" },
        { id: "d", label: "Automatické psaní bez příběhu" },
      ],
      correctAnswer: "b",
      distractors: ["a", "c", "d"],
    },
    {
      id: id("q:mc-romantismus"),
      slug: "mc-romantismus-znaky",
      kind: "multiple_choice" as const,
      stem: "Které znaky patří k romantismu? (vyber všechny správné)",
      difficulty: 3,
      knowledgeUnits: [ku("romantismus-znaky", "Romantismus — znaky")],
      explanation:
        "Romantismus staví na citu/subjektivitě, individualitě a konfliktu jedince se společností. Typizace soudobé společnosti je spíš realismus — proto není správná volba.",
      source: "Romantismus - hl. znaky.docx",
      examRelevance: "high" as const,
      options: [
        { id: "a", label: "Cit a subjektivita" },
        { id: "b", label: "Konflikt jedince a společnosti" },
        { id: "c", label: "Typizace soudobé společnosti" },
        { id: "d", label: "Individualita / výjimečný hrdina" },
      ],
      correctAnswer: ["a", "b", "d"],
      distractors: ["c"],
    },
    {
      id: id("q:tf-maj"),
      slug: "tf-maj-1836",
      kind: "true_false" as const,
      stem: "Máj K. H. Máchy vyšel roku 1836.",
      difficulty: 1,
      knowledgeUnits: [ku("maj-rok", "Máj — rok vydání")],
      explanation:
        "Ano — Máj vyšel 1836. Rok patří k základnímu maturitnímu faktu; nepleť si ho s datem Máchovy smrti (také 1836) vs. vydáním básně.",
      source: "Timeline / literární historie",
      examRelevance: "medium" as const,
      correctAnswer: true,
      distractors: [],
    },
    {
      id: id("q:sa-balzac"),
      slug: "sa-balzac-cyklus",
      kind: "short_answer" as const,
      stem: "Jak se jmenuje Balzacův románový cyklus o francouzské společnosti?",
      difficulty: 2,
      knowledgeUnits: [ku("balzac-komedie", "Balzac — Lidská komedie")],
      explanation:
        "Správně je Lidská komedie (La Comédie humaine). Jde o propojený cyklus románů mapující společnost; patří sem i Otec Goriot. „Božská komedie“ je Dante — častá mýlka.",
      source: "Connection map / realismus",
      examRelevance: "high" as const,
      correctAnswer: {
        accepted: ["lidská komedie", "lidska komedie", "comedie humaine"],
        keyTerms: ["lidska", "komedie"],
      },
      distractors: ["božská komedie", "bozska komedie"],
    },
    {
      id: id("q:la-no"),
      slug: "la-no-etapy",
      kind: "long_answer" as const,
      stem: "Popiš vlastními slovy hlavní etapy Národního obrození.",
      difficulty: 3,
      knowledgeUnits: [ku("no-etapy", "NO — etapy")],
      explanation:
        "Kompletní odpověď zmíní obrannou etapu, útok/jazykový program a romantismus (cca do 1848). Částečná znalost = některé etapy ano, jiné ne — to není „špatně“, ale mezera v KU.",
      source: "Národní obrození v Čechách.docx",
      examRelevance: "critical" as const,
      correctAnswer: {
        keyPoints: [
          "obranná etapa",
          "útok nebo jazykový program",
          "romantismus",
        ],
      },
      distractors: ["jen husitství", "jen baroko"],
    },
    {
      id: id("q:fb-erben"),
      slug: "fb-erben-kytice",
      kind: "fill_blank" as const,
      stem: "Doplň.",
      template: "Karel Jaromír ___ napsal sbírku balad ___.",
      difficulty: 2,
      knowledgeUnits: [ku("erben-kytice", "Erben — Kytice")],
      explanation:
        "Erben — Kytice. Balady pracují s vinou, trestem a lidovou tradicí; maturitně je odděluj od Máchova Máje (jiný typ romantismu).",
      source: "Romantismus pack",
      examRelevance: "high" as const,
      correctAnswer: ["Erben", "Kytice"],
      distractors: ["Mácha", "Máj", "Němcová"],
    },
    {
      id: id("q:match-smer"),
      slug: "match-smer-autor",
      kind: "matching" as const,
      stem: "Spáruj směr s typickým autorem.",
      difficulty: 3,
      knowledgeUnits: [ku("smer-autor", "Směr ↔ autor")],
      explanation:
        "Mácha = romantismus, Balzac = realismus, Zola = naturalismus. Párování trénuje souvislosti, ne izolovaná jména.",
      source: "Connection map",
      examRelevance: "high" as const,
      left: [
        { id: "l1", label: "Romantismus" },
        { id: "l2", label: "Realismus" },
        { id: "l3", label: "Naturalismus" },
      ],
      right: [
        { id: "r1", label: "K. H. Mácha" },
        { id: "r2", label: "H. de Balzac" },
        { id: "r3", label: "É. Zola" },
        { id: "r4", label: "Dante" },
      ],
      correctAnswer: { l1: "r1", l2: "r2", l3: "r3" },
      distractors: ["r4"],
    },
    {
      id: id("q:ord-no"),
      slug: "ord-no-chronologie",
      kind: "ordering" as const,
      stem: "Seřaď etapy NO od nejstarší.",
      difficulty: 2,
      knowledgeUnits: [ku("no-chrono", "NO — chronologie")],
      explanation:
        "Pořadí: obrana → útok/jazykový program → romantismus. Chyba v pořadí = slabina v časové ose, i když názvy znáš.",
      source: "NO Story / Timeline",
      examRelevance: "high" as const,
      items: [
        { id: "o1", label: "Romantismus (3. etapa)" },
        { id: "o2", label: "Obranná etapa" },
        { id: "o3", label: "Útok / jazykový program" },
      ],
      correctAnswer: ["o2", "o3", "o1"],
      distractors: [],
    },
    {
      id: id("q:tl-dila"),
      slug: "tl-dila-poradi",
      kind: "timeline_ordering" as const,
      stem: "Seřaď díla chronologicky (od nejstaršího).",
      difficulty: 4,
      knowledgeUnits: [ku("dila-chrono", "Díla — chronologie")],
      explanation:
        "Máj 1836 → Babička 1855 → Maryša 1894. Timeline ordering prověřuje, že fakta nejsou jen seznam jmen.",
      source: "Timeline literarni-historie",
      examRelevance: "medium" as const,
      items: [
        { id: "t1", label: "Babička", yearHint: 1855 },
        { id: "t2", label: "Máj", yearHint: 1836 },
        { id: "t3", label: "Maryša", yearHint: 1894 },
      ],
      correctAnswer: ["t2", "t1", "t3"],
      distractors: [],
    },
    {
      id: id("q:cat-smer"),
      slug: "cat-dila-smer",
      kind: "categorization" as const,
      stem: "Zařaď díla ke směru.",
      difficulty: 3,
      knowledgeUnits: [ku("dilo-smer", "Dílo ↔ směr")],
      explanation:
        "Máj a Kytice = romantismus; Otec Goriot = realismus. Kategorizace ukáže, jestli spojuješ text se směrem, ne jen s autorem.",
      source: "Connection map",
      examRelevance: "high" as const,
      categories: [
        { id: "c1", label: "Romantismus" },
        { id: "c2", label: "Realismus" },
      ],
      items: [
        { id: "i1", label: "Máj" },
        { id: "i2", label: "Kytice" },
        { id: "i3", label: "Otec Goriot" },
      ],
      correctAnswer: { i1: "c1", i2: "c1", i3: "c2" },
      distractors: [],
    },
    {
      id: id("q:aw-pair"),
      slug: "aw-autor-dilo",
      kind: "author_work_pairing" as const,
      stem: "Spáruj autora s dílem.",
      difficulty: 2,
      knowledgeUnits: [ku("autor-dilo", "Autor ↔ dílo")],
      explanation:
        "Mácha–Máj, Němcová–Babička, Dostojevskij–Zločin a trest. Základ maturitní faktografie — vždy s vysvětlením kontextu, ne jen memo.",
      source: "Flashcards / timeline",
      examRelevance: "critical" as const,
      authors: [
        { id: "a1", label: "K. H. Mácha" },
        { id: "a2", label: "B. Němcová" },
        { id: "a3", label: "F. M. Dostojevskij" },
      ],
      works: [
        { id: "w1", label: "Máj" },
        { id: "w2", label: "Babička" },
        { id: "w3", label: "Zločin a trest" },
        { id: "w4", label: "Hamlet" },
      ],
      correctAnswer: { a1: "w1", a2: "w2", a3: "w3" },
      distractors: ["w4"],
    },
    {
      id: id("q:cw-pair"),
      slug: "cw-postava-dilo",
      kind: "character_work_pairing" as const,
      stem: "Spáruj postavu s dílem.",
      difficulty: 3,
      knowledgeUnits: [ku("postava-dilo", "Postava ↔ dílo")],
      explanation:
        "Raskolnikov = Zločin a trest, Rastignac = Otec Goriot, Vilém = Máj. Postava bez díla je prázdné jméno — párování to opraví.",
      source: "Flashcards",
      examRelevance: "high" as const,
      characters: [
        { id: "ch1", label: "Raskolnikov" },
        { id: "ch2", label: "Rastignac" },
        { id: "ch3", label: "Vilém" },
      ],
      works: [
        { id: "w1", label: "Zločin a trest" },
        { id: "w2", label: "Otec Goriot" },
        { id: "w3", label: "Máj" },
        { id: "w4", label: "Kytice" },
      ],
      correctAnswer: { ch1: "w1", ch2: "w2", ch3: "w3" },
      distractors: ["w4"],
    },
    {
      id: id("q:clues"),
      slug: "clues-kriticky-realismus",
      kind: "identify_from_clues" as const,
      stem: "O jaký pojem jde?",
      difficulty: 3,
      knowledgeUnits: [ku("kriticky-realismus", "Kritický realismus")],
      explanation:
        "Indicie míří na kritický realismus (např. Maryša): kritika společnosti bez idealizace. Naturalismus je příbuzný, ale silněji deterministický (Zola).",
      source: "Realismus pack",
      examRelevance: "high" as const,
      clues: [
        "Kritika společnosti bez idealizace",
        "České drama konce 19. stol.",
        "Příklad: Maryša",
      ],
      options: [
        { id: "x1", label: "Kritický realismus" },
        { id: "x2", label: "Romantismus" },
        { id: "x3", label: "Baroko" },
        { id: "x4", label: "Symbolismus" },
      ],
      correctAnswer: "x1",
      distractors: ["x2", "x3", "x4"],
    },
    {
      id: id("q:error"),
      slug: "error-romantismus-typy",
      kind: "error_spotting" as const,
      stem: "Která formulace obsahuje faktickou chybu?",
      difficulty: 3,
      knowledgeUnits: [ku("error-real-rom", "Realismus vs romantismus")],
      explanation:
        "Chybná je formulace, že realismus stojí na výjimečném hrdinovi a subjektivitě — to je romantismus. Ostatní volby sedí. Error spotting trénuje přesnost formulací k maturitě.",
      source: "Active recall / realismus",
      examRelevance: "high" as const,
      passage:
        "Student napsal: „Realismus staví na výjimečném hrdinovi a subjektivním citu.“",
      options: [
        {
          id: "e1",
          label: "„Realismus staví na výjimečném hrdinovi a subjektivním citu.“",
        },
        {
          id: "e2",
          label: "„Romantismus často zobrazuje konflikt jedince a společnosti.“",
        },
        {
          id: "e3",
          label: "„Realismus typizuje postavy a prostředí.“",
        },
        {
          id: "e4",
          label: "„Máj je lyrickoepická báseň.“",
        },
      ],
      correctAnswer: "e1",
      distractors: ["e2", "e3", "e4"],
    },
  ];

  return {
    id: id("pack:cjl-otazky"),
    slug: "cjl-otazky",
    title: "Question Engine — ČJL literární historie",
    summary:
      "14 typů otázek. Po každé odpovědi dostaneš vysvětlení, ne jen zelenou/červenou.",
    questions,
    createdAt: now,
    updatedAt: now,
  };
}
