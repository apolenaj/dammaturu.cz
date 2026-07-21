import { deterministicUuid } from "@/server/curriculum/ids";
import {
  parseMockExamPack,
  type MockExamPack,
  type MockExamTopic,
} from "@/domain/learning/mock-exam";

const NS = "dammaturu.mock-exam";
const NOW = "2026-07-20T12:00:00.000Z";

function tid(slug: string) {
  return deterministicUuid(NS, `topic:${slug}`);
}

function item(
  topicSlug: string,
  key: string,
  fields: Omit<
    MockExamTopic["checklist"][number],
    "id"
  >,
): MockExamTopic["checklist"][number] {
  return {
    id: `${topicSlug}-${key}`,
    ...fields,
  };
}

const maj: MockExamTopic = {
  id: tid("maj"),
  slug: "maj",
  title: "Máj (K. H. Mácha)",
  subtitle: "Ústní — autor, kompozice, postavy, jazyk",
  workTitle: "Máj",
  prepareSeconds: 120,
  answerSeconds: 300,
  prompt:
    "Představ Máj jako u maturity: autor a kontext, téma, kompozice (zpěvy), postavy, žánr/jazyk, význam.",
  checklist: [
    item("maj", "autor", {
      label: "Karel Hynek Mácha",
      synonyms: ["mácha", "k. h. mácha", "autor"],
      required: true,
      isKeyFact: true,
      isStructure: true,
      isTerminology: false,
      reviewHintCs: "Doplň autora: Karel Hynek Mácha.",
    }),
    item("maj", "tema", {
      label: "nešťastný osud Viléma a Jarmily",
      synonyms: ["téma", "májové přírody", "tragická láska", "vina"],
      required: true,
      isKeyFact: true,
      isStructure: true,
      isTerminology: false,
      reviewHintCs: "Shrň téma: osud Viléma a Jarmily + májová příroda.",
    }),
    item("maj", "kompozice", {
      label: "4 zpěvy a 2 intermezza",
      synonyms: ["4 zpěvy", "intermezza", "mezizpěv", "dedikace", "kompozice"],
      required: true,
      isKeyFact: true,
      isStructure: true,
      isTerminology: true,
      reviewHintCs: "Kompozice: dedikace + 4 zpěvy + 2 intermezza.",
    }),
    item("maj", "vilem", {
      label: "Vilém loupežník otcovrah",
      synonyms: ["vilém", "otcovrah", "vězení", "poprava"],
      required: true,
      isKeyFact: true,
      isStructure: false,
      isTerminology: false,
      reviewHintCs: "Charakterizuj Viléma (loupežník, otcovrah, vězení/poprava).",
    }),
    item("maj", "jarmila", {
      label: "Jarmila se utopí",
      synonyms: ["jarmila", "jezera", "utopí"],
      required: true,
      isKeyFact: true,
      isStructure: false,
      isTerminology: false,
      reviewHintCs: "Jarmila — tragický konec v jezeře (1. zpěv).",
    }),
    item("maj", "zanr", {
      label: "lyrickoepická básnická skladba",
      synonyms: ["lyrickoepický", "básnická skladba", "žánr", "poezie"],
      required: true,
      isKeyFact: false,
      isStructure: true,
      isTerminology: true,
      reviewHintCs: "Zařaď žánr: lyrickoepická básnická skladba.",
    }),
    item("maj", "jazyk", {
      label: "jambický verš",
      synonyms: ["jambický", "archaický", "personifikace", "oxymóron"],
      required: false,
      isKeyFact: false,
      isStructure: false,
      isTerminology: true,
      reviewHintCs: "Jazyk/verš: jamb, archaismy, tropy (personifikace…).",
    }),
    item("maj", "vyznam", {
      label: "ztotožnění Máchy s dějem",
      synonyms: ["poutník", "hynku", "ztotožnění", "4. zpěv"],
      required: false,
      isKeyFact: false,
      isStructure: true,
      isTerminology: false,
      reviewHintCs: "4. zpěv — poutník/Hynek, ztotožnění autora s dějem.",
    }),
  ],
  followUps: [
    {
      id: "maj-fu-autor",
      checklistItemId: "maj-autor",
      question: "Kdo je autor Máje a kam směr patří?",
    },
    {
      id: "maj-fu-komp",
      checklistItemId: "maj-kompozice",
      question: "Z čeho se skládá kompozice Máje (zpěvy / intermezza)?",
    },
    {
      id: "maj-fu-vilem",
      checklistItemId: "maj-vilem",
      question: "Kdo je Vilém a jaký je jeho osud?",
    },
    {
      id: "maj-fu-zanr",
      checklistItemId: "maj-zanr",
      question: "Jaký je literární druh / žánr Máje?",
    },
    {
      id: "maj-fu-jarmila",
      checklistItemId: "maj-jarmila",
      question: "Co se stane s Jarmilou v 1. zpěvu?",
    },
  ],
  inaccuracies: [
    {
      id: "maj-inc-erben",
      label: "Záměna s Erbenem / Kyticí",
      patterns: ["erben", "kytice", "vodník"],
      correction: "Máj je Mácha — ne Erbenova Kytice.",
    },
  ],
  modelStructure: [
    "1. Autor + směr / rok",
    "2. Téma a motivy",
    "3. Kompozice (dedikace, 4 zpěvy, 2 intermezza)",
    "4. Postavy (Vilém, Jarmila, poutník)",
    "5. Žánr + jazyk / verš",
    "6. Význam / závěr",
  ],
  excellentAnswer:
    "Karel Hynek Mácha, romantismus. Téma: nešťastný osud Viléma a Jarmily a májová příroda. Kompozice: dedikace, 4 zpěvy a 2 intermezza. Vilém loupežník otcovrah — vězení a poprava; Jarmila se utopí v jezeře. Žánr lyrickoepická básnická skladba, jambický verš, personifikace. Ve 4. zpěvu poutník/Hynek — ztotožnění Máchy s dějem.",
  relatedLearnHref: "/app/learn/maj",
};

const kytice: MockExamTopic = {
  id: tid("kytice"),
  slug: "kytice",
  title: "Kytice (K. J. Erben)",
  subtitle: "Ústní — balady, vina a trest, motivy",
  workTitle: "Kytice",
  prepareSeconds: 120,
  answerSeconds: 300,
  prompt:
    "Charakterizuj Kytici: autor, charakter sbírky, hlavní téma (vina–trest), uveď 2–3 balady s konfliktem.",
  checklist: [
    item("kytice", "autor", {
      label: "Karel Jaromír Erben",
      synonyms: ["erben", "k. j. erben", "autor"],
      required: true,
      isKeyFact: true,
      isStructure: true,
      isTerminology: false,
      reviewHintCs: "Autor: Karel Jaromír Erben.",
    }),
    item("kytice", "sbirka", {
      label: "sbírka balad",
      synonyms: ["balady", "kytice", "lidová"],
      required: true,
      isKeyFact: true,
      isStructure: true,
      isTerminology: true,
      reviewHintCs: "Kytice = sbírka balad z lidové tradice.",
    }),
    item("kytice", "tema", {
      label: "vina a trest",
      synonyms: ["provinění", "následky", "morální", "trest"],
      required: true,
      isKeyFact: true,
      isStructure: true,
      isTerminology: true,
      reviewHintCs: "Téma: morální provinění a následky (vina–trest).",
    }),
    item("kytice", "vodnik", {
      label: "Vodník",
      synonyms: ["vodník", "jezero", "dítě"],
      required: true,
      isKeyFact: true,
      isStructure: false,
      isTerminology: false,
      reviewHintCs: "Uveď alespoň Vodníka (nebo jinou baladu) s konfliktem.",
    }),
    item("kytice", "polednice", {
      label: "Polednice",
      synonyms: ["polednice", "matka", "hrozba"],
      required: false,
      isKeyFact: true,
      isStructure: false,
      isTerminology: false,
      reviewHintCs: "Polednice — hrozba se naplní, matka dítě zadusí.",
    }),
    item("kytice", "kontrast-macha", {
      label: "kolektivní morálka",
      synonyms: ["mravní řád", "kolektivní", "na rozdíl od mách"],
      required: false,
      isKeyFact: false,
      isStructure: true,
      isTerminology: true,
      reviewHintCs: "Odliš od Máchy: Erben = kolektivní morálka / řád.",
    }),
    item("kytice", "motivy", {
      label: "mateřství",
      synonyms: ["voda", "osud", "chamtivost", "motiv"],
      required: false,
      isKeyFact: false,
      isStructure: false,
      isTerminology: false,
      reviewHintCs: "Motivy: mateřství, voda, osud, vina…",
    }),
  ],
  followUps: [
    {
      id: "kyt-fu-autor",
      checklistItemId: "kytice-autor",
      question: "Kdo napsal Kytici?",
    },
    {
      id: "kyt-fu-tema",
      checklistItemId: "kytice-tema",
      question: "Jaké je ústřední téma Kytice?",
    },
    {
      id: "kyt-fu-vodnik",
      checklistItemId: "kytice-vodnik",
      question: "Stručně: o čem je balada Vodník?",
    },
    {
      id: "kyt-fu-sbirka",
      checklistItemId: "kytice-sbirka",
      question: "Jaký typ textů Kytice obsahuje?",
    },
  ],
  inaccuracies: [
    {
      id: "kyt-inc-macha",
      label: "Záměna autora s Máchou",
      patterns: ["mácha napsal kytici", "autor mácha"],
      correction: "Kytici napsal Erben, ne Mácha.",
    },
  ],
  modelStructure: [
    "1. Autor + charakter sbírky",
    "2. Téma vina–trest",
    "3. 2–3 balady (konflikt / následek)",
    "4. Motivy",
    "5. Srovnání s Máchou (volitelně)",
  ],
  excellentAnswer:
    "Karel Jaromír Erben, sbírka balad. Téma vina a trest / morální provinění. Vodník — dcera, jezero, smrt dítěte. Polednice — matka hrozí, pak dítě zadusí. Motivy mateřství, voda, osud. Kolektivní mravní řád — na rozdíl od Máchova subjektivního romantismu.",
  relatedLearnHref: "/app/learn/kytice",
};

const babicka: MockExamTopic = {
  id: tid("babicka"),
  slug: "babicka",
  title: "Babička (Božena Němcová)",
  subtitle: "Ústní — charakter díla, bělidlo, realismus×idealizace",
  workTitle: "Babička",
  prepareSeconds: 120,
  answerSeconds: 300,
  prompt:
    "Představ Babičku: autorka, charakter díla, Staré bělidlo, postavy, kontrast prostředí, realismus vs idealizace, jazyk.",
  checklist: [
    item("babicka", "autor", {
      label: "Božena Němcová",
      synonyms: ["němcová", "autorka"],
      required: true,
      isKeyFact: true,
      isStructure: true,
      isTerminology: false,
      reviewHintCs: "Autorka: Božena Němcová.",
    }),
    item("babicka", "charakter", {
      label: "rozsáhlá povídka",
      synonyms: ["nedějová próza", "obrazy", "idylicky", "venkově"],
      required: true,
      isKeyFact: true,
      isStructure: true,
      isTerminology: true,
      reviewHintCs: "Charakter: rozsáhlá povídka / nedějová próza obrazů.",
    }),
    item("babicka", "belidlo", {
      label: "Staré bělidlo",
      synonyms: ["starém bělidle", "ratibořic", "bělidlo"],
      required: true,
      isKeyFact: true,
      isStructure: true,
      isTerminology: false,
      reviewHintCs: "Prostor: Staré bělidlo / Ratibořice.",
    }),
    item("babicka", "auto", {
      label: "částečně autobiografické",
      synonyms: ["barunka", "magdaléna novotná", "dětství"],
      required: true,
      isKeyFact: true,
      isStructure: false,
      isTerminology: true,
      reviewHintCs: "Částečně autobiografické (Barunka) — ne životopis.",
    }),
    item("babicka", "kontrast", {
      label: "venkov a panský stav",
      synonyms: ["kontrastní", "kněžna", "společenských prostředí"],
      required: true,
      isKeyFact: false,
      isStructure: true,
      isTerminology: true,
      reviewHintCs: "Kontrast venkova × panského / šlechtického stavu.",
    }),
    item("babicka", "realismus", {
      label: "realistické a zidealizované",
      synonyms: ["realistické", "zidealizované", "harmonie", "kněžny"],
      required: true,
      isKeyFact: true,
      isStructure: true,
      isTerminology: true,
      reviewHintCs: "Realismus (popis venkova) + idealizace vztahů/harmonie.",
    }),
    item("babicka", "jazyk", {
      label: "střídmý jazyk",
      synonyms: ["bez užití metafor", "nářeční", "archaické"],
      required: false,
      isKeyFact: false,
      isStructure: false,
      isTerminology: true,
      reviewHintCs: "Jazyk střídmý, bez metafor, nářečí.",
    }),
  ],
  followUps: [
    {
      id: "bab-fu-autor",
      checklistItemId: "babicka-autor",
      question: "Kdo napsal Babičku?",
    },
    {
      id: "bab-fu-belidlo",
      checklistItemId: "babicka-belidlo",
      question: "Kde se odehrává hlavní děj (prostor)?",
    },
    {
      id: "bab-fu-real",
      checklistItemId: "babicka-realismus",
      question: "Je Babička spíš realistická, nebo zidealizovaná — a jak?",
    },
    {
      id: "bab-fu-char",
      checklistItemId: "babicka-charakter",
      question: "Jaký je charakter / žánrový typ díla?",
    },
  ],
  inaccuracies: [
    {
      id: "bab-inc-zivotopis",
      label: "Tvrdí, že jde o přesný životopis",
      patterns: ["přesný životopis", "autobiografie od a do"],
      correction: "Je částečně autobiografické, ne životopisné.",
    },
  ],
  modelStructure: [
    "1. Autorka + charakter díla",
    "2. Autobiografické prvky",
    "3. Staré bělidlo + kompozice obrazů",
    "4. Postavy + kontrast prostředí",
    "5. Realismus × idealizace",
    "6. Jazyk",
  ],
  excellentAnswer:
    "Božena Němcová. Rozsáhlá povídka / nedějová próza — obrazy z venkova. Částečně autobiografické (Barunka), předloha Magdaléna Novotná. Staré bělidlo, metoda obrazů. Kontrast venkova a panského stavu (kněžna). Realistické zobrazení života, ale vztahy a harmonie zidealizované. Jazyk střídmý, bez metafor.",
  relatedLearnHref: "/app/learn/babicka",
};

export function buildMockExamPack(): MockExamPack {
  return parseMockExamPack({
    id: deterministicUuid(NS, "pack:zkouska-nanecisto"),
    slug: "zkouska-nanecisto",
    title: "Zkouška nanečisto",
    summary:
      "Příprava → odpověď (text/hlas) → doplňující otázky dle mezer → hodnocení podle explicitní rubriky (ne školní známka).",
    topics: [maj, kytice, babicka],
    rubricDisclaimerCs:
      "Toto je interní feedback dle rubriky DámMaturu — není oficiální školní známka ani predikce maturity.",
    createdAt: NOW,
    updatedAt: NOW,
  });
}
