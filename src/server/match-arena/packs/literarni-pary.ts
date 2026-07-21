import { randomUUID } from "node:crypto";
import type { MatchArenaPack, MatchPair, MatchPairKind } from "@/domain/learning/match-arena";

type PairSeed = {
  slug: string;
  kind: MatchPairKind;
  left: string;
  right: string;
  explanation: string;
  tags?: string[];
};

const PAIR_SEEDS: PairSeed[] = [
  // author ↔ work
  {
    slug: "neruda-malostranske",
    kind: "author_work",
    left: "Jan Neruda",
    right: "Povídky malostranské",
    explanation:
      "Neruda je autorem povídkového cyklu z Malé Strany (1877/1878) — typický realismus všedního života.",
    tags: ["realismus"],
  },
  {
    slug: "havlicek-tyrolske",
    kind: "author_work",
    left: "Karel Havlíček Borovský",
    right: "Tyrolské elegie",
    explanation:
      "Havlíček napsal Tyrolské elegie jako satiru z Brixenu — politická poezie národního buditele.",
    tags: ["satira"],
  },
  {
    slug: "erben-kytice",
    kind: "author_work",
    left: "K. J. Erben",
    right: "Kytice",
    explanation:
      "Erben sestavil Kytici z lidových motivů — balady s mravním řádem a osudem.",
    tags: ["romantismus"],
  },
  {
    slug: "nemcova-babicka",
    kind: "author_work",
    left: "Božena Němcová",
    right: "Babička",
    explanation:
      "Němcová je autorkou Babičky (1855) — idylický obraz venkova s postavou Babičky.",
    tags: ["realismus"],
  },
  // work ↔ character
  {
    slug: "babicka-viktorka",
    kind: "work_character",
    left: "Babička",
    right: "Viktorka",
    explanation:
      "Viktorka je tragická postava Němcové Babičky — milostný příběh a společenské stigma.",
    tags: ["postavy"],
  },
  {
    slug: "maj-jarmila",
    kind: "work_character",
    left: "Máj",
    right: "Jarmila",
    explanation:
      "Jarmila je milenka Viléma v Máchově Máji — romantická tragédie lásky a smrti.",
    tags: ["romantismus"],
  },
  {
    slug: "krutava-marycka",
    kind: "work_character",
    left: "Maryčka Magdónova",
    right: "Maryčka",
    explanation:
      "Bezručova ballada nese jméno Maryčky Magdónovy — sociální protest slezského lidu.",
    tags: ["naturalismus"],
  },
  {
    slug: "malostranske-pan-vysehradsky",
    kind: "work_character",
    left: "Povídky malostranské",
    right: "pan Vojtíšek",
    explanation:
      "Pan Vojtíšek (a další malostranské typy) patří do Nerudova cyklu Povídky malostranské.",
    tags: ["realismus"],
  },
  // author ↔ country
  {
    slug: "goethe-nemecko",
    kind: "author_country",
    left: "J. W. Goethe",
    right: "Německo",
    explanation:
      "Goethe je klíčová postava německé klasiky a světové literatury (Faust, Werther).",
    tags: ["svet"],
  },
  {
    slug: "pushkin-rusko",
    kind: "author_country",
    left: "A. S. Puškin",
    right: "Rusko",
    explanation:
      "Puškin je zakladatel novodobé ruské literatury — Evžen Oněgin, pohádky, lyrika.",
    tags: ["svet"],
  },
  {
    slug: "shakespeare-anglie",
    kind: "author_country",
    left: "William Shakespeare",
    right: "Anglie",
    explanation:
      "Shakespeare je anglický renesanční dramatik — Hamlet, Romeo a Julie, Macbeth.",
    tags: ["svet"],
  },
  {
    slug: "hugo-francie",
    kind: "author_country",
    left: "Victor Hugo",
    right: "Francie",
    explanation:
      "Hugo je francouzský romantik — Chrám Matky Boží v Paříži, Bídníci.",
    tags: ["svet"],
  },
  // movement ↔ trait
  {
    slug: "romantismus-subjektivita",
    kind: "movement_trait",
    left: "romantismus",
    right: "subjektivita a cit",
    explanation:
      "Romantismus staví na subjektu, citu, kontrastu ideálu a reality (Mácha, Byron).",
    tags: ["smer"],
  },
  {
    slug: "realismus-typizace",
    kind: "movement_trait",
    left: "realismus",
    right: "typizace všedního života",
    explanation:
      "Realismus zobrazuje společenské typy a všední život (Neruda, Tolstoj, Balzac).",
    tags: ["smer"],
  },
  {
    slug: "naturalismus-determinismus",
    kind: "movement_trait",
    left: "naturalismus",
    right: "determinismus prostředí",
    explanation:
      "Naturalismus zdůrazňuje dědičnost a prostředí jako determinanty (Zola, Čapek-Chod).",
    tags: ["smer"],
  },
  {
    slug: "symbolismus-naznak",
    kind: "movement_trait",
    left: "symbolismus",
    right: "náznak a symbol",
    explanation:
      "Symbolismus pracuje s náznakem, symbolem a hudebností verše (Mallarmé, Březina).",
    tags: ["smer"],
  },
  // term ↔ definition
  {
    slug: "metafora-def",
    kind: "term_definition",
    left: "metafora",
    right: "přenesené pojmenování na základě podobnosti",
    explanation:
      "Metafora přenáší význam podle podobnosti (např. „moře lidí“) — tropus.",
    tags: ["poetika"],
  },
  {
    slug: "epiteton-def",
    kind: "term_definition",
    left: "epiteton",
    right: "básnický přívlastek",
      explanation:
        "Epiteton je ozdobný / charakterizační přívlastek (např. zelený les, zlý osud).",
      tags: ["poetika"],
  },
  {
    slug: "synekdocha-def",
    kind: "term_definition",
    left: "synekdocha",
    right: "záměna části a celku",
    explanation:
      "Synekdocha zaměňuje část za celek nebo naopak („střecha nad hlavou“ = dům).",
    tags: ["poetika"],
  },
  {
    slug: "ironie-def",
    kind: "term_definition",
    left: "ironie",
    right: "význam opačný než doslovný",
    explanation:
      "Ironie říká jedno a míní opak — často satira a odstup (Havlíček, Čapek).",
    tags: ["poetika"],
  },
  // event ↔ period
  {
    slug: "narodni-obrozeni-obdobi",
    kind: "event_period",
    left: "národní obrození",
    right: "konec 18. – 1. pol. 19. stol.",
    explanation:
      "Národní obrození je proces obnovy českého jazyka a kultury na přelomu 18./19. století.",
    tags: ["historie"],
  },
  {
    slug: "breznova-revoluce",
    kind: "event_period",
    left: "revoluce 1848",
    right: "jaro národů (polovina 19. stol.)",
    explanation:
      "Revoluce 1848 (jaro národů) ovlivnila politiku i literaturu — Havlíček, Májovci později.",
    tags: ["historie"],
  },
  {
    slug: "prvni-republika",
    kind: "event_period",
    left: "vznik ČSR",
    right: "1918 (1. republika)",
    explanation:
      "Československo vzniklo 28. 10. 1918 — kontext legionářů, Čapka, meziválečné literatury.",
    tags: ["historie"],
  },
  {
    slug: "protektorat",
    kind: "event_period",
    left: "protektorát Čechy a Morava",
    right: "1939–1945",
    explanation:
      "Protektorát 1939–1945 — cenzura, odboj, válečná a poválečná literatura.",
    tags: ["historie"],
  },
];

const ROUND_DEFS: Array<{
  slug: string;
  kind: MatchPairKind;
  title: string;
  pairSlugs: string[];
}> = [
  {
    slug: "kolo-autor-dilo",
    kind: "author_work",
    title: "Autor ↔ dílo",
    pairSlugs: [
      "neruda-malostranske",
      "havlicek-tyrolske",
      "erben-kytice",
      "nemcova-babicka",
    ],
  },
  {
    slug: "kolo-dilo-postava",
    kind: "work_character",
    title: "Dílo ↔ postava",
    pairSlugs: [
      "babicka-viktorka",
      "maj-jarmila",
      "krutava-marycka",
      "malostranske-pan-vysehradsky",
    ],
  },
  {
    slug: "kolo-autor-zeme",
    kind: "author_country",
    title: "Autor ↔ země",
    pairSlugs: [
      "goethe-nemecko",
      "pushkin-rusko",
      "shakespeare-anglie",
      "hugo-francie",
    ],
  },
  {
    slug: "kolo-smer-znak",
    kind: "movement_trait",
    title: "Směr ↔ znak",
    pairSlugs: [
      "romantismus-subjektivita",
      "realismus-typizace",
      "naturalismus-determinismus",
      "symbolismus-naznak",
    ],
  },
  {
    slug: "kolo-pojem-definice",
    kind: "term_definition",
    title: "Pojem ↔ definice",
    pairSlugs: [
      "metafora-def",
      "epiteton-def",
      "synekdocha-def",
      "ironie-def",
    ],
  },
  {
    slug: "kolo-udalost-obdobi",
    kind: "event_period",
    title: "Událost ↔ období",
    pairSlugs: [
      "narodni-obrozeni-obdobi",
      "breznova-revoluce",
      "prvni-republika",
      "protektorat",
    ],
  },
];

export function buildLiterarniParyPack(nowIso = new Date().toISOString()): MatchArenaPack {
  const pairs: MatchPair[] = PAIR_SEEDS.map((seed) => ({
    id: randomUUID(),
    slug: seed.slug,
    kind: seed.kind,
    left: { id: randomUUID(), label: seed.left },
    right: { id: randomUUID(), label: seed.right },
    explanation: seed.explanation,
    tags: seed.tags ?? [],
  }));

  const bySlug = new Map(pairs.map((p) => [p.slug, p]));

  const rounds = ROUND_DEFS.map((def) => ({
    id: randomUUID(),
    slug: def.slug,
    kind: def.kind,
    title: def.title,
    pairIds: def.pairSlugs.map((s) => {
      const pair = bySlug.get(s);
      if (!pair) throw new Error(`Chybí pair slug: ${s}`);
      return pair.id;
    }),
  }));

  return {
    id: randomUUID(),
    slug: "literarni-pary",
    title: "Match Arena — literární páry",
    summary:
      "Spojuj autor↔dílo, dílo↔postava, autor↔země, směr↔znak, pojem↔definice a událost↔období. Po chybě vysvětlení; slabé páry jdou do review.",
    pairs,
    rounds,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
