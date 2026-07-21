import { randomUUID } from "node:crypto";
import {
  parseSpacedReviewPack,
  type FormatPayload,
  type ReviewKnowledge,
  type SpacedReviewPack,
} from "@/domain/learning/spaced-repetition";

type KnowledgeDraft = {
  slug: string;
  title: string;
  tags?: string[];
  clusterId?: string;
  entityKey?: string;
  formats: FormatPayload[];
};

const KNOWLEDGE: KnowledgeDraft[] = [
  {
    slug: "macha-maj",
    title: "Mácha → Máj",
    clusterId: "czech-romantic-works",
    entityKey: "maj",
    tags: ["dilo"],
    formats: [
      {
        format: "flashcard",
        front: "K. H. Mácha — stěžejní skladba?",
        back: "Máj",
      },
      {
        format: "question",
        stem: "Autor Máje je…",
        options: [
          "Karel Hynek Mácha",
          "Jan Neruda",
          "K. J. Erben",
          "Božena Němcová",
        ],
        correctIndex: 0,
      },
      {
        format: "free_recall",
        prompt: "Kdo napsal Máj?",
        modelAnswer: "Karel Hynek Mácha",
        keywords: ["mácha", "macha"],
      },
      {
        format: "matching",
        left: "K. H. Mácha",
        right: "Máj",
        distractors: ["Kytice", "Babička", "Maryša"],
      },
    ],
  },
  {
    slug: "erben-kytice",
    title: "Erben → Kytice",
    clusterId: "czech-romantic-works",
    entityKey: "kytice",
    tags: ["dilo"],
    formats: [
      {
        format: "flashcard",
        front: "K. J. Erben — sbírka balad?",
        back: "Kytice",
      },
      {
        format: "matching",
        left: "K. J. Erben",
        right: "Kytice",
        distractors: ["Máj", "Otec Goriot", "Maryša"],
      },
      {
        format: "question",
        stem: "Kytice je dílo…",
        options: ["K. J. Erbena", "Nerudy", "Máchy", "Balzaca"],
        correctIndex: 0,
      },
    ],
  },
  {
    slug: "distinguish-maj-kytice",
    title: "Rozliš: Máj vs Kytice",
    clusterId: "czech-romantic-works",
    entityKey: "distinguish",
    tags: ["distinguish"],
    formats: [
      {
        format: "question",
        stem: "Baladickou sbírku Kytice napsal…",
        options: [
          "K. J. Erben",
          "K. H. Mácha",
          "Honoré de Balzac",
          "Charles Dickens",
        ],
        correctIndex: 0,
      },
      {
        format: "matching",
        left: "Máj",
        right: "K. H. Mácha",
        distractors: ["K. J. Erben", "Balzac", "Dickens"],
      },
      {
        format: "free_recall",
        prompt: "Kdo napsal Máj a kdo Kytici? (dva autoři)",
        modelAnswer: "Mácha — Máj; Erben — Kytice",
        keywords: ["mácha", "erben", "máj", "kytice"],
      },
    ],
  },
  {
    slug: "romantismus",
    title: "Romantismus — znak",
    clusterId: "movements",
    entityKey: "romantismus",
    tags: ["smer"],
    formats: [
      {
        format: "flashcard",
        front: "Romantismus → typický znak?",
        back: "Subjektivita a cit",
      },
      {
        format: "matching",
        left: "romantismus",
        right: "subjektivita a cit",
        distractors: [
          "determinismus prostředí",
          "jen suchá statistika",
          "odmítnutí přírody",
        ],
      },
      {
        format: "question",
        stem: "Pro romantismus je typické…",
        options: [
          "subjektivita a cit",
          "naturalistický determinismus",
          "jen reportáž",
          "odmítnutí ideálu",
        ],
        correctIndex: 0,
      },
      {
        format: "free_recall",
        prompt: "Uveď jeden typický znak romantismu.",
        modelAnswer: "Subjektivita, cit, kontrast ideálu a reality",
        keywords: ["cit", "subjekt", "romant"],
      },
    ],
  },
  {
    slug: "realismus",
    title: "Realismus — znak",
    clusterId: "movements",
    entityKey: "realismus",
    tags: ["smer"],
    formats: [
      {
        format: "flashcard",
        front: "Realismus → typický znak?",
        back: "Typizace všedního života",
      },
      {
        format: "question",
        stem: "Realismus typicky…",
        options: [
          "typizuje všední život",
          "odmítá detail prostředí",
          "je totéž co romantismus",
          "píše jen sonety",
        ],
        correctIndex: 0,
      },
      {
        format: "matching",
        left: "realismus",
        right: "typizace všedního života",
        distractors: ["náznak a symbol", "jen snové vize", "dvorská galantnost"],
      },
    ],
  },
  {
    slug: "distinguish-romantismus-realismus",
    title: "Rozliš: romantismus vs realismus",
    clusterId: "movements",
    entityKey: "distinguish",
    tags: ["distinguish", "smer"],
    formats: [
      {
        format: "question",
        stem: "Subjektivita a cit patří spíš k…",
        options: ["romantismu", "realismu", "naturalismu", "impresionismu"],
        correctIndex: 0,
      },
      {
        format: "matching",
        left: "typizace všedního života",
        right: "realismus",
        distractors: ["romantismus", "symbolismus", "baroko"],
      },
      {
        format: "free_recall",
        prompt: "Jednou větou: čím se liší romantismus od realismu?",
        modelAnswer:
          "Romantismus: subjektivita a cit; realismus: typizace všedního života",
        keywords: ["romant", "realis", "cit", "všední"],
      },
    ],
  },
  {
    slug: "neruda-malostranske",
    title: "Neruda → Povídky malostranské",
    clusterId: "czech-realist-works",
    entityKey: "neruda",
    tags: ["autor", "dilo"],
    formats: [
      {
        format: "flashcard",
        front: "Jan Neruda — hlavní povídkový cyklus?",
        back: "Povídky malostranské",
      },
      {
        format: "question",
        stem: "Které dílo napsal Jan Neruda?",
        options: [
          "Povídky malostranské",
          "Kytice",
          "Máj",
          "Babička",
        ],
        correctIndex: 0,
      },
      {
        format: "matching",
        left: "Jan Neruda",
        right: "Povídky malostranské",
        distractors: ["Kytice", "Máj", "Tyrolské elegie"],
      },
      {
        format: "free_recall",
        prompt: "Napiš hlavní povídkový cyklus Jana Nerudy.",
        modelAnswer: "Povídky malostranské",
        keywords: ["malostranské", "neruda"],
      },
    ],
  },
  {
    slug: "babicka-nemcova",
    title: "Němcová → Babička",
    clusterId: "czech-realist-works",
    entityKey: "nemcova",
    formats: [
      {
        format: "flashcard",
        front: "Autorka Babičky?",
        back: "Božena Němcová",
      },
      {
        format: "free_recall",
        prompt: "Kdo napsal Babičku?",
        modelAnswer: "Božena Němcová",
        keywords: ["němcová", "nemcova"],
      },
      {
        format: "question",
        stem: "Babičku napsala…",
        options: [
          "Božena Němcová",
          "Gabriela Preissová",
          "K. J. Erben",
          "Marie Majerová",
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    slug: "marysa",
    title: "Maryša — autoři",
    clusterId: "czech-realist-works",
    entityKey: "marysa",
    formats: [
      {
        format: "flashcard",
        front: "Autoři dramatu Maryša?",
        back: "Alois a Vilém Mrštíkové",
      },
      {
        format: "question",
        stem: "Maryša je drama…",
        options: [
          "bratrů Mrštíků",
          "K. H. Máchy",
          "Jana Nerudy",
          "Balzaca",
        ],
        correctIndex: 0,
      },
      {
        format: "free_recall",
        prompt: "Kdo napsal Maryšu?",
        modelAnswer: "Bratři Mrštíkové",
        keywords: ["mrštík", "mrstik"],
      },
    ],
  },
  {
    slug: "havlicek-elegie",
    title: "Havlíček → Tyrolské elegie",
    clusterId: "czech-realist-works",
    entityKey: "havlicek",
    formats: [
      {
        format: "flashcard",
        front: "Havlíček Borovský — satira z Brixenu?",
        back: "Tyrolské elegie",
      },
      {
        format: "question",
        stem: "Tyrolské elegie napsal…",
        options: [
          "Karel Havlíček Borovský",
          "K. H. Mácha",
          "Jan Neruda",
          "Erben",
        ],
        correctIndex: 0,
      },
      {
        format: "matching",
        left: "K. Havlíček Borovský",
        right: "Tyrolské elegie",
        distractors: ["Máj", "Kytice", "Babička"],
      },
    ],
  },
  {
    slug: "goriot",
    title: "Otec Goriot — autor",
    clusterId: "realist-authors",
    entityKey: "balzac",
    tags: ["autor"],
    formats: [
      {
        format: "flashcard",
        front: "Autor Otce Goriota?",
        back: "Honoré de Balzac",
      },
      {
        format: "question",
        stem: "Otec Goriot je dílo…",
        options: ["Balzaca", "Dickense", "Dostojevského", "Máchy"],
        correctIndex: 0,
      },
      {
        format: "free_recall",
        prompt: "Kdo napsal Otec Goriot?",
        modelAnswer: "Honoré de Balzac",
        keywords: ["balzac"],
      },
    ],
  },
  {
    slug: "dickens-oliver",
    title: "Dickens → Oliver Twist",
    clusterId: "realist-authors",
    entityKey: "dickens",
    tags: ["autor"],
    formats: [
      {
        format: "flashcard",
        front: "Charles Dickens — román o sirotkovi Oliverovi?",
        back: "Oliver Twist",
      },
      {
        format: "question",
        stem: "Oliver Twist napsal…",
        options: [
          "Charles Dickens",
          "Honoré de Balzac",
          "F. M. Dostojevskij",
          "K. H. Mácha",
        ],
        correctIndex: 0,
      },
      {
        format: "matching",
        left: "Charles Dickens",
        right: "Oliver Twist",
        distractors: ["Otec Goriot", "Zločin a trest", "Máj"],
      },
      {
        format: "free_recall",
        prompt: "Kdo napsal Olivera Twista?",
        modelAnswer: "Charles Dickens",
        keywords: ["dickens"],
      },
    ],
  },
  {
    slug: "raskolnikov",
    title: "Raskolnikov — dílo",
    clusterId: "realist-authors",
    entityKey: "dostojevskij",
    tags: ["autor"],
    formats: [
      {
        format: "flashcard",
        front: "Raskolnikov patří do díla…",
        back: "Zločin a trest (Dostojevskij)",
      },
      {
        format: "matching",
        left: "Raskolnikov",
        right: "Zločin a trest",
        distractors: ["Otec Goriot", "Oliver Twist", "Máj"],
      },
      {
        format: "question",
        stem: "Raskolnikov je postava…",
        options: [
          "Zločinu a trestu",
          "Otce Goriota",
          "Olivera Twista",
          "Máje",
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    slug: "distinguish-realist-authors",
    title: "Rozliš: Balzac · Dickens · Dostojevskij",
    clusterId: "realist-authors",
    entityKey: "distinguish",
    tags: ["distinguish"],
    formats: [
      {
        format: "question",
        stem: "Který autor napsal Otec Goriot?",
        options: [
          "Honoré de Balzac",
          "Charles Dickens",
          "F. M. Dostojevskij",
          "K. J. Erben",
        ],
        correctIndex: 0,
      },
      {
        format: "matching",
        left: "Zločin a trest",
        right: "Dostojevskij",
        distractors: ["Balzac", "Dickens", "Mácha"],
      },
      {
        format: "question",
        stem: "Oliver Twist patří k…",
        options: ["Dickensovi", "Balzacovi", "Dostojevskému", "Erbenovi"],
        correctIndex: 0,
      },
      {
        format: "free_recall",
        prompt:
          "Přiřaď: Goriot / Oliver Twist / Raskolnikov → Balzac, Dickens, Dostojevskij",
        modelAnswer: "Goriot–Balzac; Twist–Dickens; Raskolnikov–Dostojevskij",
        keywords: ["balzac", "dickens", "dostojev"],
      },
    ],
  },
  {
    slug: "metafora",
    title: "Metafora",
    clusterId: "poetics",
    entityKey: "metafora",
    tags: ["pojem"],
    formats: [
      {
        format: "flashcard",
        front: "Metafora = ?",
        back: "Přenesené pojmenování na základě podobnosti",
      },
      {
        format: "free_recall",
        prompt: "Definuj metaforu jednou větou.",
        modelAnswer: "Přenesené pojmenování podle podobnosti",
        keywords: ["přenesen", "podobnost", "metafora"],
      },
      {
        format: "question",
        stem: "Metafora je…",
        options: [
          "přenesené pojmenování podle podobnosti",
          "záměna části a celku",
          "básnický přívlastek",
          "opakování slov",
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    slug: "epiteton",
    title: "Epiteton",
    clusterId: "poetics",
    entityKey: "epiteton",
    formats: [
      {
        format: "flashcard",
        front: "Epiteton = ?",
        back: "Básnický přívlastek",
      },
      {
        format: "question",
        stem: "Epiteton je…",
        options: [
          "básnický přívlastek",
          "záměna části a celku",
          "řečnická otázka",
          "přirovnání se ‚jako‘",
        ],
        correctIndex: 0,
      },
      {
        format: "matching",
        left: "epiteton",
        right: "básnický přívlastek",
        distractors: [
          "přenesené pojmenování podle podobnosti",
          "záměna části a celku",
          "opakování slov",
        ],
      },
    ],
  },
  {
    slug: "synekdocha",
    title: "Synekdocha",
    clusterId: "poetics",
    entityKey: "synekdocha",
    formats: [
      {
        format: "flashcard",
        front: "Synekdocha = ?",
        back: "Záměna části a celku",
      },
      {
        format: "free_recall",
        prompt: "Co je synekdocha?",
        modelAnswer: "Záměna části a celku (nebo naopak)",
        keywords: ["část", "celek", "synekdoch"],
      },
      {
        format: "question",
        stem: "Synekdocha znamená…",
        options: [
          "záměnu části a celku",
          "přenos podle podobnosti",
          "zdrobnělinu",
          "ironii",
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    slug: "symbolismus",
    title: "Symbolismus — znak",
    clusterId: "movements",
    entityKey: "symbolismus",
    formats: [
      {
        format: "flashcard",
        front: "Symbolismus → ?",
        back: "Náznak a symbol",
      },
      {
        format: "matching",
        left: "symbolismus",
        right: "náznak a symbol",
        distractors: [
          "typizace všedního života",
          "determinismus prostředí",
          "subjektivita a cit",
        ],
      },
      {
        format: "question",
        stem: "Symbolismus pracuje hlavně s…",
        options: [
          "náznakem a symbolem",
          "jen policejní zprávou",
          "odmítáním verše",
          "výhradně komedií",
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    slug: "obrozeni",
    title: "Národní obrození — období",
    clusterId: "poetics",
    entityKey: "obrozeni",
    formats: [
      {
        format: "flashcard",
        front: "Národní obrození — zhruba kdy?",
        back: "Konec 18. – 1. polovina 19. století",
      },
      {
        format: "question",
        stem: "Národní obrození spadá především…",
        options: [
          "na přelom 18./19. století",
          "do roku 1948",
          "do protektorátu 1939–45",
          "do baroka po Bílé hoře výhradně",
        ],
        correctIndex: 0,
      },
      {
        format: "matching",
        left: "národní obrození",
        right: "konec 18. – 1. pol. 19. stol.",
        distractors: ["1939–1945", "1918 jen", "1620 jen"],
      },
    ],
  },
  {
    slug: "balada",
    title: "Balada — žánr",
    clusterId: "poetics",
    entityKey: "balada",
    formats: [
      {
        format: "flashcard",
        front: "Balada = ?",
        back: "Lyricko-epický útvar, často s tragickým koncem",
      },
      {
        format: "free_recall",
        prompt: "Co je balada (žánr)?",
        modelAnswer: "Lyricko-epický útvar s často tragickým koncem",
        keywords: ["balad", "tragick", "lyricko"],
      },
      {
        format: "question",
        stem: "Balada je…",
        options: [
          "lyricko-epický útvar, často tragický",
          "rozsáhlý společenský román o 2500 postavách",
          "jen veselohra",
          "sonetový cyklus výhradně",
        ],
        correctIndex: 0,
      },
    ],
  },
];

function buildKnowledge(draft: KnowledgeDraft): ReviewKnowledge {
  return {
    id: randomUUID(),
    slug: draft.slug,
    title: draft.title,
    tags: draft.tags ?? [],
    clusterId: draft.clusterId,
    entityKey: draft.entityKey,
    formats: draft.formats,
  };
}

export function buildCjlSpacedPack(
  nowIso = new Date().toISOString(),
): SpacedReviewPack {
  return parseSpacedReviewPack({
    id: randomUUID(),
    slug: "cjl-spaced",
    title: "Spaced review — ČJL základy",
    summary:
      "Opakování řadí nejdřív to, na čem začínáš zapomínat. Formáty: kartičky, vybavování, přiřazení, otázky.",
    knowledge: KNOWLEDGE.map(buildKnowledge),
    createdAt: nowIso,
    updatedAt: nowIso,
  });
}
