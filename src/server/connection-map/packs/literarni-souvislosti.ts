import { deterministicUuid } from "@/server/curriculum/ids";
import type { ConnectionMapPack } from "@/domain/learning/connection-map";

const NS = "dammaturu.connection-map";

function nid(key: string) {
  return deterministicUuid(NS, key);
}

/**
 * Teachable chains:
 * REALISMUS → Francie → Balzac → Lidská komedie → Otec Goriot
 * REALISMUS → Rusko → Dostojevskij → Zločin a trest
 * NÁRODNÍ OBROZENÍ → romantismus → Mácha → Máj
 * (+ related Czech / European branches)
 */
export function buildLiterarniSouvislostiMap(
  now = new Date().toISOString(),
): ConnectionMapPack {
  const nodes = [
    {
      id: nid("n:realismus"),
      slug: "realismus",
      kind: "movement" as const,
      title: "Realismus",
      summary: "Zobrazení soudobé společnosti a typických postav.",
      detail:
        "Literární směr 19. stol. — pozorování reality, sociální prostředí, typizace. V Evropě i v Čechách různé podoby.",
    },
    {
      id: nid("n:francie"),
      slug: "francie",
      kind: "region" as const,
      title: "Francie",
      summary: "Kolébka evropského realismu (Balzac, Flaubert, Zola).",
      detail:
        "Francouzský realismus a naturalismus ovlivnily české a evropské psaní o společnosti.",
    },
    {
      id: nid("n:rusko"),
      slug: "rusko",
      kind: "region" as const,
      title: "Rusko",
      summary: "Psychologický a společenský román (Dostojevskij, Tolstoj).",
      detail:
        "Ruský realismus jde často do nitra postavy a morální krize — důležité pro maturitní srovnání s českým realismem.",
    },
    {
      id: nid("n:cesko"),
      slug: "cesko",
      kind: "region" as const,
      title: "České země",
      summary: "Český realismus a kritický realismus 2. pol. 19. stol.",
      detail:
        "Od venkovské prózy (Němcová) k historické próze (Jirásek) a kritickému realismu (Mrštíkové).",
    },
    {
      id: nid("n:balzac"),
      slug: "balzac",
      kind: "author" as const,
      title: "Honoré de Balzac",
      summary: "Francouzský realista; cyklus Lidská komedie.",
      detail:
        "Mapuje společnost po Napoleonu — peníze, kariéra, rodina. Typický román: Otec Goriot.",
    },
    {
      id: nid("n:dostojevskij"),
      slug: "dostojevskij",
      kind: "author" as const,
      title: "F. M. Dostojevskij",
      summary: "Ruský realista; psychologický román.",
      detail:
        "Zločin a trest — vina, svědomí, sociální motivace. Maturitní srovnání s českým kritickým realismem.",
    },
    {
      id: nid("n:nemcova"),
      slug: "nemcova",
      kind: "author" as const,
      title: "Božena Němcová",
      summary: "Venkovská próza na pomezí romantismu a realismu.",
      detail:
        "Babička (1855) — idealizovaný venkov, mateřství, národní hodnoty; most k pozdějšímu realismu.",
    },
    {
      id: nid("n:jirasek"),
      slug: "jirasek",
      kind: "author" as const,
      title: "Alois Jirásek",
      summary: "Historická próza a drama; národní minulost.",
      detail:
        "Realistické zachycení českých dějin pro širší čtenářstvo — součást maturitního kontextu realismu.",
    },
    {
      id: nid("n:lidska-komedie"),
      slug: "lidska-komedie",
      kind: "work" as const,
      title: "Lidská komedie",
      summary: "Balzacův cyklus románů o francouzské společnosti.",
      detail:
        "Propojené postavy a prostředí — „mapa“ Paříže a provincie. Patří sem Otec Goriot.",
    },
    {
      id: nid("n:otec-goriot"),
      slug: "otec-goriot",
      kind: "work" as const,
      title: "Otec Goriot",
      summary: "Román o penězích, otcovství a pařížské společnosti.",
      detail:
        "Klíčové dílo Lidské komedie — Rastignac, Goriot, Vautrin; typický realismus.",
    },
    {
      id: nid("n:zlocin-a-trest"),
      slug: "zlocin-a-trest",
      kind: "work" as const,
      title: "Zločin a trest",
      summary: "Román o vraždě, vině a svědomí.",
      detail:
        "Raskolnikov — teorie vs. morálka. Psychologický realismus v ruském kontextu.",
    },
    {
      id: nid("n:babicka"),
      slug: "babicka",
      kind: "work" as const,
      title: "Babička",
      summary: "Idylický obraz venkova a rodiny.",
      detail:
        "1855. Maturitní klasika — hodnoty, příroda, generace; souvisí s NO i pozdějším realismem.",
    },
    {
      id: nid("n:narodni-obrozeni"),
      slug: "narodni-obrozeni",
      kind: "movement" as const,
      title: "Národní obrození",
      summary: "Obnova češtiny, literatury a národního vědomí.",
      detail:
        "Etapy od obrany jazyka k útoku a romantismu. Připravuje půdu pro Mácha, Erben, Němcová.",
    },
    {
      id: nid("n:romantismus"),
      slug: "romantismus",
      kind: "movement" as const,
      title: "Romantismus",
      summary: "Cit, individualita, konflikt jedince a společnosti.",
      detail:
        "V Čechách silně v 3. etapě NO. Mácha (Máj), Erben (Kytice) — klíčové maturitní uzly.",
    },
    {
      id: nid("n:macha"),
      slug: "macha",
      kind: "author" as const,
      title: "Karel Hynek Mácha",
      summary: "Vrcholný český romantik.",
      detail:
        "Máj (1836) — vina, čas, příroda. Spojuje NO a evropský romantismus.",
    },
    {
      id: nid("n:maj"),
      slug: "maj",
      kind: "work" as const,
      title: "Máj",
      summary: "Lyrickoepická báseň — vina, příroda, čas.",
      detail:
        "1836. Střed maturitního romantismu; navazuje na NO a evropské romantické motivy.",
    },
    {
      id: nid("n:erben"),
      slug: "erben",
      kind: "author" as const,
      title: "K. J. Erben",
      summary: "Romantik; balady a folklór.",
      detail:
        "Kytice — trest, vina, mateřství v lidovém rámci. Druhá větev českého romantismu vedle Máchy.",
    },
    {
      id: nid("n:kytice"),
      slug: "kytice",
      kind: "work" as const,
      title: "Kytice",
      summary: "Sbírka balad z lidové tradice.",
      detail:
        "Maturitní rozbor: vina, trest, nadpřirozeno. Souvisí s romantismem v NO.",
    },
    {
      id: nid("n:kriticky-realismus"),
      slug: "kriticky-realismus",
      kind: "concept" as const,
      title: "Kritický realismus",
      summary: "Kritika společnosti bez idealizace.",
      detail:
        "České drama/próza konce 19. stol. — např. Maryša. Navazuje na evropský realismus.",
    },
    {
      id: nid("n:marysa"),
      slug: "marysa",
      kind: "work" as const,
      title: "Maryša",
      summary: "Drama o venkovské tragédii a společenském tlaku.",
      detail:
        "Bratři Mrštíkové — kritický realismus; souvisí s českým realistickým proudem.",
    },
  ];

  const edge = (from: string, to: string, relation: string) => ({
    id: nid(`e:${from}->${to}`),
    fromSlug: from,
    toSlug: to,
    relation,
  });

  const edges = [
    edge("realismus", "francie", "v"),
    edge("francie", "balzac", "autor"),
    edge("balzac", "lidska-komedie", "cyklus"),
    edge("lidska-komedie", "otec-goriot", "dílo"),
    edge("realismus", "rusko", "v"),
    edge("rusko", "dostojevskij", "autor"),
    edge("dostojevskij", "zlocin-a-trest", "dílo"),
    edge("realismus", "cesko", "v"),
    edge("cesko", "nemcova", "autor"),
    edge("nemcova", "babicka", "dílo"),
    edge("cesko", "jirasek", "autor"),
    edge("cesko", "kriticky-realismus", "podoba"),
    edge("kriticky-realismus", "marysa", "dílo"),
    edge("narodni-obrozeni", "romantismus", "vede k"),
    edge("romantismus", "macha", "autor"),
    edge("macha", "maj", "dílo"),
    edge("romantismus", "erben", "autor"),
    edge("erben", "kytice", "dílo"),
    edge("narodni-obrozeni", "nemcova", "osobnost"),
  ];

  const path = (
    slug: string,
    label: string,
    rootSlug: string,
    nodeSlugs: string[],
  ) => ({
    id: nid(`p:${slug}`),
    slug,
    label,
    rootSlug,
    nodeSlugs,
  });

  const paths = [
    path(
      "realismus-francie-balzac",
      "Realismus → Francie → Balzac → Lidská komedie → Otec Goriot",
      "realismus",
      ["realismus", "francie", "balzac", "lidska-komedie", "otec-goriot"],
    ),
    path(
      "realismus-rusko-dostojevskij",
      "Realismus → Rusko → Dostojevskij → Zločin a trest",
      "realismus",
      ["realismus", "rusko", "dostojevskij", "zlocin-a-trest"],
    ),
    path(
      "realismus-cesko-nemcova",
      "Realismus → České země → Němcová → Babička",
      "realismus",
      ["realismus", "cesko", "nemcova", "babicka"],
    ),
    path(
      "realismus-kriticky-marysa",
      "Realismus → České země → kritický realismus → Maryša",
      "realismus",
      ["realismus", "cesko", "kriticky-realismus", "marysa"],
    ),
    path(
      "no-romantismus-macha",
      "Národní obrození → romantismus → Mácha → Máj",
      "narodni-obrozeni",
      ["narodni-obrozeni", "romantismus", "macha", "maj"],
    ),
    path(
      "no-romantismus-erben",
      "Národní obrození → romantismus → Erben → Kytice",
      "narodni-obrozeni",
      ["narodni-obrozeni", "romantismus", "erben", "kytice"],
    ),
    path(
      "romantismus-macha-maj",
      "Romantismus → Mácha → Máj",
      "romantismus",
      ["romantismus", "macha", "maj"],
    ),
    path(
      "romantismus-erben-kytice",
      "Romantismus → Erben → Kytice",
      "romantismus",
      ["romantismus", "erben", "kytice"],
    ),
  ];

  return {
    id: nid("pack:literarni-souvislosti"),
    slug: "literarni-souvislosti",
    title: "Mapa souvislostí — literární historie",
    summary:
      "Vidíš řetězce směr → oblast → autor → dílo. Ne dekorace — cesty, které musíš umět doplnit.",
    nodes,
    edges,
    paths,
    rootSlugs: ["realismus", "narodni-obrozeni", "romantismus"],
    createdAt: now,
    updatedAt: now,
  };
}
