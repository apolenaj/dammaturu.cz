import { randomUUID } from "node:crypto";
import {
  SPEED_ROUND_DURATION_MS,
  parseSpeedRoundPack,
  type SpeedQuestion,
  type SpeedQuestionKind,
  type SpeedRoundPack,
} from "@/domain/learning/speed-round";

type OptionDraft = string;

type QDraft = {
  slug: string;
  kind: SpeedQuestionKind;
  prompt: string;
  options: OptionDraft[];
  /** Index of correct option. */
  correct: number;
  factHint?: string;
};

const QUESTIONS: QDraft[] = [
  // ——— author → work ———
  {
    slug: "aw-neruda",
    kind: "author_work",
    prompt: "Jan Neruda → ?",
    options: ["Povídky malostranské", "Kytice", "Máj", "Babička"],
    correct: 0,
    factHint: "Neruda napsal Povídky malostranské.",
  },
  {
    slug: "aw-macha",
    kind: "author_work",
    prompt: "K. H. Mácha → ?",
    options: ["Máj", "Maryša", "Babička", "Tyrolské elegie"],
    correct: 0,
  },
  {
    slug: "aw-erben",
    kind: "author_work",
    prompt: "K. J. Erben → ?",
    options: ["Kytice", "Máj", "Otec Goriot", "Povídky malostranské"],
    correct: 0,
  },
  {
    slug: "aw-nemcova",
    kind: "author_work",
    prompt: "Božena Němcová → ?",
    options: ["Babička", "Máj", "Zločin a trest", "Maryša"],
    correct: 0,
  },
  {
    slug: "aw-havlicek",
    kind: "author_work",
    prompt: "K. Havlíček Borovský → ?",
    options: ["Tyrolské elegie", "Máj", "Kytice", "Babička"],
    correct: 0,
  },
  {
    slug: "aw-balzac",
    kind: "author_work",
    prompt: "Honoré de Balzac → ?",
    options: ["Otec Goriot", "Anna Karenina", "Máj", "Maryša"],
    correct: 0,
  },
  {
    slug: "aw-dostojevskij",
    kind: "author_work",
    prompt: "F. M. Dostojevskij → ?",
    options: ["Zločin a trest", "Babička", "Kytice", "Otec Goriot"],
    correct: 0,
  },
  {
    slug: "aw-tolstoj",
    kind: "author_work",
    prompt: "L. N. Tolstoj → ?",
    options: ["Anna Karenina", "Máj", "Maryša", "Povídky malostranské"],
    correct: 0,
  },
  {
    slug: "aw-mrstikove",
    kind: "author_work",
    prompt: "Bratři Mrštíkové → ?",
    options: ["Maryša", "Máj", "Kytice", "Otec Goriot"],
    correct: 0,
  },
  {
    slug: "aw-shakespeare",
    kind: "author_work",
    prompt: "W. Shakespeare → země?",
    options: ["Anglie", "Francie", "Rusko", "Německo"],
    correct: 0,
    factHint: "Shakespeare je anglický dramatik.",
  },
  // ——— term → definition ———
  {
    slug: "td-metafora",
    kind: "term_definition",
    prompt: "Metafora = ?",
    options: [
      "přenesené pojmenování podle podobnosti",
      "záměna části a celku",
      "básnický přívlastek",
      "opakování slov",
    ],
    correct: 0,
  },
  {
    slug: "td-epiteton",
    kind: "term_definition",
    prompt: "Epiteton = ?",
    options: [
      "básnický přívlastek",
      "přirovnání se ‚jako‘",
      "řečnická otázka",
      "opak významu",
    ],
    correct: 0,
  },
  {
    slug: "td-synekdocha",
    kind: "term_definition",
    prompt: "Synekdocha = ?",
    options: [
      "záměna části a celku",
      "přenos podle podobnosti",
      "zveličení",
      "zosobnění",
    ],
    correct: 0,
  },
  {
    slug: "td-ironie",
    kind: "term_definition",
    prompt: "Ironie = ?",
    options: [
      "význam opačný než doslovný",
      "zdrobnělina",
      "příměr",
      "opakování hlásek",
    ],
    correct: 0,
  },
  {
    slug: "td-balada",
    kind: "term_definition",
    prompt: "Balada = ?",
    options: [
      "lyricko-epický útvar, často tragický",
      "krátká lyrická báseň o lásce",
      "komedie o omylech",
      "cestopis",
    ],
    correct: 0,
  },
  {
    slug: "td-roman",
    kind: "term_definition",
    prompt: "Román = ?",
    options: [
      "rozsáhlý epický útvar v próze",
      "14veršová lyrická forma",
      "jevištní dialog bez děje",
      "pouhá reportáž",
    ],
    correct: 0,
  },
  {
    slug: "td-drama",
    kind: "term_definition",
    prompt: "Drama = ?",
    options: [
      "dílo určené především k jevišti",
      "vždy jen veselohra",
      "jen deníková próza",
      "jen sonetový cyklus",
    ],
    correct: 0,
  },
  {
    slug: "td-personifikace",
    kind: "term_definition",
    prompt: "Personifikace = ?",
    options: [
      "přisouzení lidských vlastností neživému",
      "záměna jména autora",
      "vynechání podmětu",
      "zdvojení rýmu",
    ],
    correct: 0,
  },
  // ——— true / false ———
  {
    slug: "tf-macha-romantismus",
    kind: "true_false",
    prompt: "Mácha patří k romantismu.",
    options: ["Pravda", "Nepravda"],
    correct: 0,
  },
  {
    slug: "tf-neruda-kytice",
    kind: "true_false",
    prompt: "Neruda napsal Kytici.",
    options: ["Pravda", "Nepravda"],
    correct: 1,
    factHint: "Kytici napsal Erben.",
  },
  {
    slug: "tf-babicka-nemcova",
    kind: "true_false",
    prompt: "Babičku napsala Božena Němcová.",
    options: ["Pravda", "Nepravda"],
    correct: 0,
  },
  {
    slug: "tf-maj-svatba",
    kind: "true_false",
    prompt: "Máj končí veselou svatbou.",
    options: ["Pravda", "Nepravda"],
    correct: 1,
    factHint: "Máj je tragédie, ne happy end.",
  },
  {
    slug: "tf-goriot-balzac",
    kind: "true_false",
    prompt: "Otec Goriot je dílo Balzaca.",
    options: ["Pravda", "Nepravda"],
    correct: 0,
  },
  {
    slug: "tf-raskolnikov-goriot",
    kind: "true_false",
    prompt: "Raskolnikov je postava Otce Goriota.",
    options: ["Pravda", "Nepravda"],
    correct: 1,
    factHint: "Raskolnikov = Zločin a trest.",
  },
  {
    slug: "tf-obrozeni-19",
    kind: "true_false",
    prompt: "Národní obrození spadá kolem přelomu 18./19. stol.",
    options: ["Pravda", "Nepravda"],
    correct: 0,
  },
  {
    slug: "tf-protektorat-1620",
    kind: "true_false",
    prompt: "Protektorát začal roku 1620.",
    options: ["Pravda", "Nepravda"],
    correct: 1,
    factHint: "Protektorát = 1939–1945.",
  },
  {
    slug: "tf-marysa-mrstikove",
    kind: "true_false",
    prompt: "Maryša je drama bratrů Mrštíků.",
    options: ["Pravda", "Nepravda"],
    correct: 0,
  },
  {
    slug: "tf-realismus-detail",
    kind: "true_false",
    prompt: "Realismus často používá detailní popis prostředí.",
    options: ["Pravda", "Nepravda"],
    correct: 0,
  },
  // ——— movement → trait ———
  {
    slug: "mt-romantismus",
    kind: "movement_trait",
    prompt: "Romantismus → ?",
    options: [
      "subjektivita a cit",
      "determinismus prostředí",
      "jen suchá statistika",
      "odmítnutí přírody",
    ],
    correct: 0,
  },
  {
    slug: "mt-realismus",
    kind: "movement_trait",
    prompt: "Realismus → ?",
    options: [
      "typizace všedního života",
      "jen snové vize bez společnosti",
      "výhradně sonety",
      "odmítnutí postav",
    ],
    correct: 0,
  },
  {
    slug: "mt-naturalismus",
    kind: "movement_trait",
    prompt: "Naturalismus → ?",
    options: [
      "determinismus prostředí",
      "jen dvorská galantnost",
      "odmítnutí detailu",
      "výhradně pohádky",
    ],
    correct: 0,
  },
  {
    slug: "mt-symbolismus",
    kind: "movement_trait",
    prompt: "Symbolismus → ?",
    options: [
      "náznak a symbol",
      "jen policejní zpráva",
      "odmítnutí verše",
      "výhradně komedie dell’arte",
    ],
    correct: 0,
  },
  {
    slug: "mt-romantismus-ne",
    kind: "movement_trait",
    prompt: "Co NENÍ typické pro romantismus?",
    options: [
      "dokumentární naturalismus Zoly",
      "důraz na cit",
      "kontrast ideálu a reality",
      "subjektivní pohled",
    ],
    correct: 0,
  },
  {
    slug: "mt-realismus-autori",
    kind: "movement_trait",
    prompt: "Realismus — typický autor?",
    options: ["Balzac / Neruda", "Mácha", "Homér", "Mallarmé jen"],
    correct: 0,
  },
  {
    slug: "mt-romantismus-autor",
    kind: "movement_trait",
    prompt: "Romantismus — typický český autor?",
    options: ["K. H. Mácha", "Balzac", "Zola", "Dostojevskij jen"],
    correct: 0,
  },
  {
    slug: "mt-naturalismus-ne",
    kind: "movement_trait",
    prompt: "Naturalismus NENÍ hlavně o…",
    options: [
      "idyllickém venkovu bez konfliktů",
      "vlivu prostředí",
      "dědičnosti",
      "tvrdším sociálním řezu",
    ],
    correct: 0,
  },
];

function buildQuestion(draft: QDraft): SpeedQuestion {
  const options = draft.options.map((label) => ({
    id: randomUUID(),
    label,
  }));
  return {
    id: randomUUID(),
    slug: draft.slug,
    kind: draft.kind,
    prompt: draft.prompt,
    options,
    correctOptionId: options[draft.correct]!.id,
    factHint: draft.factHint,
  };
}

export function buildCjlSpeedPack(
  nowIso = new Date().toISOString(),
): SpeedRoundPack {
  const questions = QUESTIONS.map(buildQuestion);
  return parseSpeedRoundPack({
    id: randomUUID(),
    slug: "cjl-speed",
    title: "Speed Round — 60 sekund",
    summary:
      "Rychlé fakta: autor→dílo, pojem→definice, true/false, směr→vlastnost. 60 s. Žádná hluboká interpretace.",
    durationMs: SPEED_ROUND_DURATION_MS,
    questions,
    createdAt: nowIso,
    updatedAt: nowIso,
  });
}
