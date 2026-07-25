/**
 * Dynamický studijní obsah pro dashboard /uceni/[materialId].
 * Generuje kartičky, kvíz a audio shrnutí podle názvu a předmětu materiálu.
 */

export type MaterialFlashcard = {
  id: string;
  front: string;
  back: string;
};

export type MaterialQuizOption = {
  id: "A" | "B" | "C" | "D";
  text: string;
};

export type MaterialQuizQuestion = {
  id: string;
  prompt: string;
  options: MaterialQuizOption[];
  correctOptionId: "A" | "B" | "C" | "D";
  explanation: string;
};

export type MaterialStudyPack = {
  flashcards: MaterialFlashcard[];
  quiz: MaterialQuizQuestion[];
  audioSummary: string;
};

type ContentSeed = {
  match: (title: string, subject: string) => boolean;
  pack: MaterialStudyPack;
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(normalize(n)));
}

const SEEDS: ContentSeed[] = [
  {
    match: (title) => includesAny(normalize(title), ["babicka", "babička"]),
    pack: {
      flashcards: [
        {
          id: "bab-1",
          front: "Kdo je autorkou povídky Babička?",
          back: "Božena Němcová (1820–1862), jedna z nejvýznamnějších osobností českého národního obrození a romantismu.",
        },
        {
          id: "bab-2",
          front: "Kde se odehrává děj Babičky?",
          back: "V Babiččině údolí u Starého Bělidla — idylickém venkovském prostředí, které kontrastuje s tragikou některých postav.",
        },
        {
          id: "bab-3",
          front: "Kdo je Barunka a jaký má vztah k babičce?",
          back: "Barunka je vnučka babičky a zároveň vypravěččina dětská podoba. Skrze ni čtenář vnímá lásku, moudrost a klid babičky.",
        },
        {
          id: "bab-4",
          front: "Kdo je Viktorka a co symbolizuje její příběh?",
          back: "Viktorka je tragická postava, která zešílí po nešťastné lásce k vojákovi. Symbolizuje temnou stránku života a kontrast k idyle Starého Bělidla.",
        },
        {
          id: "bab-5",
          front: "Jaké hlavní hodnoty Babička zdůrazňuje?",
          back: "Lásku k rodině, úctu k tradici, pracovitost, lidskou soudržnost a soucit — babička je mravním středem celého příběhu.",
        },
      ],
      quiz: [
        {
          id: "bab-q1",
          prompt: "Kdo napsal Babičku?",
          options: [
            { id: "A", text: "Karel Hynek Mácha" },
            { id: "B", text: "Božena Němcová" },
            { id: "C", text: "Alois Jirásek" },
            { id: "D", text: "Jan Neruda" },
          ],
          correctOptionId: "B",
          explanation:
            "Autorkou je Božena Němcová. Dílo vyšlo poprvé v letech 1855–1856 a patří k základům české literatury.",
        },
        {
          id: "bab-q2",
          prompt: "Jak se jmenuje místo, kde babička žije s vnoučaty?",
          options: [
            { id: "A", text: "Staré Bělidlo" },
            { id: "B", text: "Karlštejn" },
            { id: "C", text: "Vyšehrad" },
            { id: "D", text: "Kokořín" },
          ],
          correctOptionId: "A",
          explanation:
            "Rodina žije na Starém Bělidle v Babiččině údolí — klasické idylické prostředí díla.",
        },
        {
          id: "bab-q3",
          prompt: "Která postava prožije tragický osud spojený s šílenstvím?",
          options: [
            { id: "A", text: "Barunka" },
            { id: "B", text: "Adélka" },
            { id: "C", text: "Viktorka" },
            { id: "D", text: "Kristla" },
          ],
          correctOptionId: "C",
          explanation:
            "Viktorka zešílí poté, co ji opustí voják. Její příběh tvoří temný protiklad k idyle rodiny.",
        },
        {
          id: "bab-q4",
          prompt: "Co je ústředním motivem vztahu dětí k babičce?",
          options: [
            { id: "A", text: "Strach z trestu" },
            { id: "B", text: "Láska, důvěra a výchova příkladem" },
            { id: "C", text: "Soutěživost o majetek" },
            { id: "D", text: "Politický spor" },
          ],
          correctOptionId: "B",
          explanation:
            "Babička vychovává laskavostí a moudrostí. Děti k ní mají hlubokou úctu a lásku.",
        },
      ],
      audioSummary:
        "Babička Boženy Němcové je obrazem idylického venkovského života v Babiččině údolí. Ústřední postavou je moudrá babička, která vychovává vnoučata, zejména Barunku. Do příběhu vstupuje i tragická Viktorka, jejíž osud připomíná, že idyla není bez stínů. Dílo oslavuje rodinu, tradici a lidskou soudržnost a patří k povinné maturitní četbě.",
    },
  },
  {
    match: (title) => includesAny(normalize(title), ["romantismus"]),
    pack: {
      flashcards: [
        {
          id: "rom-1",
          front: "Co je romantismus v literatuře?",
          back: "Umělecký směr přelomu 18. a 19. století. Důraz klade na cit, individualitu, svobodu, přírodu a často na rozpor ideálu se skutečností.",
        },
        {
          id: "rom-2",
          front: "Kdo je hlavním představitelem českého romantismu?",
          back: "Karel Hynek Mácha — autor poemy Máj. Typický romantický hrdina je osamělý, vášnivý a ve sporu se světem.",
        },
        {
          id: "rom-3",
          front: "Jaké motivy najdeme v Máchově Máji?",
          back: "Láska, zrada, vina, smrt, příroda (jezero, noc, máj) a kontrast krásy přírody s lidskou tragédií.",
        },
        {
          id: "rom-4",
          front: "Jaký je typický romantický hrdina?",
          back: "Výjimečný jednotlivec, často vyvrženec společnosti, řízený vášní a citem, ne rozumem. Bývá v konfliktu s okolím.",
        },
        {
          id: "rom-5",
          front: "Jak se romantismus liší od klasicismu?",
          back: "Klasicismus staví na řádu, rozumu a pravidlech. Romantismus naopak vyzdvihuje cit, subjektivitu a svobodu fantazie.",
        },
      ],
      quiz: [
        {
          id: "rom-q1",
          prompt: "Které dílo je vrcholem českého romantismu?",
          options: [
            { id: "A", text: "Babička" },
            { id: "B", text: "Máj" },
            { id: "C", text: "Psohlavci" },
            { id: "D", text: "R.U.R." },
          ],
          correctOptionId: "B",
          explanation:
            "Máj Karla Hynka Máchy je klíčovým dílem českého romantismu.",
        },
        {
          id: "rom-q2",
          prompt: "Co romantismus typicky vyzdvihuje?",
          options: [
            { id: "A", text: "Cit a individualitu" },
            { id: "B", text: "Přísné klasické normy" },
            { id: "C", text: "Jen hospodářskou statistiku" },
            { id: "D", text: "Technický pokrok bez emocí" },
          ],
          correctOptionId: "A",
          explanation:
            "Romantismus staví do popředí city, svobodu a výjimečnost jednotlivce.",
        },
        {
          id: "rom-q3",
          prompt: "Kdo napsal poemu Máj?",
          options: [
            { id: "A", text: "Josef Kajetán Tyl" },
            { id: "B", text: "Karel Hynek Mácha" },
            { id: "C", text: "Karel Jaromír Erben" },
            { id: "D", text: "Svatopluk Čech" },
          ],
          correctOptionId: "B",
          explanation: "Autorem Máje je Karel Hynek Mácha (1836).",
        },
        {
          id: "rom-q4",
          prompt: "Jaký motiv je v Máji klíčový?",
          options: [
            { id: "A", text: "Komická satira měšťanů" },
            { id: "B", text: "Kontrast krásné přírody a lidské tragédie" },
            { id: "C", text: "Vědecký experiment" },
            { id: "D", text: "Cestopis po Africe" },
          ],
          correctOptionId: "B",
          explanation:
            "Máj spojuje nádheru jarní přírody s příběhem lásky, zrady a popravy.",
        },
      ],
      audioSummary:
        "Romantismus je umělecký směr, který staví do popředí cit, individualitu a svobodu. V české literatuře je jeho vrcholem Karel Hynek Mácha a poema Máj. Typický romantický hrdina je osamělý a vášnivý, často ve sporu se společností. Důležité jsou motivy lásky, viny, smrti a kontrastu mezi krásou přírody a lidskou tragédií.",
    },
  },
  {
    match: (title) => includesAny(normalize(title), ["realismus"]),
    pack: {
      flashcards: [
        {
          id: "rea-1",
          front: "Co charakterizuje literární realismus?",
          back: "Snaha zobrazit skutečnost věrně, typické postavy a prostředí, kritický pohled na společnost a důraz na sociální otázky.",
        },
        {
          id: "rea-2",
          front: "Uveď představitele českého realismu.",
          back: "Jan Neruda, Božena Němcová (přechod k realismu), Alois Jirásek, Karel Václav Rais, Teréza Nováková.",
        },
        {
          id: "rea-3",
          front: "Jaký je rozdíl mezi romantismem a realismem?",
          back: "Romantismus idealizuje city a výjimečné hrdiny. Realismus popisuje běžný život, prostředí a společenské vztahy bez idealizace.",
        },
        {
          id: "rea-4",
          front: "Co jsou Povídky malostranské?",
          back: "Soubor povídek Jana Nerudy o životě na Malé Straně. Kombinuje humor, ironii a realistický pohled na měšťanské postavy.",
        },
        {
          id: "rea-5",
          front: "Proč je realismus důležitý k maturitě?",
          back: "Umožňuje porovnat směry, zařadit díla do kontextu a ukázat, jak literatura reaguje na společenské změny 19. století.",
        },
      ],
      quiz: [
        {
          id: "rea-q1",
          prompt: "Co je typické pro realismus?",
          options: [
            { id: "A", text: "Věrné zobrazení skutečnosti" },
            { id: "B", text: "Pouze snové vize bez děje" },
            { id: "C", text: "Odmítání postav a prostředí" },
            { id: "D", text: "Jen rýmovaná lyrika bez obsahu" },
          ],
          correctOptionId: "A",
          explanation:
            "Realismus usiluje o věrné, kritické a společensky zakotvené zobrazení života.",
        },
        {
          id: "rea-q2",
          prompt: "Kdo napsal Povídky malostranské?",
          options: [
            { id: "A", text: "Jan Neruda" },
            { id: "B", text: "Karel Hynek Mácha" },
            { id: "C", text: "Karel Čapek" },
            { id: "D", text: "Jaroslav Vrchlický" },
          ],
          correctOptionId: "A",
          explanation: "Autorem je Jan Neruda, klasik české realistické prózy.",
        },
        {
          id: "rea-q3",
          prompt: "Realismus oproti romantismu spíše:",
          options: [
            { id: "A", text: "Idealizuje výjimečné hrdiny" },
            { id: "B", text: "Zobrazuje běžný život a sociální vztahy" },
            { id: "C", text: "Odmítá jakékoli postavy" },
            { id: "D", text: "Zakazuje popis prostředí" },
          ],
          correctOptionId: "B",
          explanation:
            "Realismus se soustředí na typické postavy, prostředí a společenskou kritiku.",
        },
        {
          id: "rea-q4",
          prompt: "Který motiv je v realismu častý?",
          options: [
            { id: "A", text: "Sociální otázky a kritika měšťanstva" },
            { id: "B", text: "Jen kosmické sci-fi bez lidí" },
            { id: "C", text: "Výhradně středověká mystika" },
            { id: "D", text: "Odmítání dialektu a prostředí" },
          ],
          correctOptionId: "A",
          explanation:
            "Realistická literatura často kriticky zachycuje sociální rozdíly a měšťanský život.",
        },
      ],
      audioSummary:
        "Realismus usiluje o věrné zobrazení skutečnosti a společenských vztahů. Oproti romantismu neidealizuje výjimečné hrdiny, ale zobrazuje typické postavy a prostředí. V české literatuře patří k významným realistům Jan Neruda s Povídkami malostranskými. K maturitě je důležité umět realismus porovnat s romantismem a uvést konkrétní díla.",
    },
  },
  {
    match: (title) =>
      includesAny(normalize(title), ["narodni obrozeni", "národní obrození"]),
    pack: {
      flashcards: [
        {
          id: "no-1",
          front: "Co bylo národní obrození?",
          back: "Proces obnovy českého jazyka, kultury a národního sebevědomí od konce 18. do poloviny 19. století.",
        },
        {
          id: "no-2",
          front: "Kdo byl Josef Dobrovský?",
          back: "Zakladatelská osobnost obrození, jazykovědec. Položil vědecké základy studia češtiny a slavistiky.",
        },
        {
          id: "no-3",
          front: "Jaká byla role Josefa Jungmanna?",
          back: "Jungmann vytvořil slovník a podporoval češtinu jako jazyk vzdělanců. Přispěl k bohatství spisovné češtiny.",
        },
        {
          id: "no-4",
          front: "Proč bylo obrození důležité pro literaturu?",
          back: "Vytvořilo podmínky pro moderní českou literaturu — jazyk, publikum, instituce i národní sebevědomí autorů.",
        },
        {
          id: "no-5",
          front: "Uveď další obrozenecké osobnosti.",
          back: "Josef Kajetán Tyl, František Palacký, Václav Kliment Klicpera, později i generace Máchy a Němcové.",
        },
      ],
      quiz: [
        {
          id: "no-q1",
          prompt: "Národní obrození především obnovovalo:",
          options: [
            { id: "A", text: "Český jazyk a kulturu" },
            { id: "B", text: "Jen průmysl bez kultury" },
            { id: "C", text: "Latinskou literární nadvládu" },
            { id: "D", text: "Zákaz divadla" },
          ],
          correctOptionId: "A",
          explanation:
            "Cílem bylo oživit češtinu, vzdělanost a národní identitu.",
        },
        {
          id: "no-q2",
          prompt: "Josef Dobrovský je spojován hlavně s:",
          options: [
            { id: "A", text: "Jazykovědou a slavistikou" },
            { id: "B", text: "Kubismem ve výtvarném umění" },
            { id: "C", text: "Jazzovou hudbou" },
            { id: "D", text: "Kybernetikou" },
          ],
          correctOptionId: "A",
          explanation:
            "Dobrovský položil vědecké základy studia češtiny a slovanských jazyků.",
        },
        {
          id: "no-q3",
          prompt: "Josef Jungmann je známý především díky:",
          options: [
            { id: "A", text: "Českému slovníku a obhajobě češtiny" },
            { id: "B", text: "Objevu penicilinu" },
            { id: "C", text: "Teorii relativity" },
            { id: "D", text: "Stavbě Karlova mostu" },
          ],
          correctOptionId: "A",
          explanation:
            "Jungmannův slovník posílil češtinu jako jazyk vědy a literatury.",
        },
        {
          id: "no-q4",
          prompt: "Obrození probíhalo zhruba:",
          options: [
            { id: "A", text: "Od konce 18. do poloviny 19. století" },
            { id: "B", text: "Jen v roce 1989" },
            { id: "C", text: "Ve 14. století" },
            { id: "D", text: "Výhradně po roce 2000" },
          ],
          correctOptionId: "A",
          explanation:
            "Chronologicky spadá do období osvícenství a první poloviny 19. století.",
        },
      ],
      audioSummary:
        "Národní obrození obnovovalo český jazyk, kulturu a národní sebevědomí. Klíčovými osobnostmi byli Josef Dobrovský a Josef Jungmann. Díky obrození vznikly podmínky pro moderní českou literaturu a vzdělání v češtině. K maturitě si pamatuj cíle, období i hlavní představitele.",
    },
  },
  {
    match: (title) =>
      includesAny(normalize(title), [
        "moderni poezie",
        "moderní poezie",
        "20. stolet",
      ]),
    pack: {
      flashcards: [
        {
          id: "mp-1",
          front: "Čím se vyznačuje moderní poezie 20. století?",
          back: "Experimentem s formou, volným veršem, subjektivitou, městskými motivy a novými směry — od symbolismu po poetismus a surrealismus.",
        },
        {
          id: "mp-2",
          front: "Kdo patří k české moderní poezii?",
          back: "Například Jaroslav Seifert, Vítězslav Nezval, Jiří Wolker, František Halas, Vladimír Holan.",
        },
        {
          id: "mp-3",
          front: "Co je poetismus?",
          back: "Český avantgardní směr 20. let. Oslavuje radost, obraznost, senzaci všedního dne a „umění žít“.",
        },
        {
          id: "mp-4",
          front: "Proč je Seifert důležitý k maturitě?",
          back: "Nobelova cena za literaturu (1984), lyrika lásky, Prahy a lidského osudu. Umí spojit srozumitelnost s poetickou silou.",
        },
        {
          id: "mp-5",
          front: "Jak mluvit o básni u maturity?",
          back: "Zaměř se na téma, motivy, lyrický subjekt, obraznost, zvukomalbu a společenský nebo osobní kontext.",
        },
      ],
      quiz: [
        {
          id: "mp-q1",
          prompt: "Poetismus je spojený především s:",
          options: [
            { id: "A", text: "Českou avantgardou 20. let" },
            { id: "B", text: "Středověkou hymnologií" },
            { id: "C", text: "Barokním kázáním" },
            { id: "D", text: "Antikou" },
          ],
          correctOptionId: "A",
          explanation:
            "Poetismus je specificky český avantgardní směr meziválečného období.",
        },
        {
          id: "mp-q2",
          prompt: "Který český básník získal Nobelovu cenu?",
          options: [
            { id: "A", text: "Jaroslav Seifert" },
            { id: "B", text: "Karel Hynek Mácha" },
            { id: "C", text: "Josef Jungmann" },
            { id: "D", text: "Alois Jirásek" },
          ],
          correctOptionId: "A",
          explanation: "Jaroslav Seifert získal Nobelovu cenu v roce 1984.",
        },
        {
          id: "mp-q3",
          prompt: "Moderní poezie často využívá:",
          options: [
            { id: "A", text: "Volný verš a experiment s obrazností" },
            { id: "B", text: "Jen úřední formuláře" },
            { id: "C", text: "Zákaz metafor" },
            { id: "D", text: "Výhradně latinské kroniky" },
          ],
          correctOptionId: "A",
          explanation:
            "20. století přineslo volný verš, nové směry a silnou subjektivitu.",
        },
        {
          id: "mp-q4",
          prompt: "Vítězslav Nezval je spojován s:",
          options: [
            { id: "A", text: "Poetismem a surrealismem" },
            { id: "B", text: "Husitskou kronikou" },
            { id: "C", text: "Empirickou přírodovědou" },
            { id: "D", text: "Gotickou architekturou" },
          ],
          correctOptionId: "A",
          explanation:
            "Nezval patří k klíčovým osobnostem poetismu a později surrealismu.",
        },
      ],
      audioSummary:
        "Moderní poezie 20. století experimentuje s formou, obrazností a volným veršem. V Česku jsou důležité směry jako poetismus a surrealismus a autoři Seifert, Nezval, Wolker nebo Halas. K maturitě se vyplatí umět pojmenovat motivy, lyrický subjekt a kontext doby.",
    },
  },
  {
    match: (title) => includesAny(normalize(title), ["sloh", "slohove"]),
    pack: {
      flashcards: [
        {
          id: "sl-1",
          front: "Co je slohový útvar?",
          back: "Konkrétní typ textu s daným cílem a stavbou — například vypravování, popis, charakteristika, úvaha nebo výklad.",
        },
        {
          id: "sl-2",
          front: "Čím se liší popis a charakteristika?",
          back: "Popis zachycuje vzhled nebo průběh. Charakteristika zdůrazňuje povahové rysy, chování a vnitřní vlastnosti postavy.",
        },
        {
          id: "sl-3",
          front: "Co musí obsahovat úvaha?",
          back: "Téma, vlastní názor, argumenty, příklady a závěr. Nejde jen o citace — důležité je tvé myšlení.",
        },
        {
          id: "sl-4",
          front: "Jak poznáš výklad?",
          back: "Vysvětluje jev srozumitelně a odborněji: definice, příčiny, důsledky, příklady. Častý ve škole i v naučných textech.",
        },
        {
          id: "sl-5",
          front: "Tip na maturitu ze slohu",
          back: "Nejdřív zvol útvar, pak osnovu. Hlídaj odstavce, návaznost a spisovnost. Na závěr vždy zkontroluj pravopis.",
        },
      ],
      quiz: [
        {
          id: "sl-q1",
          prompt: "Charakteristika se zaměřuje hlavně na:",
          options: [
            { id: "A", text: "Povahové rysy postavy" },
            { id: "B", text: "Jen zeměpisné souřadnice" },
            { id: "C", text: "Chemické vzorce" },
            { id: "D", text: "Ceník zboží" },
          ],
          correctOptionId: "A",
          explanation:
            "Charakteristika popisuje vnitřní i vnější vlastnosti postavy a její chování.",
        },
        {
          id: "sl-q2",
          prompt: "Úvaha by měla obsahovat:",
          options: [
            { id: "A", text: "Názor, argumenty a závěr" },
            { id: "B", text: "Jen seznam bez komentáře" },
            { id: "C", text: "Výhradně cizí citáty bez vlastního postoje" },
            { id: "D", text: "Náhodné věty bez tématu" },
          ],
          correctOptionId: "A",
          explanation:
            "Dobrá úvaha má jasné téma, argumentaci a uzavřený závěr.",
        },
        {
          id: "sl-q3",
          prompt: "Výklad především:",
          options: [
            { id: "A", text: "Vysvětluje jev a souvislosti" },
            { id: "B", text: "Vypráví napínavý příběh" },
            { id: "C", text: "Chválí postavu bez faktů" },
            { id: "D", text: "Nahrazuje básnickou metaforu" },
          ],
          correctOptionId: "A",
          explanation:
            "Výklad má informační a vysvětlující funkci — učí čtenáře porozumět tématu.",
        },
        {
          id: "sl-q4",
          prompt: "Před psaním slohu je nejdůležitější:",
          options: [
            { id: "A", text: "Osnova a volba útvaru" },
            { id: "B", text: "Psát bez rozmyslu od prostředka" },
            { id: "C", text: "Ignorovat zadání" },
            { id: "D", text: "Vynechat odstavce" },
          ],
          correctOptionId: "A",
          explanation:
            "Jasná osnova a správný útvar ušetří čas a zvýší srozumitelnost textu.",
        },
      ],
      audioSummary:
        "Slohové útvary mají různé cíle: vypravování vypráví děj, popis zachycuje vzhled, charakteristika povahu, úvaha názor a výklad vysvětluje. K maturitě si vždy nejdřív zvol útvar, sestav osnovu a hlídej návaznost i spisovnost.",
    },
  },
  {
    match: (title) =>
      includesAny(normalize(title), ["rovnice", "nerovnice"]),
    pack: {
      flashcards: [
        {
          id: "rn-1",
          front: "Co je lineární rovnice?",
          back: "Rovnice, kde neznámá je v první mocnině. Obecný tvar: ax + b = 0, kde a ≠ 0.",
        },
        {
          id: "rn-2",
          front: "Jak řešíš nerovnici?",
          back: "Upravíš podobně jako rovnici, ale při násobení/dělení záporným číslem otočíš znaménko nerovnosti.",
        },
        {
          id: "rn-3",
          front: "Co je kvadratická rovnice?",
          back: "Rovnice tvaru ax² + bx + c = 0. Řeší se diskriminantem D = b² − 4ac nebo rozkladem.",
        },
        {
          id: "rn-4",
          front: "Kdy má kvadratická rovnice dva reálné kořeny?",
          back: "Když je diskriminant D > 0. Při D = 0 je jeden dvojnásobný kořen, při D < 0 nejsou reálné kořeny.",
        },
        {
          id: "rn-5",
          front: "Tip k didaktickému testu",
          back: "Nejdřív zjednoduš, pak dosaď. Kontroluj definiční obor — hlavně u zlomků a odmocnin.",
        },
      ],
      quiz: [
        {
          id: "rn-q1",
          prompt: "Lineární rovnice má neznámou:",
          options: [
            { id: "A", text: "V první mocnině" },
            { id: "B", text: "Jen ve druhé mocnině" },
            { id: "C", text: "Jen ve jmenovateli odmocniny" },
            { id: "D", text: "Nikdy" },
          ],
          correctOptionId: "A",
          explanation: "Lineární rovnice obsahuje neznámou v první mocnině.",
        },
        {
          id: "rn-q2",
          prompt: "Při násobení nerovnice záporným číslem:",
          options: [
            { id: "A", text: "Otočíš znaménko nerovnosti" },
            { id: "B", text: "Nerovnost zrušíš" },
            { id: "C", text: "Vždy přičteš nulu" },
            { id: "D", text: "Změníš neznámou na konstantu" },
          ],
          correctOptionId: "A",
          explanation:
            "Násobení nebo dělení záporným číslem mění směr nerovnosti.",
        },
        {
          id: "rn-q3",
          prompt: "Diskriminant kvadratické rovnice je:",
          options: [
            { id: "A", text: "D = b² − 4ac" },
            { id: "B", text: "D = a + b + c" },
            { id: "C", text: "D = 2a" },
            { id: "D", text: "D = c/a" },
          ],
          correctOptionId: "A",
          explanation: "Klasický vzorec diskriminantu je D = b² − 4ac.",
        },
        {
          id: "rn-q4",
          prompt: "Pokud D < 0, kvadratická rovnice má:",
          options: [
            { id: "A", text: "Žádný reálný kořen" },
            { id: "B", text: "Nekonečně mnoho kořenů" },
            { id: "C", text: "Vždy dva stejné reálné kořeny" },
            { id: "D", text: "Jen kladný kořen" },
          ],
          correctOptionId: "A",
          explanation:
            "Záporný diskriminant znamená, že v reálných číslech řešení neexistuje.",
        },
      ],
      audioSummary:
        "U rovnic a nerovnic nejdřív uprav výraz a hlídej definiční obor. Lineární rovnice mají neznámou v první mocnině. U nerovnic při násobení záporným číslem otočíš znaménko. Kvadratické rovnice řešíš diskriminantem D rovná se b na druhou mínus 4ac.",
    },
  },
  {
    match: (title, subject) =>
      includesAny(normalize(title), ["funkce"]) ||
      (includesAny(normalize(subject), ["matemat"]) &&
        includesAny(normalize(title), ["funkce"])),
    pack: {
      flashcards: [
        {
          id: "fu-1",
          front: "Co je funkce?",
          back: "Předpis, který každému x z definičního oboru přiřadí právě jedno y. Zapisujeme y = f(x).",
        },
        {
          id: "fu-2",
          front: "Co je definiční obor?",
          back: "Množina všech přípustných hodnot x, pro které má funkce smysl (např. jmenovatel ≠ 0).",
        },
        {
          id: "fu-3",
          front: "Jak poznáš rostoucí funkci?",
          back: "Když s rostoucím x roste i f(x). Graf „jde nahoru“ zleva doprava.",
        },
        {
          id: "fu-4",
          front: "Lineární funkce — základní tvar",
          back: "y = ax + b. Parametr a je směrnice (sklon), b je průsečík s osou y.",
        },
        {
          id: "fu-5",
          front: "Kvadratická funkce — graf",
          back: "Grafem je parabola. Vrchol a otevření nahoru/dolů určují koeficienty a, b, c.",
        },
      ],
      quiz: [
        {
          id: "fu-q1",
          prompt: "Funkce přiřadí každému x:",
          options: [
            { id: "A", text: "Právě jedno y" },
            { id: "B", text: "Vždy dvě různá y" },
            { id: "C", text: "Žádné y" },
            { id: "D", text: "Nekonečně mnoho libovolných y" },
          ],
          correctOptionId: "A",
          explanation:
            "Definice funkce vyžaduje jednoznačné přiřazení hodnoty y.",
        },
        {
          id: "fu-q2",
          prompt: "Definiční obor je množina:",
          options: [
            { id: "A", text: "Přípustných hodnot x" },
            { id: "B", text: "Jen celých čísel y" },
            { id: "C", text: "Všech grafů bez x" },
            { id: "D", text: "Náhodných konstant" },
          ],
          correctOptionId: "A",
          explanation:
            "Definiční obor říká, pro která x má funkce smysl.",
        },
        {
          id: "fu-q3",
          prompt: "Ve funkci y = ax + b je a:",
          options: [
            { id: "A", text: "Směrnice přímky" },
            { id: "B", text: "Obsah kruhu" },
            { id: "C", text: "Diskriminant" },
            { id: "D", text: "Odchylka od nuly vždy 90°" },
          ],
          correctOptionId: "A",
          explanation: "Koeficient a určuje sklon lineární funkce.",
        },
        {
          id: "fu-q4",
          prompt: "Grafem kvadratické funkce je:",
          options: [
            { id: "A", text: "Parabola" },
            { id: "B", text: "Přímka" },
            { id: "C", text: "Krychle" },
            { id: "D", text: "Trojúhelník" },
          ],
          correctOptionId: "A",
          explanation: "Kvadratická funkce má graf ve tvaru paraboly.",
        },
      ],
      audioSummary:
        "Funkce přiřadí každému x právě jedno y. Hlídáš definiční obor, monotonicitu a tvar grafu. Lineární funkce je přímka se směrnicí a, kvadratická funkce má graf paraboly. U maturity vždy nejdřív zjisti, pro která x má předpis smysl.",
    },
  },
  {
    match: (title) =>
      includesAny(normalize(title), ["planimetr", "stereometr", "geometr"]),
    pack: {
      flashcards: [
        {
          id: "ge-1",
          front: "Co řeší planimetrie?",
          back: "Rovinnou geometrii — obrazce v rovině: trojúhelníky, kružnice, mnohoúhelníky, obsahy a obvody.",
        },
        {
          id: "ge-2",
          front: "Co řeší stereometrie?",
          back: "Prostorovou geometrii — tělesa, objemy, povrchy, řezy a vzájemnou polohu přímek a rovin.",
        },
        {
          id: "ge-3",
          front: "Pythagorova věta",
          back: "V pravoúhlém trojúhelníku platí a² + b² = c², kde c je přepona.",
        },
        {
          id: "ge-4",
          front: "Objem kvádru",
          back: "V = a · b · c. Povrch je součet obsahů všech stěn.",
        },
        {
          id: "ge-5",
          front: "Tip k testu z geometrie",
          back: "Nakresli náčrtek, označ délky a zkontroluj jednotky. Často pomůže podobnost nebo Pythagorova věta.",
        },
      ],
      quiz: [
        {
          id: "ge-q1",
          prompt: "Planimetrie se zabývá:",
          options: [
            { id: "A", text: "Útvary v rovině" },
            { id: "B", text: "Jen chemickými reakcemi" },
            { id: "C", text: "Výhradně dějinami umění" },
            { id: "D", text: "Slovní zásobou AJ" },
          ],
          correctOptionId: "A",
          explanation: "Planimetrie je geometrie roviny.",
        },
        {
          id: "ge-q2",
          prompt: "Pythagorova věta platí v:",
          options: [
            { id: "A", text: "Pravoúhlém trojúhelníku" },
            { id: "B", text: "Každém pětiúhelníku" },
            { id: "C", text: "Koule bez výjimky" },
            { id: "D", text: "Libovolném čtyřúhelníku" },
          ],
          correctOptionId: "A",
          explanation:
            "Věta platí právě v pravoúhlém trojúhelníku pro odvěsny a přeponu.",
        },
        {
          id: "ge-q3",
          prompt: "Objem kvádru spočítáš jako:",
          options: [
            { id: "A", text: "a · b · c" },
            { id: "B", text: "a + b + c" },
            { id: "C", text: "2πr" },
            { id: "D", text: "a² − b²" },
          ],
          correctOptionId: "A",
          explanation: "Objem kvádru je součin tří hran.",
        },
        {
          id: "ge-q4",
          prompt: "Stereometrie se týká:",
          options: [
            { id: "A", text: "Těles a prostoru" },
            { id: "B", text: "Jen rovinných úseček bez prostoru" },
            { id: "C", text: "Pouze pravopisu" },
            { id: "D", text: "Hudby baroka" },
          ],
          correctOptionId: "A",
          explanation:
            "Stereometrie studuje prostorové útvary, objemy a povrchy.",
        },
      ],
      audioSummary:
        "Planimetrie řeší rovinné útvary, stereometrie tělesa v prostoru. K maturitě si pamatuj Pythagorovu větu, obsahy, obvody, objemy a povrchy. Vždy si udělej náčrtek a zkontroluj jednotky.",
    },
  },
  {
    match: (title) =>
      includesAny(normalize(title), ["poslech", "porozumeni", "porozumění"]),
    pack: {
      flashcards: [
        {
          id: "aj-1",
          front: "Jak trénovat poslech k maturitě?",
          back: "Nejdřív poslouchej celek, pak detaily. Sleduj klíčová slova, čísla, jména a signály jako however, because, finally.",
        },
        {
          id: "aj-2",
          front: "Co dělat, když nerozumíš každému slovu?",
          back: "Hledej smysl z kontextu. Maturita nechce doslovný překlad, ale porozumění hlavní myšlence a detailům.",
        },
        {
          id: "aj-3",
          front: "Tip před poslechem",
          back: "Přečti si zadání dopředu. Tušíš, na co se ptají, a ucho lépe zachytí relevantní informace.",
        },
        {
          id: "aj-4",
          front: "False friends — pozor",
          back: "Například actual ≠ aktuální (znamená skutečný). Kontrola významu šetří body.",
        },
        {
          id: "aj-5",
          front: "Po poslechu",
          back: "Zkontroluj, jestli odpověď sedí na otázku. Často chytáky míří na podobně znějící detail.",
        },
      ],
      quiz: [
        {
          id: "aj-q1",
          prompt: "Před poslechem je nejlepší:",
          options: [
            { id: "A", text: "Přečíst zadání a tipnout si, co bude důležité" },
            { id: "B", text: "Ignorovat otázky" },
            { id: "C", text: "Psát esej bez poslechu" },
            { id: "D", text: "Vypnout zvuk" },
          ],
          correctOptionId: "A",
          explanation:
            "Orientace v zadání zvyšuje šanci, že zachytíš klíčové informace.",
        },
        {
          id: "aj-q2",
          prompt: "Když nerozumíš každému slovu:",
          options: [
            { id: "A", text: "Sleduj kontext a hlavní myšlenku" },
            { id: "B", text: "Okamžitě vzdáš test" },
            { id: "C", text: "Hádáš jen podle první hlásky" },
            { id: "D", text: "Překládáš každé slovo do latiny" },
          ],
          correctOptionId: "A",
          explanation:
            "Poslechové úlohy hodnotí porozumění, ne dokonalý slovník.",
        },
        {
          id: "aj-q3",
          prompt: "Slovo actual v angličtině obvykle znamená:",
          options: [
            { id: "A", text: "Skutečný" },
            { id: "B", text: "Aktuální (současný)" },
            { id: "C", text: "Náhodný" },
            { id: "D", text: "Zakázaný" },
          ],
          correctOptionId: "A",
          explanation:
            "Actual je false friend — znamená skutečný, ne aktuální.",
        },
        {
          id: "aj-q4",
          prompt: "Signální slova jako however nebo finally pomáhají:",
          options: [
            { id: "A", text: "Sledovat strukturu a důležité body" },
            { id: "B", text: "Zrušit význam textu" },
            { id: "C", text: "Nahradit gramatiku" },
            { id: "D", text: "Ignorovat obsah" },
          ],
          correctOptionId: "A",
          explanation:
            "Diskurzní ukazatele usnadňují orientaci v mluveném textu.",
        },
      ],
      audioSummary:
        "U poslechu nejdřív projdi zadání, pak sleduj klíčová slova a kontext. Nemusíš rozumět každému slovu — důležité je zachytit hlavní myšlenku a požadovaný detail. Pozor na false friends a chytáky v podobně znějících informacích.",
    },
  },
  {
    match: (title) =>
      includesAny(normalize(title), ["gramatika", "slovni zasoba", "slovní zásoba"]),
    pack: {
      flashcards: [
        {
          id: "gr-1",
          front: "Present perfect — základní použití",
          back: "Vyjadřuje zkušenost nebo děj s vazbou na přítomnost: I have already finished. Často s already, yet, just, ever, never.",
        },
        {
          id: "gr-2",
          front: "Past simple vs present perfect",
          back: "Past simple = ukončený čas v minulosti (yesterday). Present perfect = výsledek teď / zkušenost bez přesného času.",
        },
        {
          id: "gr-3",
          front: "Conditionals — nultý a první",
          back: "Zero: If you heat ice, it melts. First: If it rains, we will stay home. Realistické podmínky.",
        },
        {
          id: "gr-4",
          front: "Jak učit slovní zásobu efektivně",
          back: "Uč se slova v kontextu vět, s antonymy a krátkou kartičkou. Opakuj aktivně — ne jen pasivní čtení seznamu.",
        },
        {
          id: "gr-5",
          front: "Častá chyba maturantů",
          back: "Záměna since/for a much/many. Since = od bodu v čase, for = po dobu. Many = počitatelná, much = nepočitatelná.",
        },
      ],
      quiz: [
        {
          id: "gr-q1",
          prompt: "Věta „I have just eaten“ používá:",
          options: [
            { id: "A", text: "Present perfect" },
            { id: "B", text: "Past perfect continuous povinně" },
            { id: "C", text: "Future perfect" },
            { id: "D", text: "Imperativ" },
          ],
          correctOptionId: "A",
          explanation:
            "Just + have/has + past participle je typické present perfect.",
        },
        {
          id: "gr-q2",
          prompt: "„Yesterday I ___ to school.“",
          options: [
            { id: "A", text: "went" },
            { id: "B", text: "have gone" },
            { id: "C", text: "goes" },
            { id: "D", text: "going" },
          ],
          correctOptionId: "A",
          explanation:
            "Yesterday vyžaduje past simple — went.",
        },
        {
          id: "gr-q3",
          prompt: "Since se používá:",
          options: [
            { id: "A", text: "Od určitého bodu v čase" },
            { id: "B", text: "Pro délku trvání (např. for two hours)" },
            { id: "C", text: "Jen v budoucím čase" },
            { id: "D", text: "Místo plurálu" },
          ],
          correctOptionId: "A",
          explanation:
            "Since = od kdy (since Monday). For = jak dlouho (for three days).",
        },
        {
          id: "gr-q4",
          prompt: "Many se typicky pojí s:",
          options: [
            { id: "A", text: "Počitatelnými podstatnými jmény" },
            { id: "B", text: "Jen nepočitatelnými jako water" },
            { id: "C", text: "Jen přídavnými jmény" },
            { id: "D", text: "Jen slovesy v minulém čase" },
          ],
          correctOptionId: "A",
          explanation:
            "Many books, many students. Much water, much time.",
        },
      ],
      audioSummary:
        "U gramatiky a slovní zásoby se soustřeď na časy, zejména past simple a present perfect, a na přesné použití since a for. Slovíčka se uč v kontextu vět. Před maturitou procvič conditionals a typické false friends.",
    },
  },
];

function buildFallbackPack(title: string, subject: string): MaterialStudyPack {
  const safeTitle = title.trim() || "materiál";
  const safeSubject = subject.trim() || "maturita";

  return {
    flashcards: [
      {
        id: "fb-1",
        front: `O čem je materiál „${safeTitle}“?`,
        back: `Jde o studijní podklad z oblasti ${safeSubject}. Zaměř se na klíčové pojmy, souvislosti a typické maturitní otázky.`,
      },
      {
        id: "fb-2",
        front: `Jak se učit téma „${safeTitle}“ efektivně?`,
        back: "Nejdřív si udělej krátkou osnovu: 1) hlavní pojem, 2) příklad, 3) častá chyba, 4) shrnutí vlastními slovy.",
      },
      {
        id: "fb-3",
        front: "Co máš umět říct u maturity?",
        back: `Vysvětli podstatu tématu „${safeTitle}“, uveď 2–3 konkrétní příklady a porovnej s příbuzným okruhem v předmětu ${safeSubject}.`,
      },
      {
        id: "fb-4",
        front: "Jak poznáš, že látku ovládáš?",
        back: "Když dokážeš téma vysvětlit bez čtení poznámek a odpovíš na doplňující otázku proč / jak / uveď příklad.",
      },
      {
        id: "fb-5",
        front: "Rychlé opakování před testem",
        back: `Zavři materiál a napiš 5 klíčových bodů k „${safeTitle}“. Pak si je porovnej s poznámkami a doplň mezery.`,
      },
    ],
    quiz: [
      {
        id: "fb-q1",
        prompt: `Nejlepší první krok při učení „${safeTitle}“ je:`,
        options: [
          { id: "A", text: "Udělat si krátkou osnovu hlavních pojmů" },
          { id: "B", text: "Memorovat náhodně bez struktury" },
          { id: "C", text: "Přeskočit celé téma" },
          { id: "D", text: "Učit se jen poslední větu" },
        ],
        correctOptionId: "A",
        explanation:
          "Osnova ti dá přehled a ušetří čas při opakování i u ústní zkoušky.",
      },
      {
        id: "fb-q2",
        prompt: "Aktivní učení znamená hlavně:",
        options: [
          { id: "A", text: "Vysvětlovat látku vlastními slovy" },
          { id: "B", text: "Jen pasivně pročítat text" },
          { id: "C", text: "Ignorovat příklady" },
          { id: "D", text: "Učit se bez kontroly chyb" },
        ],
        correctOptionId: "A",
        explanation:
          "Když látku přeříkáš nebo napíšeš sám, zapamatování je výrazně silnější.",
      },
      {
        id: "fb-q3",
        prompt: `U maturity z předmětu ${safeSubject} je důležité:`,
        options: [
          { id: "A", text: "Pojmy + příklady + souvislosti" },
          { id: "B", text: "Jen jedna izolovaná definice" },
          { id: "C", text: "Odpovídat mimo téma" },
          { id: "D", text: "Vyhnout se příkladům" },
        ],
        correctOptionId: "A",
        explanation:
          "Zkoušející oceňuje přehled, konkrétní příklady a schopnost porovnání.",
      },
      {
        id: "fb-q4",
        prompt: "Když si nejsi jistý odpovědí:",
        options: [
          { id: "A", text: "Vyluč zjevně špatné možnosti a zvol nejlepší zbývající" },
          { id: "B", text: "Hned odevzdej prázdný test" },
          { id: "C", text: "Změň všechny odpovědi náhodně" },
          { id: "D", text: "Ignoruj zadání otázky" },
        ],
        correctOptionId: "A",
        explanation:
          "Metoda vylučování zvyšuje šanci na správnou odpověď i při nejistotě.",
      },
    ],
    audioSummary: `Právě studuješ materiál „${safeTitle}“ z oblasti ${safeSubject}. Nejdřív si ujasni hlavní pojmy, pak přidej konkrétní příklady a nakonec si téma vysvětli nahlas vlastními slovy. Krátké aktivní opakování je účinnější než dlouhé pasivní čtení.`,
  };
}

export function buildMaterialStudyPack(
  title: string,
  subject: string,
): MaterialStudyPack {
  const nTitle = normalize(title);
  const nSubject = normalize(subject);

  for (const seed of SEEDS) {
    if (seed.match(nTitle, nSubject)) {
      return seed.pack;
    }
  }

  // Druhý průchod: match i proti subject, pokud title nic nenašel
  for (const seed of SEEDS) {
    if (seed.match(nSubject, nTitle)) {
      return seed.pack;
    }
  }

  return buildFallbackPack(title, subject);
}
