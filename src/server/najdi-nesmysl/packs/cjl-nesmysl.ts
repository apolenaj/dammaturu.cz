import { randomUUID } from "node:crypto";
import type {
  NonsenseCategory,
  NonsensePack,
  NonsenseRound,
} from "@/domain/learning/najdi-nesmysl";
import { parseNonsensePack } from "@/domain/learning/najdi-nesmysl";

type StatementDraft = { text: string; isTrue: boolean; note?: string };

type RoundDraft = {
  slug: string;
  category: NonsenseCategory;
  stem?: string;
  statements: [StatementDraft, StatementDraft, StatementDraft, StatementDraft];
  explanation: string;
  tags?: string[];
};

const ROUNDS: RoundDraft[] = [
  // ——— authors ———
  {
    slug: "autor-macha-romantismus",
    category: "author",
    stem: "Které tvrzení o K. H. Máchovi je nesmysl?",
    statements: [
      {
        text: "Karel Hynek Mácha je autorem básnické skladby Máj.",
        isTrue: true,
        note: "Máj (1836) je Máchovo stěžejní dílo.",
      },
      {
        text: "Mácha patří k českému romantismu.",
        isTrue: true,
        note: "Subjektivita, cit, kontrast přírody a tragédie — typický romantismus.",
      },
      {
        text: "Mácha napsal realistický román Babička.",
        isTrue: false,
      },
      {
        text: "V Máji vystupují Jarmila a Vilém.",
        isTrue: true,
        note: "Tragická milenecká dvojice je jádrem děje Máje.",
      },
    ],
    explanation:
      "Nesmysl je, že Mácha napsal Babičku — tu napsala Božena Němcová (1855), ne Mácha. Mácha je autor Máje a představitel českého romantismu; Jarmila a Vilém jsou postavy Máje. Nezaměňuj romantického básníka s realistickou prózou Němcové.",
    tags: ["macha", "romantismus"],
  },
  {
    slug: "autor-neruda-realismus",
    category: "author",
    stem: "Které tvrzení o Janu Nerudovi je nesmysl?",
    statements: [
      {
        text: "Jan Neruda napsal Povídky malostranské.",
        isTrue: true,
        note: "Cyklus povídek z Malé Strany — realistický obraz Prahy.",
      },
      {
        text: "Neruda patří k májovcům / českému realismu.",
        isTrue: true,
      },
      {
        text: "Neruda je autorem baladické Kytice z pověstí národních.",
        isTrue: false,
      },
      {
        text: "V Povídkách malostranských se objevují typy malostranských obyvatel.",
        isTrue: true,
      },
    ],
    explanation:
      "Kytici napsal K. J. Erben, ne Neruda. Neruda = Povídky malostranské a májovecký realismus. Erben = romantické balady s mravním řádem. Zaměnění autora Kytice za Nerudu je častý omyl — po kontrole si zapamatuj: Erben ↔ Kytice, Neruda ↔ Malá Strana.",
    tags: ["neruda", "erben"],
  },
  {
    slug: "autor-havlicek-satira",
    category: "author",
    statements: [
      {
        text: "Karel Havlíček Borovský napsal Tyrolské elegie.",
        isTrue: true,
      },
      {
        text: "Havlíček byl kritik a satira národního života.",
        isTrue: true,
      },
      {
        text: "Havlíček je autorem básnické skladby Máj.",
        isTrue: false,
      },
      {
        text: "Tyrolské elegie vznikly v souvislosti s Brixenem.",
        isTrue: true,
      },
    ],
    explanation:
      "Nesmysl: Máj napsal Karel Hynek Mácha, ne Havlíček. Havlíček = Tyrolské elegie, satira, publicistika. Mácha = romantická skladba Máj. Po opravě si autory drž odděleně: Havlíček ↔ elegie/satira; Mácha ↔ Máj.",
    tags: ["havlicek"],
  },
  // ——— works ———
  {
    slug: "dilo-maj-struktura",
    category: "work",
    stem: "Které tvrzení o Máji je nesmysl?",
    statements: [
      {
        text: "Máj má čtyři zpěvy a dvě intermezza.",
        isTrue: true,
      },
      {
        text: "V prvním zpěvu Jarmila skočí do jezera a utopí se.",
        isTrue: true,
      },
      {
        text: "Máj končí veselou svatbou Viléma a Jarmily.",
        isTrue: false,
      },
      {
        text: "Ve třetím zpěvu dochází k Vilémově popravě.",
        isTrue: true,
      },
    ],
    explanation:
      "Máj nekončí svatbou — je to tragédie: Jarmila se utopí, Vilém je popraven; závěr patří poutníkovi/autorovi. Veselé happy end by popíralo romantickou tragiku. Zapamatuj si: Máj = smrt a vina, ne svatba.",
    tags: ["maj"],
  },
  {
    slug: "dilo-babicka-postavy",
    category: "work",
    statements: [
      {
        text: "Babička je dílo Boženy Němcové.",
        isTrue: true,
      },
      {
        text: "Viktorka je postava spojená s Babičkou.",
        isTrue: true,
      },
      {
        text: "Babička je naturalistický román o pařížské spodinině.",
        isTrue: false,
      },
      {
        text: "Babička zobrazuje idylický obraz venkova.",
        isTrue: true,
      },
    ],
    explanation:
      "Babička není naturalismus pařížské spodiny (to spíš Zola apod.) — je to česká próza Němcové s idylou venkova a postavou Viktoriky. Naturalismus = determinismus prostředí, často tvrdší sociální řezy. Po opravě: Babička = Němcová / venkov / Viktorka.",
    tags: ["babicka"],
  },
  {
    slug: "dilo-zlocin-raskolnikov",
    category: "work",
    statements: [
      {
        text: "Zločin a trest napsal F. M. Dostojevskij.",
        isTrue: true,
      },
      {
        text: "Raskolnikov zabije lichvářku a její sestru.",
        isTrue: true,
      },
      {
        text: "Raskolnikov je postava z Balzacova Otce Goriota.",
        isTrue: false,
      },
      {
        text: "Soňa doprovází Raskolnikova na Sibiř.",
        isTrue: true,
      },
    ],
    explanation:
      "Raskolnikov patří do Zločinu a trestu (Dostojevskij), ne do Otce Goriota (Balzac — Goriot, Rastignac). Zaměnění ruského psychologického románu s francouzským realismem je časté. Po vysvětlení: Raskolnikov ↔ Dostojevskij; Rastignac/Goriot ↔ Balzac.",
    tags: ["dostojevskij"],
  },
  // ——— periods ———
  {
    slug: "obdobi-narodni-obrozeni",
    category: "period",
    statements: [
      {
        text: "Národní obrození spadá zhruba na konec 18. a 1. polovinu 19. století.",
        isTrue: true,
      },
      {
        text: "Obrození souvisí s obnovou českého jazyka a kultury.",
        isTrue: true,
      },
      {
        text: "Národní obrození začíná až po roce 1948 komunistickým převratem.",
        isTrue: false,
      },
      {
        text: "Jungmann a Dobrovský patří do kontextu obrození.",
        isTrue: true,
      },
    ],
    explanation:
      "Národní obrození není po roce 1948 — to je 20. století a politický převrat. Obrození = přelom 18./19. stol., jazyk a kultura (Dobrovský, Jungmann…). Rok 1948 si nepřeřazuj do obrozeneckého období.",
    tags: ["obrozeni"],
  },
  {
    slug: "obdobi-protektorat",
    category: "period",
    statements: [
      {
        text: "Protektorát Čechy a Morava trval 1939–1945.",
        isTrue: true,
      },
      {
        text: "Vznik ČSR je rok 1918.",
        isTrue: true,
      },
      {
        text: "Protektorát začal hned po Bílé hoře roku 1620.",
        isTrue: false,
      },
      {
        text: "Meziválečná 1. republika spadá mezi 1918 a 1938/39.",
        isTrue: true,
      },
    ],
    explanation:
      "Protektorát není 1620 — Bílá hora je barokní/pobělohorský zlom. Protektorát = nacistická okupace 1939–1945. Drž odděleně: 1620 · 1918 · 1939–45.",
    tags: ["protektorat"],
  },
  // ——— movements ———
  {
    slug: "smer-romantismus",
    category: "movement",
    statements: [
      {
        text: "Romantismus zdůrazňuje subjektivitu a cit.",
        isTrue: true,
      },
      {
        text: "Mácha je typický český romantik.",
        isTrue: true,
      },
      {
        text: "Romantismus je totéž co naturalismus Emila Zoly.",
        isTrue: false,
      },
      {
        text: "Romantismus často staví ideál proti realitě.",
        isTrue: true,
      },
    ],
    explanation:
      "Romantismus ≠ naturalismus. Naturalismus (Zola) = determinismus prostředí a dědičnosti, dokumentární „experiment“. Romantismus = cit, subjekt, kontrast. Po opravě si směry nerozmazávej: romantismus / realismus / naturalismus jsou různé.",
    tags: ["romantismus"],
  },
  {
    slug: "smer-realismus",
    category: "movement",
    statements: [
      {
        text: "Realismus typizuje všední život a společenské vrstvy.",
        isTrue: true,
      },
      {
        text: "Balzac a Neruda patří do realistického kontextu.",
        isTrue: true,
      },
      {
        text: "Realismus odmítá detailní popis prostředí a postav.",
        isTrue: false,
      },
      {
        text: "Realismus často kriticky zobrazuje společnost.",
        isTrue: true,
      },
    ],
    explanation:
      "Realismus právě na detailu prostředí a charakteristice postav stojí (Balzacovy popisy, Nerudovy typy). Tvrzení, že realismus detail odmítá, je nesmysl — to by spíš sedělo na jiné poetiky. Zapamatuj: realismus = typizace + detail + společenský řez.",
    tags: ["realismus"],
  },
  {
    slug: "smer-symbolismus",
    category: "movement",
    statements: [
      {
        text: "Symbolismus pracuje s náznakem a symbolem.",
        isTrue: true,
      },
      {
        text: "Symbolismus souvisí s hudebností verše.",
        isTrue: true,
      },
      {
        text: "Symbolismus je totéž co realistická reportáž ze života dělníků.",
        isTrue: false,
      },
      {
        text: "V české literatuře patří k symbolismu např. Otokar Březina.",
        isTrue: true,
      },
    ],
    explanation:
      "Symbolismus není realistická reportáž — je to poetika náznaku, symbolu a hudebnosti (Březina, Mallarmé…). Reportážní sociální řez patří spíš k realismu/naturalismu. Po kole: symbolismus ≠ sociální dokument.",
    tags: ["symbolismus"],
  },
  // ——— characters ———
  {
    slug: "postava-viktorka",
    category: "character",
    statements: [
      {
        text: "Viktorka je postava z Babičky Boženy Němcové.",
        isTrue: true,
      },
      {
        text: "Viktorka je spojena s tragickým milostným příběhem.",
        isTrue: true,
      },
      {
        text: "Viktorka je dcerou Goriota v Balzacově románu.",
        isTrue: false,
      },
      {
        text: "Babička patří do českého venkovského prostředí.",
        isTrue: true,
      },
    ],
    explanation:
      "Viktorka není Goriotova dcera — Goriotovy dcery jsou Anastázie a Delfina (Otec Goriot). Viktorka = Babička / Němcová. Po opravě si postavy drž u správného díla.",
    tags: ["viktorka"],
  },
  {
    slug: "postava-rastignac",
    category: "character",
    statements: [
      {
        text: "Rastignac je mladý student práv v Otci Goriotovi.",
        isTrue: true,
      },
      {
        text: "Rastignac se stará o umírajícího Goriota.",
        isTrue: true,
      },
      {
        text: "Rastignac je poutník ve čtvrtém zpěvu Máje.",
        isTrue: false,
      },
      {
        text: "Pod vlivem prostředí Rastignac buduje kariéru bezohledněji.",
        isTrue: true,
      },
    ],
    explanation:
      "Poutník ve 4. zpěvu Máje není Rastignac — to je Máchův závěr (ztotožnění s dějem). Rastignac = Balzac / Paříž / Goriot. Po vysvětlení: Mácha ≠ Balzacovy postavy.",
    tags: ["rastignac"],
  },
  {
    slug: "postava-marysa",
    category: "character",
    statements: [
      {
        text: "Maryša miluje Francka, ale je nucena vzít si Vávru.",
        isTrue: true,
      },
      {
        text: "Maryša je drama bratrů Mrštíků.",
        isTrue: true,
      },
      {
        text: "Maryša je hlavní hrdinka Máchova Máje.",
        isTrue: false,
      },
      {
        text: "Maryša nakonec otráví Vávru a k činu se přizná.",
        isTrue: true,
      },
    ],
    explanation:
      "Hrdinkou Máje je Jarmila, ne Maryša. Maryša = Mrštíkové, vesnické drama, Vávra/Francek. Po opravě: Jarmila ↔ Máj; Maryša ↔ Mrštíkové.",
    tags: ["marysa"],
  },
  // ——— genres ———
  {
    slug: "zanr-balada",
    category: "genre",
    statements: [
      {
        text: "Balada je lyricko-epický útvar s často tragickým koncem.",
        isTrue: true,
      },
      {
        text: "Erbenova Kytice obsahuje balady (např. Vodník, Polednice).",
        isTrue: true,
      },
      {
        text: "Balada je totéž co realistický společenský román o 2500 postavách.",
        isTrue: false,
      },
      {
        text: "Balady často pracují s lidovým motivem a mravním řádem.",
        isTrue: true,
      },
    ],
    explanation:
      "Balada ≠ rozsáhlý společenský román (Lidská komedie / Balzac). Balada = kratší lyricko-epický, často temný děj (Kytice). Románový cyklus je jiný žánr. Po kole: balada / román nerozmazávej.",
    tags: ["balada"],
  },
  {
    slug: "zanr-drama",
    category: "genre",
    statements: [
      {
        text: "Drama je určeno především k jevištnímu provedení.",
        isTrue: true,
      },
      {
        text: "Maryša je sociální drama.",
        isTrue: true,
      },
      {
        text: "Drama vždy znamená jen veselohru bez konfliktu.",
        isTrue: false,
      },
      {
        text: "Realistické drama 19. století často zobrazuje společenské napětí.",
        isTrue: true,
      },
    ],
    explanation:
      "Drama není jen veselohra — zahrnuje tragédii, sociální drama, komedii… Maryša je konfliktní sociální drama, ne bezzáběrová veselohra. „Drama“ = dramatický druh, ne synonymum pro legraci.",
    tags: ["drama"],
  },
  {
    slug: "zanr-roman",
    category: "genre",
    statements: [
      {
        text: "Román je rozsáhlý epický útvar v próze.",
        isTrue: true,
      },
      {
        text: "Otec Goriot a Anna Karenina jsou romány.",
        isTrue: true,
      },
      {
        text: "Román je vždy psán výhradně ve verších jako sonet.",
        isTrue: false,
      },
      {
        text: "Psychologický román zkoumá vnitřní stavy postav.",
        isTrue: true,
      },
    ],
    explanation:
      "Román není sonet ve verších — sonet je lyrická forma; román je typicky próza (Goriot, Karenina). Veršovaný epos/skladba (Máj) je jiná kategorie. Po opravě: román ≈ próza; sonet ≈ lyrika.",
    tags: ["roman"],
  },
];

function buildRound(draft: RoundDraft): NonsenseRound {
  const statements = draft.statements.map((s) => ({
    id: randomUUID(),
    text: s.text,
    isTrue: s.isTrue,
  }));
  const trueNotes: Record<string, string> = {};
  draft.statements.forEach((s, i) => {
    if (s.isTrue && s.note) {
      trueNotes[statements[i]!.id] = s.note;
    }
  });
  return {
    id: randomUUID(),
    slug: draft.slug,
    category: draft.category,
    stem: draft.stem ?? "Které tvrzení je nesmysl?",
    statements: statements as NonsenseRound["statements"],
    explanation: draft.explanation,
    trueNotes,
    tags: draft.tags ?? [],
  };
}

export function buildCjlNesmyslPack(
  nowIso = new Date().toISOString(),
): NonsensePack {
  const rounds = ROUNDS.map(buildRound);
  const categories = new Set(rounds.map((r) => r.category));
  if (categories.size < 6) {
    throw new Error("Pack musí pokrýt všech 6 kategorií.");
  }
  return parseNonsensePack({
    id: randomUUID(),
    slug: "cjl-nesmysl",
    title: "Najdi nesmysl — ČJL",
    summary:
      "4 tvrzení: 3 pravda, 1 nesmysl. Odhal chybu, napiš proč, pak si přečti korektivní vysvětlení (autoři, díla, období, směry, postavy, žánry).",
    rounds,
    createdAt: nowIso,
    updatedAt: nowIso,
  });
}
