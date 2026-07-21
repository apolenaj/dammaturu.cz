import { deterministicUuid } from "@/server/curriculum/ids";
import {
  parseKdoJsemPack,
  redactNameFromStatement,
  type HintCategory,
  type KdoJsemPack,
} from "@/domain/learning/kdo-jsem";
import {
  assertVerbatimInSource,
  ensureVerbatimQaFact,
  getIngestedDocumentMeta,
  toKdoJsemEvidence,
} from "@/server/kdo-jsem/bootstrap";

const NS = "dammaturu.kdo-jsem";

function mid(key: string) {
  return deterministicUuid(NS, key);
}

type HintDraft = {
  key: string;
  category: HintCategory;
  /** Exact substring of SOURCE document. */
  sourceStatement: string;
  title: string;
};

type MysteryDraft = {
  slug: string;
  answerName: string;
  answerAliases: string[];
  filename: string;
  hints: HintDraft[];
};

const MYSTERIES: MysteryDraft[] = [
  {
    slug: "balzac",
    answerName: "Honoré de Balzac",
    answerAliases: ["Balzac", "Honore de Balzac", "Honoré Balzac"],
    filename: "2. Realismus ve Francii.docx",
    hints: [
      {
        key: "balzac-role",
        category: "role",
        title: "Balzac — role",
        sourceStatement: "zakladatel kritickorealistického románu",
      },
      {
        key: "balzac-work",
        category: "work",
        title: "Balzac — Lidská komedie",
        sourceStatement:
          "Lidská komedie\n\ncyklus téměř sta románů a povídek, v nichž vystupuje přibližně 2 500 postav",
      },
      {
        key: "balzac-trait",
        category: "trait",
        title: "Balzac — rysy",
        sourceStatement:
          "vytvořil syntetický obraz francouzské společnosti 19. století (všechny společenské vrstvy)",
      },
      {
        key: "balzac-context",
        category: "context",
        title: "Balzac — kontext",
        sourceStatement:
          "v Paříži vystudoval práva, krátce působil jako notář, ale proti vůli rodiny se stal spisovatelem",
      },
    ],
  },
  {
    slug: "flaubert",
    answerName: "Gustave Flaubert",
    answerAliases: ["Flaubert", "Gustav Flaubert", "Gustave FLAUBERT"],
    filename: "2. Realismus ve Francii.docx",
    hints: [
      {
        key: "flaubert-role",
        category: "role",
        title: "Flaubert — role",
        sourceStatement: "žil v ústraní, věnoval se literární tvorbě",
      },
      {
        key: "flaubert-work",
        category: "work",
        title: "Flaubert — Paní Bovaryová",
        sourceStatement: "Paní Bovaryová – psychologický román",
      },
      {
        key: "flaubert-trait",
        category: "trait",
        title: "Flaubert — bovarismus",
        sourceStatement:
          "bovarismu – útěk člověka od skutečnosti do světa snů, iluzí",
      },
      {
        key: "flaubert-context",
        category: "context",
        title: "Flaubert — kontext",
        sourceStatement:
          "osamělost a nemoc umocňovaly pesimistický pohled na svět",
      },
    ],
  },
  {
    slug: "zola",
    answerName: "Émile Zola",
    answerAliases: ["Zola", "Emile Zola", "Emile ZOLA", "Émile ZOLA"],
    filename: "2. Realismus ve Francii.docx",
    hints: [
      {
        key: "zola-role",
        category: "role",
        title: "Zola — role",
        sourceStatement: "hlavní představitel naturalismu",
      },
      {
        key: "zola-work",
        category: "work",
        title: "Zola — Zabiják",
        sourceStatement:
          "Zabiják\n\nnaturalistický román zobrazující úpadek a zmar lidských životů v beznadějném prostředí bídy, alkoholu a duchovní prázdnoty",
      },
      {
        key: "zola-trait",
        category: "trait",
        title: "Zola — rysy",
        sourceStatement:
          "dokumentuje vliv dědičnosti a konkrétního prostředí",
      },
      {
        key: "zola-context",
        category: "context",
        title: "Zola — Experimentální román",
        sourceStatement:
          "v eseji Experimentální román definoval svůj postoj k literatuře",
      },
    ],
  },
  {
    slug: "dickens",
    answerName: "Charles Dickens",
    answerAliases: ["Dickens"],
    filename: "4. Realismus v Anglii a další autoři.docx",
    hints: [
      {
        key: "dickens-role",
        category: "role",
        title: "Dickens — role",
        sourceStatement: "tvůrce anglického kritického realismu",
      },
      {
        key: "dickens-work-context",
        category: "context",
        title: "Dickens — dětství",
        sourceStatement:
          "otec se ocitl ve vězení pro dlužníky, dvanáctiletý Dickens začal pracovat jako dětský dělník v dílně na výrobu leštidel",
      },
      {
        key: "dickens-trait",
        category: "trait",
        title: "Dickens — doba",
        sourceStatement: "největší představitel literatury viktoriánské doby",
      },
      {
        key: "dickens-role2",
        category: "work",
        title: "Dickens — Oliver Twist",
        sourceStatement: "Oliver Twist",
      },
    ],
  },
  {
    slug: "gogol",
    answerName: "Nikolaj Vasiljevič Gogol",
    answerAliases: ["Gogol", "Nikolaj Gogol", "N. V. Gogol"],
    filename: "3. Realismus v Rusku.docx",
    hints: [
      {
        key: "gogol-role",
        category: "role",
        title: "Gogol — role",
        sourceStatement: "prozaik, dramatik, publicista",
      },
      {
        key: "gogol-work",
        category: "work",
        title: "Gogol — Revizor",
        sourceStatement: "Revizor",
      },
      {
        key: "gogol-trait",
        category: "trait",
        title: "Gogol — rysy",
        sourceStatement:
          "zobrazuje ruskou společnost deformovanou byrokratismem, úplatkářstvím, příživnictvím, lidskou hloupostí, pokrytectvím",
      },
      {
        key: "gogol-context",
        category: "context",
        title: "Gogol — realismus/romantismus",
        sourceStatement:
          "v jeho díle se prolíná realismus s romantickými prvky",
      },
    ],
  },
  {
    slug: "dostojevskij",
    answerName: "Fjodor Michajlovič Dostojevskij",
    answerAliases: [
      "Dostojevskij",
      "Dostojevski",
      "F. M. Dostojevskij",
      "Dostoyevsky",
    ],
    filename: "3. Realismus v Rusku.docx",
    hints: [
      {
        key: "dost-role",
        category: "role",
        title: "Dostojevskij — role",
        sourceStatement: "jeden ze zakladatelů moderního psychologického románu",
      },
      {
        key: "dost-trait",
        category: "trait",
        title: "Dostojevskij — uznání",
        sourceStatement: "světově uznávaný prozaik",
      },
      {
        key: "dost-context",
        category: "context",
        title: "Dostojevskij — Sibiř",
        sourceStatement:
          "jeho tvorbu ovlivnila životní tragická událost – za účast v pokrokovém hnutí byl odsouzen k trestu smrti, těsně před popravou mu byl změněn trest na 4 roky vězení na Sibiři",
      },
      {
        key: "dost-work",
        category: "work",
        title: "Dostojevskij — Bratři Karamazovi",
        sourceStatement: "Bratři Karamazovi",
      },
    ],
  },
  {
    slug: "tolstoj",
    answerName: "Lev Nikolajevič Tolstoj",
    answerAliases: ["Tolstoj", "Tolstoy", "L. N. Tolstoj"],
    filename: "3. Realismus v Rusku.docx",
    hints: [
      {
        key: "tol-role",
        category: "role",
        title: "Tolstoj — role",
        sourceStatement: "jeden z největších spisovatelů světové literatury",
      },
      {
        key: "tol-context",
        category: "context",
        title: "Tolstoj — Jasná Poljana",
        sourceStatement:
          "narodil se v Jasné Poljaně ve šlechtické rodině, brzy osiřel",
      },
      {
        key: "tol-trait",
        category: "trait",
        title: "Tolstoj — Sevastopol",
        sourceStatement:
          "odešel bojovat na Kavkaz, podílel se na obraně Sevastopolu, což mu posloužilo jako námět k mnoha povídkám",
      },
      {
        key: "tol-work",
        category: "work",
        title: "Tolstoj — hospodářství",
        sourceStatement:
          "po neúspěšném studiu práv se vrátil do Poljany, kde se chtěl věnovat hospodářství",
      },
    ],
  },
  {
    slug: "macha",
    answerName: "Karel Hynek Mácha",
    answerAliases: ["Mácha", "Macha", "K. H. Mácha"],
    filename: "Máj.docx",
    hints: [
      {
        key: "macha-work",
        category: "work",
        title: "Mácha — Máj nadpis",
        sourceStatement: "Máj| KAREL HYNEK MÁCHA",
      },
      {
        key: "macha-trait",
        category: "trait",
        title: "Mácha — motivy",
        sourceStatement:
          "Motivy: tragická láska; májová příroda; smrt (otázky lidské existence); vina; pomsta;",
      },
      {
        key: "macha-context",
        category: "context",
        title: "Mácha — Dedikace prostor",
        sourceStatement:
          "Děj se odehrává v prostředí Doks/ Bezdězu a Máchova jezera ve 2. pol. 18. stol.",
      },
      {
        key: "macha-role",
        category: "role",
        title: "Mácha — téma",
        sourceStatement:
          "Téma: Nešťastný životní osud Viléma a Jarmily a zobrazení májové přírody",
      },
    ],
  },
  {
    slug: "erben",
    answerName: "Karel Jaromír Erben",
    answerAliases: ["Erben", "K. J. Erben"],
    filename: "Kytice.docx",
    hints: [
      {
        key: "erben-work",
        category: "work",
        title: "Erben — Kytice",
        sourceStatement:
          "Kytice/ Kytice z pověstí národních | Karel Jaromír Erben",
      },
      {
        key: "erben-trait",
        category: "trait",
        title: "Erben — motivy",
        sourceStatement:
          "sobeckost, chamtivost, zločin x trest, mateřství, láska, osud",
      },
      {
        key: "erben-role",
        category: "role",
        title: "Erben — téma",
        sourceStatement: "Morální provinění člověka a jejich následky",
      },
      {
        key: "erben-context",
        category: "context",
        title: "Erben — hrdinové",
        sourceStatement:
          "Erbenovi hrdinové nepředstavují romanticky rozpolcené jedince bouřící se vůči světu, společnosti či životu.",
      },
    ],
  },
  {
    slug: "nemcova",
    answerName: "Božena Němcová",
    answerAliases: ["Němcová", "Nemcova", "B. Němcová"],
    filename: "Babička.docx",
    hints: [
      {
        key: "nem-work",
        category: "work",
        title: "Němcová — Babička",
        sourceStatement: "Babička (podtitul Obrazy z venkovského života)",
      },
      {
        key: "nem-trait",
        category: "trait",
        title: "Němcová — idyla",
        sourceStatement:
          "idylicky zobrazuje život na venkově v 1. polovině 19. Století",
      },
      {
        key: "nem-context",
        category: "context",
        title: "Němcová — autobiografie",
        sourceStatement:
          "částečně autobiografické (ne životopisné) dílo – vzpomínky na vlastní dětství (postava Barunky) jsou doplněny a rozšířeny o poznání lidového života",
      },
      {
        key: "nem-role",
        category: "role",
        title: "Němcová — vrchol",
        sourceStatement: "vrchol tvorby",
      },
    ],
  },
  {
    slug: "jirasek",
    answerName: "Alois Jirásek",
    answerAliases: ["Jirásek", "Jirasek"],
    filename: "11. A. Jirásek.docx",
    hints: [
      {
        key: "jir-role",
        category: "role",
        title: "Jirásek — role",
        sourceStatement: "přední tvůrce české historické prózy",
      },
      {
        key: "jir-context",
        category: "context",
        title: "Jirásek — Hronov",
        sourceStatement: "narozen v Hronově",
      },
      {
        key: "jir-trait",
        category: "trait",
        title: "Jirásek — obraz lidu",
        sourceStatement:
          "jako jediný český spisovatel vytvořil umělecký obraz života našeho lidu od dob mýtických až",
      },
      {
        key: "jir-work",
        category: "work",
        title: "Jirásek — profesor",
        sourceStatement:
          "po studiu historie pracoval jako středoškolský profesor v Litomyšli, pak v Praze",
      },
    ],
  },
  {
    slug: "stroupeznicky",
    answerName: "Ladislav Stroupežnický",
    answerAliases: ["Stroupežnický", "Stroupeznicky"],
    filename: "12. České drama 2. pol 19. stol.docx",
    hints: [
      {
        key: "str-role",
        category: "role",
        title: "Stroupežnický — role",
        sourceStatement: "dramatik, dramaturg ND",
      },
      {
        key: "str-work",
        category: "work",
        title: "Stroupežnický — Naši furianti",
        sourceStatement: "Naši furianti",
      },
      {
        key: "str-trait",
        category: "trait",
        title: "Stroupežnický — komedie",
        sourceStatement: "realistická komedie ze života jihočeské vesnice",
      },
      {
        key: "str-context",
        category: "context",
        title: "Stroupežnický — spor",
        sourceStatement:
          "spor mezi vysloužilým vojákem a krejčím, kdo bude v obci obsazen do místa ponocného",
      },
    ],
  },
  {
    slug: "preissova",
    answerName: "Gabriela Preissová",
    answerAliases: ["Preissová", "Preissova"],
    filename: "12. České drama 2. pol 19. stol.docx",
    hints: [
      {
        key: "pre-role",
        category: "role",
        title: "Preissová — role",
        sourceStatement: "autorka národopisných próz a divadelních her",
      },
      {
        key: "pre-work",
        category: "work",
        title: "Preissová — Její pastorkyňa",
        sourceStatement: "Její pastorkyňa",
      },
      {
        key: "pre-trait",
        category: "trait",
        title: "Preissová — Slovácko",
        sourceStatement:
          "náměty čerpala ze Slovácka, kde prožila část života",
      },
      {
        key: "pre-context",
        category: "context",
        title: "Preissová — Janáček",
        sourceStatement:
          "podle této hry složil Leoš Janáček operu se stejnojmenným názvem",
      },
    ],
  },
  {
    slug: "mrstikove",
    answerName: "Vilém a Alois Mrštíkové",
    answerAliases: [
      "Mrštíkové",
      "Mrstikove",
      "bratři Mrštíkové",
      "Alois a Vilém Mrštíkové",
      "Mrštík",
    ],
    filename: "12. České drama 2. pol 19. stol.docx",
    hints: [
      {
        key: "mrs-role",
        category: "role",
        title: "Mrštíkové — role",
        sourceStatement: "nejvýznamnější představitelé realistického dramatu",
      },
      {
        key: "mrs-work",
        category: "work",
        title: "Mrštíkové — Maryša",
        sourceStatement: "Maryša",
      },
      {
        key: "mrs-trait",
        category: "trait",
        title: "Mrštíkové — sociální drama",
        sourceStatement: "sociální drama",
      },
      {
        key: "mrs-context",
        category: "context",
        title: "Mrštíkové — děj",
        sourceStatement:
          "hra o nerovném manželství, o protikladu bohatství a citu, o síle předsudků a roli peněz v tehdejší společnosti",
      },
    ],
  },
];

/**
 * Build „Kdo jsem?“ pack — every hint is a verified verbatim SOURCE extract.
 */
export async function buildLiterarniOsobnostiKdoJsem(
  now = new Date().toISOString(),
): Promise<KdoJsemPack> {
  const evidence: KdoJsemPack["evidence"] = {};
  const mysteries = [];

  for (const draft of MYSTERIES) {
    const meta = await getIngestedDocumentMeta(draft.filename);
    const hints = [];
    const kuIds: string[] = [];

    for (let i = 0; i < draft.hints.length; i += 1) {
      const h = draft.hints[i]!;
      assertVerbatimInSource(meta.plainText, h.sourceStatement, h.key);
      const item = await ensureVerbatimQaFact({
        key: h.key,
        documentId: meta.documentId,
        filename: meta.filename,
        sourceStatement: h.sourceStatement,
        title: h.title,
      });
      const { id: evidenceId, evidence: ev } = toKdoJsemEvidence(h.key, item);
      evidence[evidenceId] = ev;
      kuIds.push(item.knowledgeUnitId);

      const displayText = redactNameFromStatement(ev.publishedStatement, [
        draft.answerName,
        ...draft.answerAliases,
        "Honoré de",
        "Honore de",
        "Gustave",
        "Gustav",
        "Emile",
        "Émile",
        "Charles",
        "Nikolaj Vasiljevič",
        "Fjodor Michajlovič",
        "Lev Nikolajevič",
        "Karel Hynek",
        "Karel Jaromír",
        "Božena",
        "Alois",
        "Ladislav",
        "Gabriela",
        "Vilém a Alois",
        "KAREL HYNEK MÁCHA",
      ]);

      hints.push({
        id: mid(`hint:${h.key}`),
        order: i,
        category: h.category,
        displayText: displayText || ev.publishedStatement.slice(0, 200),
        evidenceId,
      });
    }

    mysteries.push({
      id: mid(`mystery:${draft.slug}`),
      slug: draft.slug,
      answerName: draft.answerName,
      answerAliases: draft.answerAliases,
      hints,
      knowledgeUnitIds: kuIds,
    });
  }

  const pack = {
    id: mid("pack:literarni-osobnosti"),
    slug: "literarni-osobnosti",
    title: "Kdo jsem? — literární osobnosti",
    summary:
      "Postupné nápovědy z ověřených SOURCE faktů. Čím dřív tipneš, tím víc bodů.",
    requiresVerifiedOnly: true as const,
    mysteries,
    evidence,
    createdAt: now,
    updatedAt: now,
  };

  return parseKdoJsemPack(pack);
}
