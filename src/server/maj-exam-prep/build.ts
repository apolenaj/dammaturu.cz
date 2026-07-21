import { deterministicUuid } from "@/server/curriculum/ids";
import {
  parseMajExamPrepPack,
  type MajExamPrepPack,
  type MajKnowledgeUnit,
  type MajKuCategory,
} from "@/domain/learning/maj-exam-prep";
import {
  assertVerbatimInSource,
  ensureVerbatimQaFact,
  getIngestedDocumentMeta,
  toReconstructionEvidence,
} from "@/server/story-reconstruction/bootstrap";

const NS = "dammaturu.maj-exam-prep";
const NOW = "2026-07-20T12:00:00.000Z";
const FILE = "Máj.docx" as const;

type KuDraft = {
  slug: string;
  category: MajKuCategory;
  title: string;
  /** Exact SOURCE substring for evidence. */
  sourceStatement: string;
  synonyms: string[];
};

const KU_DRAFTS: KuDraft[] = [
  {
    slug: "autor-macha",
    category: "author",
    title: "Autor: Karel Hynek Mácha",
    sourceStatement: "KAREL HYNEK MÁCHA",
    synonyms: ["mácha", "karel hynek mácha", "k. h. mácha", "autor"],
  },
  {
    slug: "literarni-druh",
    category: "literary_context",
    title: "Literární druh: lyrickoepický",
    sourceStatement: "Literární druh: lyrickoepický",
    synonyms: ["lyrickoepický", "lyricko-epický", "literární druh", "romantismus"],
  },
  {
    slug: "zanr-skladba",
    category: "genre",
    title: "Žánr: básnická skladba",
    sourceStatement: "Literární žánr: básnická skladba",
    synonyms: ["básnická skladba", "žánr", "poezie", "literární forma"],
  },
  {
    slug: "tema-osud",
    category: "theme",
    title: "Téma: osud Viléma a Jarmily + májová příroda",
    sourceStatement:
      "Téma: Nešťastný životní osud Viléma a Jarmily a zobrazení májové přírody",
    synonyms: [
      "téma",
      "nešťastný životní osud",
      "viléma a jarmily",
      "májové přírody",
    ],
  },
  {
    slug: "motivy",
    category: "motifs",
    title: "Motivy: láska, příroda, smrt, vina, pomsta",
    sourceStatement:
      "Motivy: tragická láska; májová příroda; smrt (otázky lidské existence); vina; pomsta;",
    synonyms: [
      "tragická láska",
      "májová příroda",
      "vina",
      "pomsta",
      "smrt",
      "motivy",
    ],
  },
  {
    slug: "casoprostor",
    category: "spacetime",
    title: "Časoprostor: Doksy / Bezděz / jezero, 18. stol.",
    sourceStatement:
      "Děj se odehrává v prostředí Doks/ Bezdězu a Máchova jezera ve 2. pol. 18. stol.",
    synonyms: [
      "doksy",
      "bezděz",
      "máchova jezera",
      "18. stol",
      "časoprostor",
    ],
  },
  {
    slug: "kompozice-celek",
    category: "composition",
    title: "Kompozice: dedikace + 4 zpěvy + 2 intermezza",
    sourceStatement: "4 zpěvů a 2 mezizpěvů (intermezz)",
    synonyms: [
      "dedikace",
      "4 zpěvy",
      "intermezza",
      "mezizpěv",
      "kompozice",
    ],
  },
  {
    slug: "dedikace",
    category: "composition",
    title: "Dedikace — smysl díla",
    sourceStatement:
      "dedikace - předmluva, autor vysvětluje smysl díla, báseň “Čechové jsou národ dobrý”",
    synonyms: ["dedikace", "předmluva", "čechové jsou národ dobrý", "smysl díla"],
  },
  {
    slug: "zpev-1",
    category: "cantos",
    title: "1. zpěv — příroda + Jarmilina smrt",
    sourceStatement:
      "1. Zpěv: Popis krásné, májové přírody; Jarmila skočí do Jezera a utopí se.",
    synonyms: ["1. zpěv", "jarmila", "utopí", "jezera", "májové přírody"],
  },
  {
    slug: "zpev-2",
    category: "cantos",
    title: "2. zpěv — Vilém ve vězení",
    sourceStatement:
      "2. Zpěv: Vilém ve vězení přemýšlí; necítí vinu; úvahy o vlastním životě",
    synonyms: ["2. zpěv", "vězení", "necítí vinu", "vilém"],
  },
  {
    slug: "intermezzo-1",
    category: "cantos",
    title: "1. intermezzo — příprava pohřbu",
    sourceStatement:
      "1. Intermezzo: Příroda společně s duchy připravuje Vilémův pohřeb a volají ho k sobě",
    synonyms: ["1. intermezzo", "pohřeb", "duchové", "příroda"],
  },
  {
    slug: "zpev-3",
    category: "cantos",
    title: "3. zpěv — poprava",
    sourceStatement:
      "3. Zpěv: Vilémova poprava; loučí se s přírodou, krajinou, vlastí",
    synonyms: ["3. zpěv", "poprava", "loučí se", "vlastí"],
  },
  {
    slug: "intermezzo-2",
    category: "cantos",
    title: "2. intermezzo — truchlení",
    sourceStatement:
      "2. Intermezzo: Je již po smrti Viléma a duchové loupežníků po něm truchlí, truchlí i příroda",
    synonyms: ["2. intermezzo", "truchlí", "duchové loupežníků"],
  },
  {
    slug: "zpev-4",
    category: "cantos",
    title: "4. zpěv — poutník / Mácha",
    sourceStatement:
      "4. Zpěv: Do vesnice se vrací poutník/sám autor; ztotožnění Máchy s dějem; „Hynku! Viléme! Jarmilo!“",
    synonyms: [
      "4. zpěv",
      "poutník",
      "hynku",
      "ztotožnění",
      "autor",
    ],
  },
  {
    slug: "postava-vilem",
    category: "characters",
    title: "Vilém — loupežník, otcovrah",
    sourceStatement:
      "Vilém loupežník, zamilovaný do Jarmily žárlivý, pomstychtivý, nešťastný, smutný, otcovrah",
    synonyms: ["vilém", "loupežník", "otcovrah", "žárlivý", "pomstychtivý"],
  },
  {
    slug: "postava-jarmila",
    category: "characters",
    title: "Jarmila — svedena otcem Viléma",
    sourceStatement:
      "Jarmila krásná, nešťastná zamilovaná do Viléma poctivá, oddaně čeká na Viléma svedena otcem Viléma",
    synonyms: ["jarmila", "svedena", "oddaně", "čeká"],
  },
  {
    slug: "postava-poutnik",
    category: "characters",
    title: "Poutník / Hynek — autor ve 4. zpěvu",
    sourceStatement: "poutník/ Hynek vystupuje ve 4. zpěvu, sám autor",
    synonyms: ["poutník", "hynek", "sám autor", "4. zpěvu"],
  },
  {
    slug: "jazyk",
    category: "language",
    title: "Jazyk: archaický / knižní",
    sourceStatement: "archaický, knižní/básnický jazyk",
    synonyms: ["archaický", "knižní", "básnický jazyk", "archaismy", "zvukomalba"],
  },
  {
    slug: "vers",
    category: "verse",
    title: "Verš: jambický, rýmy ABBA/ABAB/AABB",
    sourceStatement: "jambický verš",
    synonyms: ["jambický", "obkročný", "abba", "abab", "verš", "rým"],
  },
  {
    slug: "tropy",
    category: "tropes",
    title: "Tropy: personifikace, oxymóron, apostrofa…",
    sourceStatement: "množství metafor a zejména personifikací",
    synonyms: [
      "personifikace",
      "metafora",
      "oxymóron",
      "apostrofa",
      "epiteton",
      "tropy",
    ],
  },
  {
    slug: "vyznam",
    category: "significance",
    title: "Význam: ztotožnění Máchy s dějem",
    sourceStatement: "ztotožnění Máchy s dějem",
    synonyms: [
      "ztotožnění",
      "smysl díla",
      "význam",
      "hynku! viléme! jarmilo",
      "autor vysvětluje",
    ],
  },
];

export async function buildMajExamPrepPack(): Promise<MajExamPrepPack> {
  const doc = await getIngestedDocumentMeta(FILE);

  const knowledgeUnits: MajKnowledgeUnit[] = [];
  for (const draft of KU_DRAFTS) {
    assertVerbatimInSource(doc.plainText, draft.sourceStatement, draft.slug);
    const qa = await ensureVerbatimQaFact({
      key: `maj-exam-${draft.slug}`,
      documentId: doc.documentId,
      filename: FILE,
      sourceStatement: draft.sourceStatement,
      title: `Máj exam · ${draft.title}`,
    });
    const { evidence } = toReconstructionEvidence(`ev-${draft.slug}`, qa);
    knowledgeUnits.push({
      id: deterministicUuid(NS, `ku:${draft.slug}`),
      slug: draft.slug,
      category: draft.category,
      title: draft.title,
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

  const storyMap = [
    {
      id: "sm-1",
      label:
        "1. Zpěv: Popis krásné, májové přírody; Jarmila skočí do Jezera a utopí se.",
      order: 0,
      kind: "canto" as const,
      kuSlug: "zpev-1",
    },
    {
      id: "sm-2",
      label:
        "2. Zpěv: Vilém ve vězení přemýšlí; necítí vinu; úvahy o vlastním životě",
      order: 1,
      kind: "canto" as const,
      kuSlug: "zpev-2",
    },
    {
      id: "sm-i1",
      label:
        "1. Intermezzo: Příroda společně s duchy připravuje Vilémův pohřeb a volají ho k sobě",
      order: 2,
      kind: "intermezzo" as const,
      kuSlug: "intermezzo-1",
    },
    {
      id: "sm-3",
      label: "3. Zpěv: Vilémova poprava; loučí se s přírodou, krajinou, vlastí",
      order: 3,
      kind: "canto" as const,
      kuSlug: "zpev-3",
    },
    {
      id: "sm-i2",
      label:
        "2. Intermezzo: Je již po smrti Viléma a duchové loupežníků po něm truchlí, truchlí i příroda",
      order: 4,
      kind: "intermezzo" as const,
      kuSlug: "intermezzo-2",
    },
    {
      id: "sm-4",
      label:
        "4. Zpěv: Do vesnice se vrací poutník/sám autor; ztotožnění Máchy s dějem; „Hynku! Viléme! Jarmilo!“",
      order: 5,
      kind: "canto" as const,
      kuSlug: "zpev-4",
    },
  ];

  for (const n of storyMap) {
    assertVerbatimInSource(doc.plainText, n.label, `story:${n.id}`);
  }

  const compositionPuzzle = [
    {
      id: "cp-ded",
      label: "Dedikace — předmluva, smysl díla",
      correctOrder: 0,
      kuSlug: "dedikace",
    },
    {
      id: "cp-1",
      label: "1. zpěv — májová příroda; Jarmila do jezera",
      correctOrder: 1,
      kuSlug: "zpev-1",
    },
    {
      id: "cp-2",
      label: "2. zpěv — Vilém ve vězení",
      correctOrder: 2,
      kuSlug: "zpev-2",
    },
    {
      id: "cp-i1",
      label: "1. intermezzo — příprava pohřbu",
      correctOrder: 3,
      kuSlug: "intermezzo-1",
    },
    {
      id: "cp-3",
      label: "3. zpěv — poprava",
      correctOrder: 4,
      kuSlug: "zpev-3",
    },
    {
      id: "cp-i2",
      label: "2. intermezzo — truchlení",
      correctOrder: 5,
      kuSlug: "intermezzo-2",
    },
    {
      id: "cp-4",
      label: "4. zpěv — poutník / Mácha",
      correctOrder: 6,
      kuSlug: "zpev-4",
    },
  ];

  const characterMap = [
    {
      id: "ch-vilem",
      name: "Vilém",
      role: "loupežník, zamilovaný do Jarmily; otcovrah",
      traits: ["žárlivý", "pomstychtivý", "nešťastný", "otcovrah"],
      kuSlug: "postava-vilem",
    },
    {
      id: "ch-jarmila",
      name: "Jarmila",
      role: "krásná, zamilovaná do Viléma; svedena otcem Viléma",
      traits: ["krásná", "poctivá", "oddaně čeká", "nešťastná"],
      kuSlug: "postava-jarmila",
    },
    {
      id: "ch-poutnik",
      name: "Poutník / Hynek",
      role: "vystupuje ve 4. zpěvu, sám autor",
      traits: ["zamyšlený", "vrací se k popravišti", "autor"],
      kuSlug: "postava-poutnik",
    },
  ];

  const quoteDevices = [
    {
      id: "qd-apostrofa",
      quote: "Ach, zemi krásná, zemi milovaná.",
      device: "apostrofa",
      explanation: "Oslovení země — citová výzva.",
      kuSlug: "tropy",
    },
    {
      id: "qd-person",
      quote: "o lásce šeptal tichý mech;",
      device: "personifikace",
      explanation: "Mech „šeptá“ — příroda oživlá.",
      kuSlug: "tropy",
    },
    {
      id: "qd-oxy",
      quote: "Mrtvé milenky cit,…",
      device: "oxymóron",
      explanation: "Protiklad mrtvé × cit / láska.",
      kuSlug: "tropy",
    },
    {
      id: "qd-epi",
      quote: "bělavé páry",
      device: "epiteton",
      explanation: "Básnický přívlastek k páry.",
      kuSlug: "tropy",
    },
    {
      id: "qd-zvuk",
      quote: "nocí řinčí řetězů hřmot",
      device: "zvukomalba",
      explanation: "Zvuková malba řetězů / vězení.",
      kuSlug: "jazyk",
    },
  ];

  for (const q of quoteDevices) {
    assertVerbatimInSource(doc.plainText, q.quote, `quote:${q.id}`);
  }

  const excellentFull =
    "Autor Karel Hynek Mácha. Téma: nešťastný životní osud Viléma a Jarmily a zobrazení májové přírody. Motivy: tragická láska, májová příroda, smrt, vina, pomsta. Časoprostor: Doksy, Bezděz, Máchovo jezero, 2. pol. 18. stol. Kompozice: dedikace, 4 zpěvy a 2 intermezza. 1. zpěv — Jarmila se utopí; 2. zpěv — Vilém ve vězení necítí vinu; 1. intermezzo — pohřeb; 3. zpěv — poprava; 2. intermezzo — truchlení; 4. zpěv — poutník/Hynek, ztotožnění Máchy s dějem. Postavy: Vilém loupežník otcovrah, Jarmila svedena otcem, poutník sám autor. Žánr lyrickoepická básnická skladba. Jazyk archaický knižní, jambický verš. Tropy: personifikace, oxymóron, apostrofa. Význam: ztotožnění Máchy s dějem.";

  return parseMajExamPrepPack({
    id: deterministicUuid(NS, "pack:maj-exam-prep"),
    slug: "maj-exam-prep",
    title: "Máj — exam preparation",
    author: "Karel Hynek Mácha",
    summary:
      "Komplexní příprava: story map, postavy, kompozice, tropy, 60s / 3min / full oral — chybějící KU po každé simulaci.",
    sourceFilename: FILE,
    literaryWorkHref: "/app/learn/dilo/maj",
    reconstructionHref: "/app/learn/rekonstrukce-pribehu/literarni-dej",
    knowledgeUnits,
    storyMap,
    characterMap,
    compositionPuzzle,
    quoteDevices,
    summaryChallenge: {
      id: "summary-60s",
      titleCs: "60-second summary",
      prompt:
        "Za 60 sekund shrň Máj: autor, téma, 4 zpěvy + intermezza, hlavní postavy.",
      seconds: 60,
      checklistKuSlugs: [
        "autor-macha",
        "tema-osud",
        "zpev-1",
        "zpev-3",
        "postava-vilem",
        "postava-jarmila",
      ],
      excellentAnswer:
        "Karel Hynek Mácha. Téma nešťastný životní osud Viléma a Jarmily a májová příroda. 1. zpěv — Jarmila se utopí v jezeře. 3. zpěv — Vilémova poprava. Vilém loupežník otcovrah, Jarmila svedena otcem.",
    },
    oralThreeMin: {
      id: "oral-3min",
      titleCs: "3-minute oral answer",
      prompt:
        "3 minuty: zařaď Máj (žánr, kontext), vysvětli kompozici a časoprostor, uveď motivy a jazyk/verš.",
      seconds: 180,
      checklistKuSlugs: [
        "literarni-druh",
        "zanr-skladba",
        "kompozice-celek",
        "casoprostor",
        "motivy",
        "jazyk",
        "vers",
      ],
      excellentAnswer:
        "Literární druh lyrickoepický, žánr básnická skladba. Kompozice: 4 zpěvy a 2 mezizpěvy (intermezza) plus dedikace. Časoprostor Doksy, Bezděz, Máchovo jezero, 2. pol. 18. stol. Motivy tragická láska, májová příroda, smrt, vina, pomsta. Jazyk archaický knižní, jambický verš.",
    },
    fullOralSimulation: {
      id: "full-oral",
      titleCs: "Full oral simulation",
      prompt:
        "Plná ústní odpověď jako u maturity: autor, kontext, téma, motivy, časoprostor, kompozice (zpěvy), postavy, žánr, jazyk, verš, tropy, význam.",
      seconds: 420,
      checklistKuSlugs: [
        "autor-macha",
        "literarni-druh",
        "tema-osud",
        "motivy",
        "casoprostor",
        "kompozice-celek",
        "zpev-1",
        "zpev-2",
        "zpev-3",
        "zpev-4",
        "postava-vilem",
        "postava-jarmila",
        "zanr-skladba",
        "jazyk",
        "vers",
        "tropy",
        "vyznam",
      ],
      excellentAnswer: excellentFull,
    },
    requiresVerifiedOnly: true,
    createdAt: NOW,
    updatedAt: NOW,
  });
}
