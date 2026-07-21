import { deterministicUuid } from "@/server/curriculum/ids";
import {
  buildLiteraryWork,
  type LiteraryWork,
  type LiteraryWorkDraft,
  type LiteraryWorkSectionId,
} from "@/domain/learning/literary-work";

const NS = "dammaturu.literary-work";
const NOW = "2026-07-20T12:00:00.000Z";

function wid(slug: string) {
  return deterministicUuid(NS, `work:${slug}`);
}

type Sec = LiteraryWorkDraft["sections"][LiteraryWorkSectionId];

function sec(
  blocks: Sec["blocks"],
  summaryCs?: string,
): Omit<Sec, "id"> {
  return { summaryCs, blocks };
}

const maj: LiteraryWorkDraft = {
  slug: "maj",
  title: "Máj",
  author: "Karel Hynek Mácha",
  yearPublished: 1836,
  workType: "lyrickoepická báseň",
  movement: "Romantismus",
  summary:
    "Vrchol českého romantismu — příroda, vina, láska a smrt v májovém kraji.",
  related: {
    curriculumTopicSlug: "rozbor-maj",
    sourceFilename: "Máj.docx",
    reconstructionHref: "/app/learn/rekonstrukce-pribehu/literarni-dej",
    teachBackHref: "/app/learn/nauc-zpatky/cjl-teach-back",
    testHref: "/app/tests/otazky/cjl-otazky",
  },
  sections: {
    quick_grasp: sec(
      [
        {
          type: "callout",
          tone: "brand",
          title: "Jednou větou",
          body: "Romantická báseň o vině, lásce a smrti — příroda zrcadlí vnitřní drama.",
        },
        {
          type: "bullets",
          items: [
            "Autor: K. H. Mácha · 1836",
            "Žánr: lyrickoepická báseň (4 zpěvy + 2 intermezza)",
            "Jádro: Jarmila / Vilém — zločin, vina, poprava",
            "Klíč: kontrast krásy máje a lidské tragédie",
          ],
        },
      ],
      "Mikro-orientace před hlubším rozborem.",
    ),
    author_context: sec([
      {
        type: "key_value",
        pairs: [
          { label: "Autor", value: "Karel Hynek Mácha (1810–1836)" },
          { label: "Směr", value: "Romantismus (český vrchol)" },
          { label: "Vydání", value: "1836" },
          {
            label: "Kontext",
            value: "Osobní i národní napětí; vliv evropského romantismu",
          },
        ],
      },
      {
        type: "paragraph",
        text: "Mácha spojuje intenzivní subjektivitu, kult přírody a motivy viny a smrti. Máj je jeho stěžejní dílo — krátké, ale husté.",
      },
    ]),
    themes_motifs: sec([
      {
        type: "bullets",
        items: [
          "Láska a zrada",
          "Vina a trest",
          "Příroda jako zrcadlo duše",
          "Samota, smrt, pomíjivost",
          "Konflikt ideálu a reality",
        ],
      },
      {
        type: "callout",
        tone: "info",
        title: "Motivy",
        body: "Májová noc, jezero, vězení, popraviště, hvězdy — opakující se obrazy vážou lyrickou a epickou vrstvu.",
      },
    ]),
    spacetime: sec([
      {
        type: "key_value",
        pairs: [
          {
            label: "Čas",
            value: "Májová noc / jaro; děj koncentrovaný, ne kronikářský",
          },
          {
            label: "Prostor",
            value: "Česká krajina — jezero, skály, vězení, popraviště",
          },
        ],
      },
      {
        type: "paragraph",
        text: "Časoprostor je silně atmosférický: příroda není kulisa, ale aktivní partner emocí.",
      },
    ]),
    composition: sec([
      {
        type: "bullets",
        items: [
          "4 zpěvy + 2 intermezza",
          "Střídání lyrických a epických pasáží",
          "Kruhová / zrcadlová výstavba obrazů přírody",
          "Gradace k tragickému vyústění",
        ],
      },
    ]),
    genre: sec([
      {
        type: "key_value",
        pairs: [
          { label: "Druh", value: "Poesie" },
          { label: "Žánr", value: "Lyrickoepická báseň" },
          { label: "Forma", value: "Vázaný verš, bohatá obraznost" },
        ],
      },
      {
        type: "paragraph",
        text: "U maturity zdůrazni lyrickoepický charakter: epický příběh je nesen silnou lyrickou atmosférou.",
      },
    ]),
    characters: sec([
      {
        type: "character",
        name: "Vilém (Hynek)",
        role: "Romantický hrdina / vězeň",
        traits: ["vášeň", "vina", "vnitřní konflikt", "osamělost"],
      },
      {
        type: "character",
        name: "Jarmila",
        role: "Milovaná žena",
        traits: ["krása", "tragický osud", "spojena s přírodními obrazy"],
      },
      {
        type: "callout",
        tone: "warning",
        title: "Pozor",
        body: "Nezaměňuj Máchovy postavy s Erbenovými (Kytice) — jiný typ hrdiny i morálky.",
      },
    ]),
    plot: sec([
      {
        type: "paragraph",
        text: "Epická linie sleduje dramatický vztah a zločin, který vede k trestu. Lyrické pasáže přírody rámcují a komentují lidský osud.",
      },
      {
        type: "bullets",
        items: [
          "Expozice májové krajiny a napětí",
          "Odhalení viny / konfliktu",
          "Vězení a vnitřní monolog",
          "Tragické vyústění (poprava / ztráta)",
        ],
      },
      {
        type: "link_cta",
        label: "Procvičit děj (rekonstrukce)",
        href: "/app/learn/rekonstrukce-pribehu/literarni-dej",
      },
    ]),
    language: sec([
      {
        type: "bullets",
        items: [
          "Bohatá metaforika a senzuální obrazy",
          "Zvukomalba, opakování, refrénovitost",
          "Kontrast světlých a temných motivů",
          "Subjektivní, emocionálně nabitý jazyk",
        ],
      },
    ]),
    tropes: sec([
      {
        type: "bullets",
        items: [
          "Metafora a personifikace přírody",
          "Symbolika máje, noci, hvězd, vody",
          "Oxymóron / kontrast krásy a smrti",
          "Apostrofa, řečnické otázky",
        ],
      },
    ]),
    exam_talking_points: sec([
      {
        type: "callout",
        tone: "success",
        title: "Řekni u zkoušky",
        body: "Máj je vrchol českého romantismu: subjekt, příroda a vina. Formálně lyrickoepická báseň s propojením děje a atmosféry.",
      },
      {
        type: "bullets",
        items: [
          "Zařaď směr + rok + žánr",
          "Jmenuj 2–3 motivy a uveď příklad z textu",
          "Vysvětli vztah přírody a vnitřního dramatu",
          "Odliš od Erbena (morálka / balada)",
        ],
      },
    ]),
    common_mistakes: sec([
      {
        type: "bullets",
        items: [
          "Říct, že Máj je balada jako Kytice",
          "Zaměnit Máchu s Erbenem",
          "Ignorovat lyrickou vrstvu a vyprávět jen „děj“",
          "Datovat dílo mimo 1836 / špatný směr",
        ],
      },
    ]),
    test: sec([
      {
        type: "quiz",
        id: "maj-q1",
        question: "Ve kterém roce vyšel Máj?",
        options: ["1820", "1836", "1853", "1868"],
        correctIndex: 1,
        explanation: "Máj vyšel roku 1836.",
      },
      {
        type: "quiz",
        id: "maj-q2",
        question: "Jaký je žánr Máje?",
        options: [
          "Realistický román",
          "Lyrickoepická báseň",
          "Drama",
          "Pohádka",
        ],
        correctIndex: 1,
        explanation: "Máj je lyrickoepická báseň.",
      },
      {
        type: "quiz",
        id: "maj-q3",
        question: "Ke kterému směru patří Mácha / Máj?",
        options: ["Realismus", "Romantismus", "Naturalismus", "Klasicismus"],
        correctIndex: 1,
        explanation: "Máj je klíčové dílo českého romantismu.",
      },
    ]),
    oral_exam: sec([
      {
        type: "oral_prompt",
        id: "maj-o1",
        prompt: "Zařaď Máj do kontextu romantismu a vysvětli roli přírody.",
        tips: [
          "Začni směrem a rokem",
          "Uveď 1 motiv + 1 obraz",
          "Srovnej krátce s Erbenem",
        ],
      },
      {
        type: "oral_prompt",
        id: "maj-o2",
        prompt: "Popiš kompozici a vztah lyrické a epické složky.",
        tips: ["Zpěvy / intermezza", "Příroda vs. děj", "Gradace k tragédii"],
      },
    ]),
  },
};

const kytice: LiteraryWorkDraft = {
  slug: "kytice",
  title: "Kytice",
  author: "Karel Jaromír Erben",
  yearPublished: 1853,
  workType: "sbírka balad",
  movement: "Romantismus / národní obrození",
  summary:
    "Balady o vině, trestu a řádu světa — lidová tradice přetavená do umělé poesie.",
  related: {
    curriculumTopicSlug: "rozbor-kytice",
    sourceFilename: "Kytice.docx",
    reconstructionHref: "/app/learn/rekonstrukce-pribehu/literarni-dej",
    testHref: "/app/tests/otazky/cjl-otazky",
  },
  sections: {
    quick_grasp: sec(
      [
        {
          type: "callout",
          tone: "brand",
          title: "Jednou větou",
          body: "Sbírka balad: porušení mravního/přírodního řádu → trest. Matka a dítě jako ústřední osa.",
        },
        {
          type: "bullets",
          items: [
            "Autor: K. J. Erben · 1853 (rozšíření později)",
            "Žánr: balady (sbírka)",
            "Jádro: vina – trest – poučení",
            "Odliš od Máje: Erben = řád a kolektivní morálka",
          ],
        },
      ],
      "Rychlá orientace ve sbírce.",
    ),
    author_context: sec([
      {
        type: "key_value",
        pairs: [
          { label: "Autor", value: "Karel Jaromír Erben (1811–1870)" },
          { label: "Role", value: "Básník, folklorista, historik" },
          { label: "Vydání", value: "1853" },
          {
            label: "Kontext",
            value: "Národní obrození + romantismus lidové tradice",
          },
        ],
      },
      {
        type: "paragraph",
        text: "Erben čerpá z lidové slovesnosti. Kytice není „soukromá zpověď“ jako Máj, ale svět pravidel a důsledků.",
      },
    ]),
    themes_motifs: sec([
      {
        type: "bullets",
        items: [
          "Vina a trest",
          "Mateřství / vztah matka–dítě",
          "Nadpřirozeno zasahující do lidského světa",
          "Osudovost a mravní řád",
          "Pomsta, přísaha, zákaz",
        ],
      },
    ]),
    spacetime: sec([
      {
        type: "key_value",
        pairs: [
          {
            label: "Čas",
            value: "Nadčasový / pohádkově-baladický (ne historická kronika)",
          },
          {
            label: "Prostor",
            value: "Venkov, les, voda, dům — lidový svět",
          },
        ],
      },
    ]),
    composition: sec([
      {
        type: "bullets",
        items: [
          "Sbírka samostatných balad (rámec „kytice“)",
          "Typická baladická stavba: situace → konflikt → katastrofa",
          "Opakující se motivické vzorce napříč básněmi",
          "Ústřední báseň Kytice jako programový úvod",
        ],
      },
    ]),
    genre: sec([
      {
        type: "key_value",
        pairs: [
          { label: "Druh", value: "Poesie" },
          { label: "Žánr", value: "Balada (sbírka balad)" },
          {
            label: "Znaky",
            value: "Dějovost, tragika, nadpřirozeno, zkratka",
          },
        ],
      },
    ]),
    characters: sec([
      {
        type: "character",
        name: "Matka (typ)",
        role: "Opakující se figura napříč baladami",
        traits: ["ochrana / selhání", "vina", "důsledek činu"],
      },
      {
        type: "character",
        name: "Dítě / dcera / syn (typ)",
        role: "Oběť nebo spouštěč konfliktu",
        traits: ["bezbrannost", "nárok na řád", "tragický osud"],
      },
      {
        type: "callout",
        tone: "info",
        title: "Tip",
        body: "U ústní zkoušky jmenuj 2–3 konkrétní balady (např. Vodník, Svatební košile, Polednice) a u každé 1 konflikt.",
      },
    ]),
    plot: sec([
      {
        type: "paragraph",
        text: "Každá balada má vlastní děj. Společný vzorec: porušení zákazu/řádu → zásah vyšší moci / katastrofa → poučení.",
      },
      {
        type: "bullets",
        items: [
          "Kytice (rámec, matka a děti)",
          "Vodník — slib, voda, trest",
          "Svatební košile — mrtvý milý, zákaz, záchrana",
          "Polednice — hrozba, vina matky",
        ],
      },
      {
        type: "link_cta",
        label: "Procvičit dějové beaty",
        href: "/app/learn/rekonstrukce-pribehu/literarni-dej",
      },
    ]),
    language: sec([
      {
        type: "bullets",
        items: [
          "Lidový tón, srozumitelnost",
          "Refrény, opakování, rytmus balady",
          "Dialogičnost a dramatický spád",
          "Konkrétní, „viditelné“ obrazy",
        ],
      },
    ]),
    tropes: sec([
      {
        type: "bullets",
        items: [
          "Symbolika vody, lesa, poledne, noci",
          "Personifikace nadpřirozených sil",
          "Gradace a kontrast",
          "Ironie osudu / zrcadlení viny",
        ],
      },
    ]),
    exam_talking_points: sec([
      {
        type: "callout",
        tone: "success",
        title: "Řekni u zkoušky",
        body: "Kytice = balady o vině a trestu z lidové tradice. Erben staví mravní řád; odliš od Máchova subjektivního romantismu.",
      },
      {
        type: "bullets",
        items: [
          "Definuj baladu",
          "Uveď 2 balady + konflikt",
          "Motivy matka–dítě, vina–trest",
          "Srovnání Mácha × Erben",
        ],
      },
    ]),
    common_mistakes: sec([
      {
        type: "bullets",
        items: [
          "Tvrdit, že Kytice je jediná báseň (ne sbírka)",
          "Zaměnit Erbena s Máchou",
          "Přehlížet mravní řád a vidět jen „strašidla“",
          "Špatné datování / směr",
        ],
      },
    ]),
    test: sec([
      {
        type: "quiz",
        id: "kyt-q1",
        question: "Kytice je především:",
        options: [
          "Realistický román",
          "Sbírka balad",
          "Drama",
          "Cestopis",
        ],
        correctIndex: 1,
        explanation: "Kytice je sbírka balad.",
      },
      {
        type: "quiz",
        id: "kyt-q2",
        question: "Ústřední princip Erbenových balad je:",
        options: [
          "Náhodný humor",
          "Vina a trest / porušení řádu",
          "Vědecký popis společnosti",
          "Politická satira",
        ],
        correctIndex: 1,
        explanation: "Balady stojí na vině, trestu a řádu.",
      },
      {
        type: "quiz",
        id: "kyt-q3",
        question: "Autorem Kytice je:",
        options: [
          "K. H. Mácha",
          "K. J. Erben",
          "Božena Němcová",
          "Alois Jirásek",
        ],
        correctIndex: 1,
        explanation: "Autorem je Karel Jaromír Erben.",
      },
    ]),
    oral_exam: sec([
      {
        type: "oral_prompt",
        id: "kyt-o1",
        prompt: "Vysvětli žánr balady a uveď dvě konkrétní balady z Kytice.",
        tips: [
          "Definice balady",
          "Konflikt + trest",
          "Bez dlouhého převyprávění celého děje",
        ],
      },
      {
        type: "oral_prompt",
        id: "kyt-o2",
        prompt: "Srovnej Erbena a Máchu (řád vs. subjekt).",
        tips: ["Kolektivní morálka", "Subjektivní romantismus", "1 příklad z každého"],
      },
    ]),
  },
};

const babicka: LiteraryWorkDraft = {
  slug: "babicka",
  title: "Babička",
  author: "Božena Němcová",
  yearPublished: 1855,
  workType: "próza / obraz venkova",
  movement: "Romantismus / národní obrození (realistické prvky)",
  summary:
    "Obraz ideálního venkova a babičky jako morálního středu — idyla s realistickými detaily.",
  related: {
    curriculumTopicSlug: "rozbor-babicka",
    sourceFilename: "Babička.docx",
    testHref: "/app/tests/otazky/cjl-otazky",
  },
  sections: {
    quick_grasp: sec(
      [
        {
          type: "callout",
          tone: "brand",
          title: "Jednou větou",
          body: "Próza o babičce na Starém bělidle — ideál lidskosti, řádu a venkovského společenství.",
        },
        {
          type: "bullets",
          items: [
            "Autorka: Božena Němcová · 1855",
            "Žánr: próza (obraz / idyla s realistickými prvky)",
            "Jádro: babička jako morální centrum",
            "Prostor: Staré bělidlo a okolí",
          ],
        },
      ],
      "Rychlý vstup do díla.",
    ),
    author_context: sec([
      {
        type: "key_value",
        pairs: [
          { label: "Autorka", value: "Božena Němcová (1820–1862)" },
          { label: "Vydání", value: "1855" },
          {
            label: "Kontext",
            value: "Národní obrození; zájem o lid a venkov",
          },
          {
            label: "Souvislost",
            value: "Také téma v ceska-literatura (nemcova-babicka)",
          },
        ],
      },
      {
        type: "paragraph",
        text: "Němcová spojuje romantický ideál s pozorováním venkovského života. Babička je kanonické dílo české literatury.",
      },
    ]),
    themes_motifs: sec([
      {
        type: "bullets",
        items: [
          "Lidskost, moudrost, soucit",
          "Rodina a výchova dětí",
          "Venkovský řád a práce",
          "Kontrast dvora / panství a lidového světa",
          "Příroda, zvyky, tradice",
        ],
      },
    ]),
    spacetime: sec([
      {
        type: "key_value",
        pairs: [
          {
            label: "Čas",
            value: "Cyklus roku / dětství vypravěčky; idylický, ne striktně chronikářský",
          },
          {
            label: "Prostor",
            value: "Staré bělidlo, údolí, okolní vesnický svět, panství",
          },
        ],
      },
    ]),
    composition: sec([
      {
        type: "bullets",
        items: [
          "Epizodická stavba (obrazy / kapitoly)",
          "Rámec vzpomínky a přítomnosti babičky",
          "Prolínání všedních scén s klíčovými konflikty",
          "Gradace k odchodu babičky",
        ],
      },
    ]),
    genre: sec([
      {
        type: "key_value",
        pairs: [
          { label: "Druh", value: "Próza" },
          {
            label: "Žánr",
            value: "Obraz venkova / idyla s realistickými prvky",
          },
          {
            label: "Poznámka",
            value: "U maturity neříkej jen „pohádka“ — je to umělecká próza",
          },
        ],
      },
    ]),
    characters: sec([
      {
        type: "character",
        name: "Babička",
        role: "Morální a emocionální centrum",
        traits: ["moudrost", "pracovitost", "soucit", "řád"],
      },
      {
        type: "character",
        name: "Děti (Barunka aj.)",
        role: "Pohled dětství / výchova",
        traits: ["zvídavost", "láska k babičce", "růst"],
      },
      {
        type: "character",
        name: "Postavy dvora / okolí",
        role: "Společenský kontrast",
        traits: ["hierarchie", "konflikty", "lidské typy"],
      },
    ]),
    plot: sec([
      {
        type: "paragraph",
        text: "Děj není dobrodružný thriller — je to sled obrazů života s babičkou, konflikty komunity a postupné uzavření idyly.",
      },
      {
        type: "bullets",
        items: [
          "Příchod babičky na Staré bělidlo",
          "Všední život, zvyky, výchova",
          "Vztahy s okolím a panstvím",
          "Závěrečné vyústění (odchod babičky)",
        ],
      },
    ]),
    language: sec([
      {
        type: "bullets",
        items: [
          "Srozumitelná, obrazná próza",
          "Lidové prvky a dialogy",
          "Popis detailů venkova",
          "Emocionální, ale ne patetický tón Máchova typu",
        ],
      },
    ]),
    tropes: sec([
      {
        type: "bullets",
        items: [
          "Symbolika domu / bělidla jako řádu",
          "Kontrast lidového a panského světa",
          "Ideál babičky jako typ",
          "Cyklus přírody jako rámec života",
        ],
      },
    ]),
    exam_talking_points: sec([
      {
        type: "callout",
        tone: "success",
        title: "Řekni u zkoušky",
        body: "Babička je próza o ideálu lidskosti a venkovského společenství. Zařaď autorku, rok, prostor (Staré bělidlo) a charakterizuj babičku jako morální centrum.",
      },
      {
        type: "bullets",
        items: [
          "Žánr + rok + prostor",
          "3 vlastnosti babičky + příklad chování",
          "Témata: rodina, řád, lidskost",
          "Odliš od balady (Erben) i od Máje",
        ],
      },
    ]),
    common_mistakes: sec([
      {
        type: "bullets",
        items: [
          "Říct, že je to „jen pohádka pro děti“",
          "Zaměnit Němcovou s Erbenem/Máchou",
          "Nepopsat prostor / Staré bělidlo",
          "Přehlížet společenský kontrast (lid × panství)",
        ],
      },
    ]),
    test: sec([
      {
        type: "quiz",
        id: "bab-q1",
        question: "Autorkou Babičky je:",
        options: [
          "K. J. Erben",
          "Božena Němcová",
          "Gabriela Preissová",
          "Karolina Světlá",
        ],
        correctIndex: 1,
        explanation: "Autorkou je Božena Němcová.",
      },
      {
        type: "quiz",
        id: "bab-q2",
        question: "Děj se odehrává především:",
        options: [
          "V Praze u soudu",
          "Na Starém bělidle a okolí",
          "V ruském realismu",
          "Na frontě",
        ],
        correctIndex: 1,
        explanation: "Ústřední prostor je Staré bělidlo.",
      },
      {
        type: "quiz",
        id: "bab-q3",
        question: "Babička jako postava představuje především:",
        options: [
          "Romantického bundlera",
          "Morální centrum a lidskou moudrost",
          "Komickou figuru bez funkce",
          "Antagonistu dětí",
        ],
        correctIndex: 1,
        explanation: "Babička je morální a emocionální centrum díla.",
      },
    ]),
    oral_exam: sec([
      {
        type: "oral_prompt",
        id: "bab-o1",
        prompt: "Charakterizuj babičku a vysvětli, proč je centrem díla.",
        tips: ["3 vlastnosti", "1 situace", "Vztah k dětem / okolí"],
      },
      {
        type: "oral_prompt",
        id: "bab-o2",
        prompt: "Zařaď Babičku žánrově a časoprostorově.",
        tips: ["Próza / obraz venkova", "1855", "Staré bělidlo"],
      },
    ]),
  },
};

export function buildCjlLiteraryWorks(): LiteraryWork[] {
  return [
    buildLiteraryWork(maj, { workId: wid("maj"), nowIso: NOW }),
    buildLiteraryWork(kytice, { workId: wid("kytice"), nowIso: NOW }),
    buildLiteraryWork(babicka, { workId: wid("babicka"), nowIso: NOW }),
  ];
}
