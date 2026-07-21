import { deterministicUuid } from "@/server/curriculum/ids";
import type { FlashcardDeck, FlashcardType } from "@/domain/learning/flashcards";

const NS = "dammaturu.flashcards";

function cid(key: string) {
  return deterministicUuid(NS, key);
}

function card(
  key: string,
  type: FlashcardType,
  front: string,
  back: string,
  extra?: { context?: string; hint?: string; tags?: string[] },
) {
  return {
    id: cid(`card:${key}`),
    slug: key,
    type,
    front,
    back,
    context: extra?.context,
    hint: extra?.hint,
    tags: extra?.tags ?? [],
  };
}

/** ČJL literary-history deck covering all flashcard types. */
export function buildCjlLiterarniDeck(
  now = new Date().toISOString(),
): FlashcardDeck {
  const cards = [
    card(
      "realismus-definice",
      "term_definition",
      "Realismus",
      "Literární směr 19. stol. — zobrazení soudobé společnosti, typických postav a prostředí bez idealizace.",
      { tags: ["realismus"] },
    ),
    card(
      "romantismus-definice",
      "term_definition",
      "Romantismus",
      "Směr: cit, individualita, konflikt jedince a společnosti; v Čechách silně v 3. etapě NO.",
      { tags: ["romantismus"] },
    ),
    card(
      "macha-dilo",
      "author_work",
      "Karel Hynek Mácha",
      "Máj (1836)",
      { tags: ["romantismus", "macha"] },
    ),
    card(
      "erben-dilo",
      "author_work",
      "Karel Jaromír Erben",
      "Kytice",
      { tags: ["romantismus", "erben"] },
    ),
    card(
      "balzac-dilo",
      "author_work",
      "Honoré de Balzac",
      "Lidská komedie (cyklus); např. Otec Goriot",
      { tags: ["realismus", "balzac"] },
    ),
    card(
      "maj-autor",
      "work_author",
      "Máj",
      "Karel Hynek Mácha",
      { tags: ["romantismus"] },
    ),
    card(
      "babicka-autor",
      "work_author",
      "Babička",
      "Božena Němcová",
      { tags: ["realismus", "no"] },
    ),
    card(
      "zlocin-autor",
      "work_author",
      "Zločin a trest",
      "F. M. Dostojevskij",
      { tags: ["realismus"] },
    ),
    card(
      "rok-1848",
      "event_meaning",
      "Rok 1848 v českých zemích",
      "Revoluce a národní požadavky; konec romantické fáze NO, posun k realismu a politickému vědomí.",
      { tags: ["historie", "no"] },
    ),
    card(
      "narodni-obrozeni-vyznam",
      "event_meaning",
      "Národní obrození",
      "Obnova češtiny, literatury a národního vědomí (etapy: obrana → útok → romantismus).",
      { tags: ["no"] },
    ),
    card(
      "raskolnikov",
      "character_work",
      "Rodion Raskolnikov",
      "Zločin a trest (Dostojevskij)",
      { tags: ["realismus"] },
    ),
    card(
      "rastignac",
      "character_work",
      "Eugène de Rastignac",
      "Otec Goriot / Lidská komedie (Balzac)",
      { tags: ["realismus"] },
    ),
    card(
      "vilem-maj",
      "character_work",
      "Vilém (vězeň)",
      "Máj (Mácha)",
      { tags: ["romantismus"] },
    ),
    card(
      "popis-kriticky-realismus",
      "description_identify",
      "Literatura, která kritizuje společnost bez idealizace (např. Maryša).",
      "Kritický realismus",
      { tags: ["realismus"] },
    ),
    card(
      "popis-lyrickoepicka",
      "description_identify",
      "Báseň spojující lyrické pasáže s epickým příběhem (vina, příroda, čas) — 1836.",
      "Máj (Mácha)",
      { hint: "Český romantismus", tags: ["romantismus"] },
    ),
    card(
      "otazka-etapy-no",
      "question_answer",
      "Jaké jsou hlavní etapy Národního obrození?",
      "Obranná → útok / jazykový program → romantismus (cca do 1848).",
      { tags: ["no"] },
    ),
    card(
      "otazka-balzac-cyklus",
      "question_answer",
      "Jak se jmenuje Balzacův románový cyklus o francouzské společnosti?",
      "Lidská komedie",
      { tags: ["realismus"] },
    ),
    card(
      "kontext-vina-trest",
      "context_concept",
      "Co je společným motivem?",
      "Vina a trest / svědomí",
      {
        context:
          "Raskolnikov po vraždě; balady v Kytici; Vilém v Máji před popravou.",
        tags: ["motivy"],
      },
    ),
    card(
      "kontext-typizace",
      "context_concept",
      "Jaký postup realismu to ilustruje?",
      "Typizace postav a prostředí",
      {
        context:
          "Goriot = obětavý otec zničený dcerami; Rastignac = ambiciózní mladík v Paříži.",
        tags: ["realismus"],
      },
    ),
    card(
      "naturalismus-definice",
      "term_definition",
      "Naturalismus",
      "Extrém realismu — determinismus (dědičnost, prostředí); např. Zola.",
      { tags: ["realismus"] },
    ),
    card(
      "nemcova-dilo",
      "author_work",
      "Božena Němcová",
      "Babička (1855)",
      { tags: ["no", "realismus"] },
    ),
    card(
      "marysa-autor",
      "work_author",
      "Maryša",
      "Alois a Vilém Mrštíkové",
      { tags: ["realismus"] },
    ),
  ];

  return {
    id: cid("deck:cjl-literarni"),
    slug: "cjl-literarni",
    title: "Flashcards — literární historie ČJL",
    summary:
      "Termíny, autoři, díla, události, postavy. Odpověz v hlavě, pak ohodnoť — plánuje to další opakování.",
    cards,
    createdAt: now,
    updatedAt: now,
  };
}
