/**
 * Curated public learning pages — genuine student value only.
 * No thin AI mass pages. Literary facts aligned with verified ČJL corpus
 * (Content QA / story packs) where noted; otherwise curriculum overviews.
 */

export type PublicLearningSection = {
  heading: string;
  body: string[];
};

export type PublicLearningPage = {
  slug: string;
  /** H1 */
  title: string;
  /** SEO title (unique) */
  seoTitle: string;
  description: string;
  cluster: string;
  /** true = literary/history facts from verified Content QA / packs */
  verifiedBacked: boolean;
  verificationNoteCs: string;
  intro: string;
  sections: PublicLearningSection[];
  relatedSlugs: string[];
  ctaHref: string;
  ctaLabel: string;
};

export const publicLearningPages: PublicLearningPage[] = [
  {
    slug: "maturita-z-cestiny",
    title: "Maturita z češtiny",
    seoTitle: "Maturita z češtiny — co tě čeká a jak se připravit",
    description:
      "Přehled maturity z českého jazyka a literatury: didaktický test, písemná práce a ústní. Jak se připravit bez chaosu.",
    cluster: "Maturita ČJL",
    verifiedBacked: false,
    verificationNoteCs:
      "Orientační přehled společné části maturity. Oficiální zadání určuje CERMAT — u nás cvičíš, neopisuješ oficiální testy.",
    intro:
      "Maturita z češtiny má několik částí. Nejdřív si ujasni, co přesně skládáš — a pak trénuj tu část, která tě nejvíc drží.",
    sections: [
      {
        heading: "Co maturita z češtiny obsahuje",
        body: [
          "Společná část: didaktický test (čtení s porozuměním, jazyk, literatura v kontextu), písemná práce a ústní zkouška z literatury.",
          "Školní / profilová část se může lišit — vždy ověř u své školy. DámMaturu se soustředí na to, co můžeš trénovat opakovaně: jazyk, porozumění a literaturu.",
        ],
      },
      {
        heading: "Jak se připravit smysluplně",
        body: [
          "Nejdřív diagnostika: víš, kde padáš (pravopis, souvětí, četba, směry).",
          "Pak denní mise místo nekonečného scrollování materiálů.",
          "Až potom simulace a ústní nanečisto — když už máš základy.",
        ],
      },
    ],
    relatedSlugs: [
      "didakticky-test-z-cestiny",
      "maturitni-cetba",
      "literarni-smery",
    ],
    ctaHref: "/app/learn",
    ctaLabel: "Začít se učit zdarma",
  },
  {
    slug: "didakticky-test-z-cestiny",
    title: "Didaktický test z češtiny",
    seoTitle: "Didaktický test z češtiny — cvičení ve stylu maturity",
    description:
      "Jak vypadá didaktický test z češtiny k maturitě: porozumění textu, jazykové jevy, strategie. Cvičné otázky, ne oficiální CERMAT.",
    cluster: "Didaktický test",
    verifiedBacked: false,
    verificationNoteCs:
      "Cvičné otázky v appce jsou ve stylu didaktického testu — nejsou oficiálním zadáním CERMAT.",
    intro:
      "Didaktický test prověří čtení, jazyk a základní literární přehled pod časovým tlakem. Trénink spočívá v opakovaném vybavení a opravě chyb — ne v memorování jedné sady otázek.",
    sections: [
      {
        heading: "Co typicky trénovat",
        body: [
          "Porozumění textu: hlavní myšlenka, vztahy v textu, významy v kontextu.",
          "Jazykové jevy: pravopis, morfologie, syntax (větné členy, souvětí).",
          "Literatura v kontextu: směry, autoři, základní pojmy — bez vymýšlení faktů.",
        ],
      },
      {
        heading: "Strategie na den testu",
        body: [
          "Nejdřív texty s porozuměním, pak jazyk — podle toho, co ti jde rychleji.",
          "U otevřených odpovědí piš konkrétně; u výběru vylučuj nesmysly.",
          "Po cvičení si vždy projdi chyby — ty jdou do opakování.",
        ],
      },
    ],
    relatedSlugs: [
      "porozumeni-textu",
      "pravopis",
      "vetne-cleny",
      "souveti",
    ],
    ctaHref: "/app/cermat",
    ctaLabel: "Cvičný CERMAT styl",
  },
  {
    slug: "pravopis",
    title: "Pravopis k maturitě",
    seoTitle: "Pravopis k maturitě z češtiny — co procvičovat",
    description:
      "Pravopis v didaktickém testu: i/y, předpony, shoda, interpunkce. Jak trénovat chybová místa, ne celé učebnice nazpaměť.",
    cluster: "Jazyk",
    verifiedBacked: false,
    verificationNoteCs:
      "Obecný přehled jevů k maturitě. Konkrétní cvičení vycházejí z tvých materiálů a katalogu v appce.",
    intro:
      "V testu nepadáš na „celý pravopis“, ale na pár opakujících se jevů. Nejrychlejší cesta je sbírat vlastní chyby a vracet se k nim.",
    sections: [
      {
        heading: "Časté maturitní oblasti",
        body: [
          "i/y po obojetných souhláskách, předpony s-/z-, mě/mně.",
          "Shoda přísudku s podmětem, interpunkce ve větě a souvětí.",
          "Velká písmena u jmen a názvů — v kontextu věty, ne izolovaně.",
        ],
      },
      {
        heading: "Jak to učit v DámMaturu",
        body: [
          "Nahraj poznámky nebo použij katalog — otázky míří na vybavení, ne na tipování.",
          "Špatné odpovědi jdou do Moje chyby a do dnešní mise.",
        ],
      },
    ],
    relatedSlugs: ["vetne-cleny", "souveti", "didakticky-test-z-cestiny"],
    ctaHref: "/app/materials",
    ctaLabel: "Procvičit z materiálů",
  },
  {
    slug: "vetne-cleny",
    title: "Větné členy",
    seoTitle: "Větné členy — podmět, přísudek a rozvíjející členy k maturitě",
    description:
      "Větné členy srozumitelně: podmět, přísudek, předmět, přívlastek, příslovečné určení. Proč to maturita zkouší a jak cvičit.",
    cluster: "Jazyk",
    verifiedBacked: false,
    verificationNoteCs:
      "Výklad pro přípravu k maturitě. Procvičování v appce vždy odkazuje na konkrétní studijní úryvek.",
    intro:
      "Větné členy nejsou „škatulky pro škatulky“ — pomáhají číst souvětí a odhalit chyby ve stavbě věty v testu i v písemce.",
    sections: [
      {
        heading: "Základní opora",
        body: [
          "Základ větného celku: podmět a přísudek. Bez nich věta „nedrží“.",
          "Rozvíjející členy (předmět, přívlastek, příslovečné určení…) upřesňují význam — maturita často ptá na funkci ve větě.",
        ],
      },
      {
        heading: "Tip k procvičení",
        body: [
          "U každé věty nejdřív najdi přísudek, pak se ptej „kdo/co?“ na podmět.",
          "Až potom přiřazuj rozvíjející členy — méně tipování, víc jistoty.",
        ],
      },
    ],
    relatedSlugs: ["souveti", "pravopis", "porozumeni-textu"],
    ctaHref: "/app/learn",
    ctaLabel: "Procvičit v ČJL",
  },
  {
    slug: "souveti",
    title: "Souvětí",
    seoTitle: "Souvětí — souřadné a podřadné vztahy k maturitě",
    description:
      "Souvětí k maturitě: souřadné vs podřadné, typy vedlejších vět, interpunkce. Jak číst složité věty v didaktickém testu.",
    cluster: "Jazyk",
    verifiedBacked: false,
    verificationNoteCs:
      "Kurikulární přehled pro maturitní přípravu. Detailní cvičení jsou vázaná na zdroje v appce.",
    intro:
      "Souvětí je místo, kde se v testu ztrácí čas. Když poznáš vztah mezi větami, snáz najdeš správnou možnost i interpunkci.",
    sections: [
      {
        heading: "Co si ujasnit",
        body: [
          "Souřadné souvětí: věty „vedle sebe“ (slučovací, odporovací, stupňovací…).",
          "Podřadné: hlavní + vedlejší (podmětná, přísudková, předmětná, příslovečná, přívlastková…).",
          "Interpunkce často kopíruje hranici vět — ne tipuj čárku nazdařbůh.",
        ],
      },
    ],
    relatedSlugs: ["vetne-cleny", "porozumeni-textu", "pravopis"],
    ctaHref: "/app/tests",
    ctaLabel: "Ověřit v testu",
  },
  {
    slug: "porozumeni-textu",
    title: "Porozumění textu",
    seoTitle: "Porozumění textu k maturitě — jak číst didaktický test",
    description:
      "Strategie porozumění textu u maturity: hlavní myšlenka, detail, inference. Jak trénovat bez memorování konkrétních článků.",
    cluster: "Didaktický test",
    verifiedBacked: false,
    verificationNoteCs:
      "Metodický přehled. Texty v appce jsou cvičné; oficiální CERMAT zadání nekopírujeme.",
    intro:
      "Porozumění textu je často největší část bodů. Nejde o „přečti a zapamatuj“, ale o přesné čtení zadání a důkaz v textu.",
    sections: [
      {
        heading: "Praktický postup",
        body: [
          "Nejdřív otázka, pak text — víš, co hledáš.",
          "Každou odpověď si ověř citací / místem v textu. Když to v textu není, je to past.",
          "Trénuj různé žánry: publicistika, odborný odstavec, beletrie.",
        ],
      },
    ],
    relatedSlugs: [
      "didakticky-test-z-cestiny",
      "maturitni-cetba",
      "souveti",
    ],
    ctaHref: "/app/cermat",
    ctaLabel: "Cvičit porozumění",
  },
  {
    slug: "literarni-smery",
    title: "Literární směry",
    seoTitle: "Literární směry k maturitě — od obrození k moderně",
    description:
      "Literární směry pro maturitu: národní obrození, romantismus, realismus a návaznosti. Přehled + odkazy na hlubší témata.",
    cluster: "Literatura",
    verifiedBacked: false,
    verificationNoteCs:
      "Orientační mapa směrů. Konkrétní fakta u jednotlivých směrů a děl ověřujeme ze studijních zdrojů (viz Content Trust).",
    intro:
      "Směry ti pomůžou zařadit dílo do času a pochopit, proč autor píše tak, jak píše. Maturita často ptá na znaky a typické autory — ne na encyclopedii nazpaměť.",
    sections: [
      {
        heading: "Pořadí, které dává smysl",
        body: [
          "Národní obrození → romantismus → realismus (a dál podle školního výběru).",
          "U každého směru si drž 3–5 znaků + 1–2 klíčová díla, která opravdu znáš z četby.",
        ],
      },
    ],
    relatedSlugs: ["narodni-obrozeni", "romantismus", "realismus", "maturitni-cetba"],
    ctaHref: "/app/learn",
    ctaLabel: "Učit se literaturu",
  },
  {
    slug: "romantismus",
    title: "Romantismus",
    seoTitle: "Romantismus v české literatuře — znaky, autoři, maturita",
    description:
      "Romantismus k maturitě: cit, individualita, konflikt jedince a společnosti. Mácha, Erben a jak to trénovat.",
    cluster: "Literatura",
    verifiedBacked: true,
    verificationNoteCs:
      "Znaky a zařazení odpovídají ověřenému ČJL korpusu v DámMaturu (flashcards / teach-back / story návaznosti). Detailní citace ze zdroje uvidíš při studiu v appce.",
    intro:
      "Romantismus staví do popředí cit, subjektivitu a výjimečného hrdinu. V české literatuře je klíčový Karel Hynek Mácha a baladický svět K. J. Erbena.",
    sections: [
      {
        heading: "Co si zapamatovat k maturitě",
        body: [
          "Důraz na cit a subjektivitu; konflikt jedince a společnosti; individualita hrdiny.",
          "Často kontrast snu a reality, příroda jako zrcadlo vnitřního světa.",
          "Typická díla k četbě: Máj (Mácha), Kytice (Erben) — uč se z textu, ne z „dojmu z Wikipedie“.",
        ],
      },
      {
        heading: "Jak to ověřit",
        body: [
          "V appce procvič vybavení znaků a zařazení děl. Po odpovědi uvidíš zdrojový úryvek — ne vymyšlený výklad.",
        ],
      },
    ],
    relatedSlugs: ["maj", "kytice", "realismus", "literarni-smery"],
    ctaHref: "/app/learn",
    ctaLabel: "Procvičit romantismus",
  },
  {
    slug: "realismus",
    title: "Realismus",
    seoTitle: "Realismus v literatuře — znaky a příprava k maturitě",
    description:
      "Realismus k maturitě: typizace, společenská otázka, kontrast k romantismu. Co cvičit a jak zařadit díla.",
    cluster: "Literatura",
    verifiedBacked: true,
    verificationNoteCs:
      "Opírá se o ověřené studijní packy ČJL v DámMaturu (např. quick-grasp realismus, teach-back srovnání s romantismem).",
    intro:
      "Realismus reaguje na romantismus i na společenské změny 19. století. Místo výjimečného hrdiny často typická postava a sociální kontext.",
    sections: [
      {
        heading: "Znaky, které maturita hledá",
        body: [
          "Snaha o věrné zobrazení společnosti; typizace postav; důraz na prostředí a sociální otázky.",
          "Vzniká mimo jiné jako reakce na romantismus a na změny průmyslové společnosti.",
        ],
      },
      {
        heading: "Srovnání s romantismem",
        body: [
          "Romantismus: cit, subjektivita, konflikt jedince. Realismus: typizace, společnost, „jak to chodí“.",
          "U ústní se vyplatí umět říct rozdíl na 2–3 větách a doložit dílem z četby.",
        ],
      },
    ],
    relatedSlugs: ["romantismus", "literarni-smery", "babicka", "maturitni-cetba"],
    ctaHref: "/app/learn",
    ctaLabel: "Procvičit realismus",
  },
  {
    slug: "narodni-obrozeni",
    title: "Národní obrození",
    seoTitle: "Národní obrození — etapy, jazyk, literatura k maturitě",
    description:
      "Národní obrození srozumitelně: periodizace do etap, jazyk, kultura. Fakta z ověřeného studijního materiálu DámMaturu.",
    cluster: "Literatura",
    verifiedBacked: true,
    verificationNoteCs:
      "Periodizace a etapy vycházejí z ověřených SOURCE výroků Content QA (pack Národní obrození). V appce uvidíš přesné citace.",
    intro:
      "Národní obrození označuje období přibližně od 70. let 18. století do 50. let 19. století. Literární historie ho tradičně dělí do čtyř etap.",
    sections: [
      {
        heading: "Etapy (ověřený přehled)",
        body: [
          "1. etapa (obranná): od 70. let 18. století do počátku 19. století — základy jazyka, literatury, divadla a novinářství; vlivy klasicismu a osvícenství.",
          "2. etapa: národní hnutí přechází do útoku (počátek 19. století až cca 1830) — jazykový program; snaha dokázat, že čeština obstojí vedle vyspělých literatur.",
          "Další etapy vedou k romantismu a k roku 1848 — v appce je projdeš jako příběh se zdrojovými citacemi, ne jako seznam jmen.",
        ],
      },
      {
        heading: "Proč to maturita chce",
        body: [
          "Zařazení autora a díla do doby. Pochopení, proč se řešil jazyk a národní kultura.",
          "U ústní stačí jasná linie: situace jazyka → obnova → kultura → politický kontext.",
        ],
      },
    ],
    relatedSlugs: ["romantismus", "literarni-smery", "maturitni-cetba"],
    ctaHref: "/app/learn/pribeh/narodni-obrozeni",
    ctaLabel: "Příběh Národního obrození",
  },
  {
    slug: "maturitni-cetba",
    title: "Maturitní četba",
    seoTitle: "Maturitní četba — jak se připravit na ústní z literatury",
    description:
      "Maturitní četba bez paniky: co umět u každého díla, jak trénovat ústní, odkazy na Máj, Babičku a Kytici.",
    cluster: "Literatura",
    verifiedBacked: false,
    verificationNoteCs:
      "Metodika ústní přípravy. Fakta k jednotlivým dílům ber z ověřených studijních materiálů a vlastní četby.",
    intro:
      "Ústní není o odříkání obsahu. Potřebuješ strukturu: kontext → téma → postup → jazyk/styl → vlastní názor podložený textem.",
    sections: [
      {
        heading: "Checklist k jednomu dílu",
        body: [
          "Zařazení (směr, doba), autor, žánr.",
          "Témata a motivy, kompozice, vypravěč / lyrický subjekt.",
          "2–3 konkrétní pasáže, které umíš vysvětlit.",
          "Proč dílo patří na seznam — jedna věta vlastními slovy.",
        ],
      },
    ],
    relatedSlugs: ["maj", "babicka", "kytice", "romantismus"],
    ctaHref: "/app/simulation",
    ctaLabel: "Ústní nanečisto",
  },
  {
    slug: "maj",
    title: "Máj (Karel Hynek Mácha)",
    seoTitle: "Máj — maturitní četba a příprava (Mácha)",
    description:
      "Máj k maturitě: romantismus, motivy, kompozice. Jak se připravit na ústní a procvičení v DámMaturu.",
    cluster: "Maturitní četba",
    verifiedBacked: true,
    verificationNoteCs:
      "Zařazení k romantismu a exam-prep tok v appce (Máj experience) pracuje s ověřeným studijním obsahem ČJL.",
    intro:
      "Máj je klíčové dílo českého romantismu. K maturitě potřebuješ víc než děj: motivy, kontrast lásky a zločinu, přírodu a subjektivitu.",
    sections: [
      {
        heading: "Na co se ptát sám sebe",
        body: [
          "Jak se v Májí projevuje romantický hrdina a konflikt se společností?",
          "Které motivy (noc, příroda, vina, čas) umíš doložit konkrétní pasáží?",
          "Čím se Máj liší od „pouhého“ milostného příběhu?",
        ],
      },
    ],
    relatedSlugs: ["romantismus", "kytice", "maturitni-cetba"],
    ctaHref: "/app/learn/maj",
    ctaLabel: "Máj — příprava v appce",
  },
  {
    slug: "babicka",
    title: "Babička (Božena Němcová)",
    seoTitle: "Babička — maturitní četba a příprava (Němcová)",
    description:
      "Babička k maturitě: ideál venkova, postavy, vyprávění. Jak strukturovat ústní odpověď.",
    cluster: "Maturitní četba",
    verifiedBacked: true,
    verificationNoteCs:
      "Studijní experience Babička v DámMaturu je vázaná na ověřený ČJL obsah (Content QA / pack).",
    intro:
      "Babička není jen „hezký obrázek venkova“. K maturitě potřebuješ pochopit ideál, kontrast postav a způsob vyprávění.",
    sections: [
      {
        heading: "Ústní osa",
        body: [
          "Kontext vzniku a zařazení.",
          "Obraz venkova a ideál babičky vs. konflikty v příběhu.",
          "Jazyk a vypravěč — proč text působí „epicky klidně“.",
        ],
      },
    ],
    relatedSlugs: ["realismus", "maturitni-cetba", "literarni-smery"],
    ctaHref: "/app/learn/babicka",
    ctaLabel: "Babička — experience",
  },
  {
    slug: "kytice",
    title: "Kytice (Karel Jaromír Erben)",
    seoTitle: "Kytice — maturitní četba a balady (Erben)",
    description:
      "Kytice k maturitě: balady, vina a trest, folklór. Jak se připravit na otázky k cyklu.",
    cluster: "Maturitní četba",
    verifiedBacked: true,
    verificationNoteCs:
      "Kytice experience v appce vychází z ověřeného studijního balíčku ČJL.",
    intro:
      "Kytice spojuje folklór a romantickou morálku: vina, trest, nadpřirozeno. U maturity se často ptají na společné motivy napříč baladami.",
    sections: [
      {
        heading: "Co mít připravené",
        body: [
          "2–3 balady do hloubky (děj, motiv, pointa) + společné rysy cyklu.",
          "Vztah k romantismu a k lidové tradici — stručně a jasně.",
        ],
      },
    ],
    relatedSlugs: ["romantismus", "maj", "maturitni-cetba"],
    ctaHref: "/app/learn/kytice",
    ctaLabel: "Kytice — příprava",
  },
];

export function getPublicLearningPage(
  slug: string,
): PublicLearningPage | undefined {
  return publicLearningPages.find((p) => p.slug === slug);
}

export function getRelatedPublicPages(
  page: PublicLearningPage,
): PublicLearningPage[] {
  return page.relatedSlugs
    .map((s) => getPublicLearningPage(s))
    .filter((p): p is PublicLearningPage => Boolean(p));
}

export const publicLearningHub = {
  title: "Příprava k maturitě z češtiny",
  seoTitle: "Příprava k maturitě z češtiny — témata a přehledy",
  description:
    "Veřejné přehledy k maturitě z češtiny: didaktický test, jazyk, literární směry a četba. Jen stránky s reálnou hodnotou — bez tenkých AI textů.",
};
