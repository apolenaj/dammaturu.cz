import { deterministicUuid } from "@/server/curriculum/ids";
import {
  parseBabickaExperiencePack,
  type BabickaExperiencePack,
  type BabickaKu,
  type BabickaTopic,
} from "@/domain/learning/babicka-experience";
import {
  assertVerbatimInSource,
  ensureVerbatimQaFact,
  getIngestedDocumentMeta,
  toReconstructionEvidence,
} from "@/server/story-reconstruction/bootstrap";

const NS = "dammaturu.babicka-experience";
const NOW = "2026-07-20T12:00:00.000Z";
const FILE = "Babička.docx" as const;

type KuDraft = {
  slug: string;
  topic: BabickaTopic;
  title: string;
  cardLine: string;
  sourceStatement: string;
  synonyms: string[];
};

const KU_DRAFTS: KuDraft[] = [
  {
    slug: "charakter-dila",
    topic: "character_of_work",
    title: "Charakter: rozsáhlá povídka / nedějová próza",
    cardLine: "Obrazy z venkovského života · idyla · 1. pol. 19. stol.",
    sourceStatement:
      "rozsáhlá povídka nedějová próza idylicky zobrazuje život na venkově v 1. polovině 19. Století",
    synonyms: [
      "rozsáhlá povídka",
      "nedějová próza",
      "obrazy z venkovského života",
      "idyla",
      "venkově",
    ],
  },
  {
    slug: "autobiografie",
    topic: "autobiography",
    title: "Částečně autobiografické (ne životopis)",
    cardLine: "Barunka = dětství · volné vzpomínky · Magdaléna Novotná",
    sourceStatement:
      "částečně autobiografické (ne životopisné) dílo – vzpomínky na vlastní dětství (postava Barunky)",
    synonyms: [
      "autobiografické",
      "barunky",
      "dětství",
      "magdaléna novotná",
      "ne životopisné",
    ],
  },
  {
    slug: "predloha-babicky",
    topic: "autobiography",
    title: "Předloha: Magdaléna Novotná",
    cardLine: "Skutečná babička Němcové",
    sourceStatement:
      "předlohou literární postavy babičky byla skutečná babička Němcové – Magdaléna Novotná",
    synonyms: ["magdaléna novotná", "předlohou", "skutečná babička"],
  },
  {
    slug: "kompozice-obrazy",
    topic: "composition",
    title: "Kompozice: metoda obrazů + babička jako spojnice",
    cardLine: "Obrazy pospojené babičkou · 2 pásma · prolog + epilog",
    sourceStatement:
      "povídka je napsána metodou obrazů, které jsou pospojovány ústřední postavou – babičkou",
    synonyms: [
      "metoda obrazů",
      "ústřední postavou",
      "kompozice",
      "prolog",
      "epilog",
    ],
  },
  {
    slug: "dve-pasma",
    topic: "composition",
    title: "Dvě pásma děje",
    cardLine: "1) příjezd + všední den · 2) rodina v ročních obdobích",
    sourceStatement:
      "hlavní dějová osnova se skládá ze dvou pásem",
    synonyms: ["dvou pásem", "první část", "druhá část", "ročních období"],
  },
  {
    slug: "stare-belidlo",
    topic: "stare_belidlo",
    title: "Staré bělidlo — prostor posledních let",
    cardLine: "Poslední léta na Starém bělidle · Ratibořice",
    sourceStatement:
      "poslední léta života na Starém bělidle",
    synonyms: ["starém bělidle", "staré bělidlo", "ratibořic", "bělidlo"],
  },
  {
    slug: "postavy-babicka",
    topic: "characters",
    title: "Babička — harmonie, moudrost, ideál",
    cardLine: "Venkovská žena · soulad · studnice lidové moudrosti",
    sourceStatement:
      "babička venkovská žena se starosvětským chápáním světa ztělesnění harmonie",
    synonyms: [
      "harmonie",
      "studnice lidové moudrosti",
      "ideálně dokonalého",
      "venkovská žena",
    ],
  },
  {
    slug: "kontrast-prostredi",
    topic: "social_contrast",
    title: "Kontrast venkov × panský stav",
    cardLine: "Konfrontace dvou prostředí · rozdíly zmírněny láskou",
    sourceStatement:
      "postavy jsou vzájemně kontrastní konfrontace dvou společenských prostředí",
    synonyms: [
      "kontrastní",
      "společenských prostředí",
      "sociální rozdíly",
      "venkovanů",
      "šlechtického",
    ],
  },
  {
    slug: "jazyk",
    topic: "language",
    title: "Jazyk: střídmý, lidový, archaický",
    cardLine: "Bez metafor · nářečí · mluvená řeč",
    sourceStatement:
      "Jazyk střídmý, bez užití metafor, časté archaické, nářeční výrazy",
    synonyms: [
      "střídmý",
      "bez užití metafor",
      "archaické",
      "nářeční",
      "mluvené řeči",
    ],
  },
  {
    slug: "realismus-idealizace",
    topic: "realism_idealization",
    title: "Realistické + v mnoha směrech zidealizované",
    cardLine: "Popis venkova realita · vztahy / kněžna / harmonie ideál",
    sourceStatement:
      "realistické dílo (popis, zobrazení venkovského života) v mnoha směrech zidealizované (vztahy mezi lidmi, postava kněžny, harmonie člověka s přírodou aj.)",
    synonyms: [
      "realistické",
      "zidealizované",
      "harmonie",
      "kněžny",
      "venkovského života",
    ],
  },
];

export async function buildBabickaExperiencePack(): Promise<BabickaExperiencePack> {
  const doc = await getIngestedDocumentMeta(FILE);

  const knowledgeUnits: BabickaKu[] = [];
  for (const draft of KU_DRAFTS) {
    assertVerbatimInSource(doc.plainText, draft.sourceStatement, draft.slug);
    const qa = await ensureVerbatimQaFact({
      key: `babicka-${draft.slug}`,
      documentId: doc.documentId,
      filename: FILE,
      sourceStatement: draft.sourceStatement,
      title: `Babička · ${draft.title}`,
    });
    const { evidence } = toReconstructionEvidence(`ev-${draft.slug}`, qa);
    knowledgeUnits.push({
      id: deterministicUuid(NS, `ku:${draft.slug}`),
      slug: draft.slug,
      topic: draft.topic,
      title: draft.title,
      cardLine: draft.cardLine,
      statement: draft.sourceStatement,
      synonyms: draft.synonyms,
      evidence: {
        qaItemId: evidence.qaItemId,
        knowledgeUnitId: evidence.knowledgeUnitId,
        publishedStatement: evidence.publishedStatement,
        validationStatus: evidence.validationStatus as
          | "verified_from_source"
          | "corrected",
        filename: FILE,
      },
    });
  }

  // Spot-check key phrases used in activities
  for (const s of [
    "Staré bělidlo",
    "kněžna Zaháňská",
    "bláznivá Viktorka",
    "Barunka",
    "prolog",
    "epilog",
  ]) {
    assertVerbatimInSource(doc.plainText, s, `spot:${s}`);
  }

  return parseBabickaExperiencePack({
    id: deterministicUuid(NS, "pack:babicka"),
    slug: "babicka",
    title: "Babička — active learning",
    author: "Božena Němcová",
    subtitle: "Obrazy z venkovského života",
    summary:
      "Karty, vztahy, pasti T/F, struktura, realismus×idealizace, oral builder — bez dlouhých odstavců.",
    sourceFilename: FILE,
    literaryWorkHref: "/app/learn/dilo/babicka",
    knowledgeUnits,
    characterCards: [
      {
        id: "ch-babicka",
        name: "Babička",
        socialSphere: "venkov",
        tags: ["harmonie", "moudrost", "tradice", "ústřední"],
        roleLine: "Venkovská žena · ztělesnění harmonie",
        kuSlug: "postavy-babicka",
      },
      {
        id: "ch-barunka",
        name: "Barunka",
        socialSphere: "venkov",
        tags: ["vnučka", "dětství", "autobiografie"],
        roleLine: "Vnouče · stopa autorčina dětství",
        kuSlug: "autobiografie",
      },
      {
        id: "ch-tereza",
        name: "Tereza Prošková",
        socialSphere: "venkov",
        tags: ["dcera", "Staré bělidlo", "rodina"],
        roleLine: "Dcera · zve babičku na bělidlo",
        kuSlug: "stare-belidlo",
      },
      {
        id: "ch-viktorka",
        name: "Viktorka",
        socialSphere: "mez",
        tags: ["bláznivá", "tragédie", "kontrast"],
        roleLine: "Bláznivá Viktorka — stín idyly",
        kuSlug: "kontrast-prostredi",
      },
      {
        id: "ch-kneznna",
        name: "Kněžna Zaháňská",
        socialSphere: "pansky",
        tags: ["zámek", "šlechta", "idealizace"],
        roleLine: "Panský stav · vztah zmírněný pochopením",
        kuSlug: "kontrast-prostredi",
      },
      {
        id: "ch-hortensie",
        name: "Komtesa Hortensie",
        socialSphere: "pansky",
        tags: ["šlechta", "zámek"],
        roleLine: "Šlechtický okruh Ratibořic",
        kuSlug: "kontrast-prostredi",
      },
    ],
    relationshipEdges: [
      {
        id: "rel-bab-bar",
        fromCharacterId: "ch-babicka",
        toCharacterId: "ch-barunka",
        label: "babička ↔ vnučka",
      },
      {
        id: "rel-bab-ter",
        fromCharacterId: "ch-babicka",
        toCharacterId: "ch-tereza",
        label: "matka ↔ dcera (pozvání)",
      },
      {
        id: "rel-bab-kne",
        fromCharacterId: "ch-babicka",
        toCharacterId: "ch-kneznna",
        label: "venkov ↔ kněžna (úcta)",
      },
      {
        id: "rel-bab-vik",
        fromCharacterId: "ch-babicka",
        toCharacterId: "ch-viktorka",
        label: "harmonie ↔ tragédie",
      },
      {
        id: "rel-kne-hor",
        fromCharacterId: "ch-kneznna",
        toCharacterId: "ch-hortensie",
        label: "panský okruh",
      },
    ],
    trueFalseTraps: [
      {
        id: "tf-1",
        claim: "Babička je přesný životopis Němcové.",
        isTrue: false,
        trapHint: "SOURCE: částečně autobiografické (ne životopisné).",
        kuSlug: "autobiografie",
      },
      {
        id: "tf-2",
        claim: "Povídka je napsána metodou obrazů spojených babičkou.",
        isTrue: true,
        trapHint: "Ano — kompozice obrazů + ústřední postava.",
        kuSlug: "kompozice-obrazy",
      },
      {
        id: "tf-3",
        claim: "Děj se odehrává hlavně v Praze u šlechty.",
        isTrue: false,
        trapHint: "Poslední léta na Starém bělidle / Ratibořice.",
        kuSlug: "stare-belidlo",
      },
      {
        id: "tf-4",
        claim: "Dílo je realistické a zároveň v mnoha směrech zidealizované.",
        isTrue: true,
        trapHint: "Popis venkova × idealizace vztahů / kněžny / harmonie.",
        kuSlug: "realismus-idealizace",
      },
      {
        id: "tf-5",
        claim: "Jazyk je plný metafor a básnických ozdob.",
        isTrue: false,
        trapHint: "SOURCE: střídmý, bez užití metafor.",
        kuSlug: "jazyk",
      },
      {
        id: "tf-6",
        claim: "Postavy venkova a panské sféry jsou vzájemně kontrastní.",
        isTrue: true,
        trapHint: "Konfrontace dvou společenských prostředí.",
        kuSlug: "kontrast-prostredi",
      },
      {
        id: "tf-7",
        claim: "Hlavním tématem jsou detailní osudy babičky od narození.",
        isTrue: false,
        trapHint:
          "Tématem je postoj, jednání a názory — ne celé životní osudy.",
        kuSlug: "charakter-dila",
      },
    ],
    storyStructure: [
      {
        id: "st-prolog",
        label: "Prolog — vzpomínka na babičku s odstupem",
        correctOrder: 0,
        kuSlug: "kompozice-obrazy",
      },
      {
        id: "st-pasmo1",
        label: "1. pásmo — příjezd na Staré bělidlo, všední den",
        correctOrder: 1,
        kuSlug: "dve-pasma",
      },
      {
        id: "st-pasmo2",
        label: "2. pásmo — rodina v ročních obdobích a zvycích",
        correctOrder: 2,
        kuSlug: "dve-pasma",
      },
      {
        id: "st-epilog",
        label: "Epilog — poslední dny a smrt babičky",
        correctOrder: 3,
        kuSlug: "kompozice-obrazy",
      },
    ],
    realismChallenge: [
      {
        id: "ri-1",
        statement: "Popis venkovského života a všední práce",
        answer: "realisticke",
        explain: "SOURCE: realistické = popis / zobrazení venkova.",
        kuSlug: "realismus-idealizace",
      },
      {
        id: "ri-2",
        statement: "Vztahy mezi lidmi jako čistá harmonie",
        answer: "idealizovane",
        explain: "SOURCE: zidealizované vztahy mezi lidmi.",
        kuSlug: "realismus-idealizace",
      },
      {
        id: "ri-3",
        statement: "Postava kněžny (ideální vztah k lidu)",
        answer: "idealizovane",
        explain: "SOURCE výslovně: postava kněžny zidealizovaná.",
        kuSlug: "realismus-idealizace",
      },
      {
        id: "ri-4",
        statement: "Harmonie člověka s přírodou",
        answer: "idealizovane",
        explain: "SOURCE: harmonie člověka s přírodou = idealizace.",
        kuSlug: "realismus-idealizace",
      },
      {
        id: "ri-5",
        statement: "Registrace sociálních rozdílů (venkov × panstvo)",
        answer: "realisticke",
        explain: "Němcová rozdíly vidí — realistický prvek kontrastu.",
        kuSlug: "kontrast-prostredi",
      },
      {
        id: "ri-6",
        statement: "Babička jako vzor ideálně dokonalého člověka",
        answer: "idealizovane",
        explain: "SOURCE: vzor ideálně dokonalého člověka.",
        kuSlug: "postavy-babicka",
      },
    ],
    oralBuilder: {
      id: "oral-babicka",
      titleCs: "Oral answer builder",
      prompt:
        "Sestav ústní odpověď: charakter díla, autobiografie, kompozice / bělidlo, postavy, kontrast, jazyk, realismus×idealizace.",
      checklistKuSlugs: [
        "charakter-dila",
        "autobiografie",
        "kompozice-obrazy",
        "stare-belidlo",
        "postavy-babicka",
        "kontrast-prostredi",
        "jazyk",
        "realismus-idealizace",
      ],
      builderChips: [
        "rozsáhlá povídka",
        "nedějová próza",
        "metoda obrazů",
        "Staré bělidlo",
        "Barunka",
        "Magdaléna Novotná",
        "venkov × kněžna",
        "střídmý jazyk",
        "bez metafor",
        "realistické + zidealizované",
      ],
      excellentAnswer:
        "Babička Boženy Němcové je rozsáhlá povídka / nedějová próza — obrazy z venkovského života. Částečně autobiografické (Barunka), předloha Magdaléna Novotná. Kompozice metodou obrazů spojených babičkou; Staré bělidlo; prolog a epilog, dvě pásma. Babička = harmonie a lidová moudrost. Kontrast venkova a panského stavu. Jazyk střídmý, bez metafor, archaismy a nářečí. Realistické zobrazení venkova, ale vztahy, kněžna a harmonie jsou zidealizované.",
    },
    requiresVerifiedOnly: true,
    createdAt: NOW,
    updatedAt: NOW,
  });
}
